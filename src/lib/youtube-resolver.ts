// ── URL Patterns ─────────────────────────────────────────
// Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
const YT_PATTERNS = [
  /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

export function extractYouTubeId(url: string): string | null {
  for (const pattern of YT_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

// ── Types ────────────────────────────────────────────────

export interface YouTubeTranscriptResult {
  transcript: string;
  title: string;
  segments: { text: string; start: number; end: number }[];
}

// ── Browser-like Headers + Consent Cookie ────────────────
// The SOCS cookie bypasses the EU consent screen that blocks caption data.

const CONSENT_COOKIE =
  'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMzA4MjkuMDdfcDAQAhgCGgJlbg';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  Cookie: `${CONSENT_COOKIE}; CONSENT=PENDING+999`,
};

// ── InnerTube constants ──────────────────────────────────

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20241126.01.00',
    hl: 'en',
    gl: 'US',
  },
};

// ── Method 1: Page scrape → caption tracks → timedtext ───

async function getCaptionTracksFromPage(
  videoId: string
): Promise<{ baseUrl: string; languageCode: string; name: string }[]> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=en&gl=US&has_verified=1`;
  const res = await fetch(watchUrl, { headers: BROWSER_HEADERS });

  if (!res.ok) {
    throw new Error(`YouTube returned ${res.status}`);
  }

  const html = await res.text();

  // Try multiple patterns to find player response
  let playerJson: string | null = null;

  // Pattern 1: ytInitialPlayerResponse = {...};
  const p1 = html.match(
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;(?:\s*var\s|\s*<\/script>)/
  );
  if (p1) playerJson = p1[1];

  // Pattern 2: inside ytInitialData or embedded JSON
  if (!playerJson) {
    const p2 = html.match(/"captions":\s*(\{[\s\S]*?"captionTracks"[\s\S]*?\})\s*,\s*"/);
    if (p2) {
      // Extract just the captionTracks from the captions object
      const trackMatch = p2[1].match(/"captionTracks":\s*(\[[\s\S]*?\])/);
      if (trackMatch) {
        try {
          const tracks = JSON.parse(trackMatch[1]);
          return tracks.map((t: { baseUrl: string; languageCode: string; name?: { simpleText?: string } }) => ({
            baseUrl: t.baseUrl,
            languageCode: t.languageCode,
            name: t.name?.simpleText || t.languageCode,
          }));
        } catch {
          // Fall through to full parse
        }
      }
    }
  }

  // Pattern 3: Try to find captionTracks directly in any JSON blob
  if (!playerJson) {
    const p3 = html.match(/"captionTracks":\s*(\[[\s\S]*?\])\s*,/);
    if (p3) {
      try {
        const tracks = JSON.parse(p3[1]);
        return tracks.map((t: { baseUrl: string; languageCode: string; name?: { simpleText?: string } }) => ({
          baseUrl: t.baseUrl,
          languageCode: t.languageCode,
          name: t.name?.simpleText || t.languageCode,
        }));
      } catch {
        throw new Error('Found caption data but could not parse it');
      }
    }
  }

  if (!playerJson) {
    // Check if we got a consent page instead
    if (html.includes('consent.youtube.com') || html.includes('CONSENT')) {
      throw new Error('YouTube returned a consent page — cookie bypass failed');
    }
    throw new Error('Could not find player data in page');
  }

  let playerData: Record<string, unknown>;
  try {
    playerData = JSON.parse(playerJson);
  } catch {
    throw new Error('Could not parse player JSON');
  }

  const captions = playerData?.captions as Record<string, unknown> | undefined;
  const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  const tracks = renderer?.captionTracks as Array<{
    baseUrl: string;
    languageCode: string;
    name: { simpleText?: string };
  }> | undefined;

  if (!tracks || tracks.length === 0) {
    // Check if playability status blocks it
    const playability = playerData?.playabilityStatus as Record<string, unknown> | undefined;
    const status = playability?.status as string | undefined;
    if (status === 'LOGIN_REQUIRED') {
      throw new Error('This video requires login (age-restricted or private)');
    }
    if (status === 'UNPLAYABLE') {
      throw new Error('This video is unavailable or region-locked');
    }
    throw new Error('No captions available on this video');
  }

  return tracks.map((t) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    name: t.name?.simpleText || t.languageCode,
  }));
}

// ── Method 2: InnerTube /player API → caption tracks ─────
// Uses the player endpoint directly instead of scraping HTML

async function getCaptionTracksViaPlayer(
  videoId: string
): Promise<{ baseUrl: string; languageCode: string; name: string }[]> {
  const playerUrl = `${INNERTUBE_BASE}/player?key=${INNERTUBE_API_KEY}`;

  const res = await fetch(playerUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  });

  if (!res.ok) {
    throw new Error(`InnerTube player API returned ${res.status}`);
  }

  const data = await res.json();
  const captions = data?.captions as Record<string, unknown> | undefined;
  const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  const tracks = renderer?.captionTracks as Array<{
    baseUrl: string;
    languageCode: string;
    name: { simpleText?: string };
  }> | undefined;

  if (!tracks || tracks.length === 0) {
    throw new Error('No captions from InnerTube player');
  }

  return tracks.map((t) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    name: t.name?.simpleText || t.languageCode,
  }));
}

// ── Fetch captions from track URL ────────────────────────

async function fetchCaptionData(
  trackUrl: string
): Promise<{ text: string; start: number; dur: number }[]> {
  // Try JSON3 format first (easier to parse)
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');

  const res = await fetch(url.toString(), { headers: BROWSER_HEADERS });
  if (!res.ok) {
    throw new Error(`Caption fetch returned ${res.status}`);
  }

  const data = (await res.json()) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8: string }>;
    }>;
  };

  if (!data.events) {
    throw new Error('No events in caption response');
  }

  const segments: { text: string; start: number; dur: number }[] = [];

  for (const event of data.events) {
    if (!event.segs) continue;
    const text = event.segs
      .map((s) => s.utf8)
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (!text) continue;

    segments.push({
      text,
      start: (event.tStartMs ?? 0) / 1000,
      dur: (event.dDurationMs ?? 0) / 1000,
    });
  }

  return segments;
}

// ── Method 3: InnerTube transcript panel ─────────────────

async function getTranscriptViaInnerTube(
  videoId: string
): Promise<{ text: string; start: number; dur: number }[]> {
  const nextUrl = `${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`;

  const nextRes = await fetch(nextUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      videoId,
    }),
  });

  if (!nextRes.ok) {
    throw new Error(`InnerTube next returned ${nextRes.status}`);
  }

  const nextData = await nextRes.json();

  const panels =
    nextData?.engagementPanels as Array<Record<string, unknown>> | undefined;
  if (!panels) throw new Error('No engagement panels');

  let serializedParams: string | null = null;

  for (const panel of panels) {
    const epir = panel?.engagementPanelSectionListRenderer as Record<string, unknown> | undefined;
    if (epir?.panelIdentifier === 'engagement-panel-searchable-transcript') {
      const content = epir?.content as Record<string, unknown>;
      const ctr = content?.continuationItemRenderer as Record<string, unknown>;
      const ce = ctr?.continuationEndpoint as Record<string, unknown>;
      const cc = ce?.getTranscriptEndpoint as Record<string, unknown>;
      serializedParams = (cc?.params as string) || null;
      break;
    }
  }

  if (!serializedParams) {
    throw new Error('No transcript panel found');
  }

  const transcriptUrl = `${INNERTUBE_BASE}/get_transcript?key=${INNERTUBE_API_KEY}`;
  const tRes = await fetch(transcriptUrl, {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      params: serializedParams,
    }),
  });

  if (!tRes.ok) {
    throw new Error(`Transcript API returned ${tRes.status}`);
  }

  const tData = await tRes.json();

  const body =
    tData?.actions?.[0]?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.body?.transcriptBodyRenderer;
  const cueGroups = body?.cueGroups as Array<Record<string, unknown>> | undefined;

  if (!cueGroups || cueGroups.length === 0) {
    throw new Error('No cue groups in transcript');
  }

  const segments: { text: string; start: number; dur: number }[] = [];

  for (const group of cueGroups) {
    const cues = (group?.transcriptCueGroupRenderer as Record<string, unknown>)
      ?.cues as Array<Record<string, unknown>> | undefined;
    if (!cues) continue;

    for (const cue of cues) {
      const renderer = cue?.transcriptCueRenderer as Record<string, unknown>;
      if (!renderer) continue;

      const text = (
        (renderer.cue as Record<string, unknown>)?.simpleText as string || ''
      ).trim();
      const startMs = parseInt(renderer.startOffsetMs as string, 10) || 0;
      const durMs = parseInt(renderer.durationMs as string, 10) || 0;

      if (text) {
        segments.push({
          text,
          start: startMs / 1000,
          dur: durMs / 1000,
        });
      }
    }
  }

  return segments;
}

// ── Main Entry Point ─────────────────────────────────────

/**
 * Extract transcript from YouTube video captions.
 * Tries 3 methods with fallback:
 * 1. Page scrape → extract caption track URLs → fetch JSON3
 * 2. InnerTube /player API → caption track URLs → fetch JSON3
 * 3. InnerTube /next + /get_transcript API
 */
export async function getYouTubeTranscript(
  url: string
): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error(
      'Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/'
    );
  }

  let rawSegments: { text: string; start: number; dur: number }[] = [];
  const errors: string[] = [];

  // Method 1: Page scrape → caption tracks → JSON3
  try {
    const tracks = await getCaptionTracksFromPage(videoId);
    const track = tracks[0];
    rawSegments = await fetchCaptionData(track.baseUrl);
  } catch (err) {
    errors.push(`Page: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Method 2: InnerTube /player API → caption tracks → JSON3
  if (rawSegments.length === 0) {
    try {
      const tracks = await getCaptionTracksViaPlayer(videoId);
      const track = tracks[0];
      rawSegments = await fetchCaptionData(track.baseUrl);
    } catch (err) {
      errors.push(`Player API: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Method 3: InnerTube transcript panel
  if (rawSegments.length === 0) {
    try {
      rawSegments = await getTranscriptViaInnerTube(videoId);
    } catch (err) {
      errors.push(`Transcript API: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (rawSegments.length === 0) {
    throw new Error(
      'Could not extract captions from this YouTube video. ' +
        'The video may not have captions, or YouTube may be blocking server requests. ' +
        'Try pasting the transcript manually instead. ' +
        `(Details: ${errors.join('; ')})`
    );
  }

  // Fetch video title
  let title = 'YouTube Video';
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: BROWSER_HEADERS }
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      title = data.title || title;
    }
  } catch {
    // Non-critical
  }

  // Convert to ms segments
  const segments = rawSegments.map((seg) => {
    const startMs = Math.round(seg.start * 1000);
    const durMs = Math.round(seg.dur * 1000);
    return {
      text: seg.text.replace(/\n/g, ' ').trim(),
      start: startMs,
      end: startMs + durMs,
    };
  });

  const transcript = segments
    .filter((s) => s.text.length > 0)
    .map((s) => s.text)
    .join(' ');

  return { transcript, title, segments };
}
