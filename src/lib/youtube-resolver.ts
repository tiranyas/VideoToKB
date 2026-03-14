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

// ── Browser-like Headers ─────────────────────────────────

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ── InnerTube API approach ───────────────────────────────
// Uses YouTube's internal InnerTube API to fetch transcript data.
// More reliable than page scraping since it doesn't depend on HTML structure.

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'; // Public YouTube web client key
const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB',
    clientVersion: '2.20241126.01.00',
    hl: 'en',
    gl: 'US',
  },
};

/**
 * Fetch the video page to extract serialized player data containing caption track URLs.
 */
async function getCaptionTracksFromPage(
  videoId: string
): Promise<{ baseUrl: string; languageCode: string; name: string }[]> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(watchUrl, { headers: BROWSER_HEADERS });

  if (!res.ok) {
    throw new Error(`YouTube returned ${res.status} for video page`);
  }

  const html = await res.text();

  // Extract ytInitialPlayerResponse from page source
  const playerMatch = html.match(
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});(?:\s*var\s|<\/script>)/
  );
  if (!playerMatch) {
    throw new Error('Could not find player data in YouTube page');
  }

  let playerData: Record<string, unknown>;
  try {
    playerData = JSON.parse(playerMatch[1]);
  } catch {
    throw new Error('Could not parse YouTube player data');
  }

  // Navigate to captions.playerCaptionsTracklistRenderer.captionTracks
  const captions = playerData?.captions as Record<string, unknown> | undefined;
  const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
  const tracks = renderer?.captionTracks as Array<{
    baseUrl: string;
    languageCode: string;
    name: { simpleText?: string };
    kind?: string;
  }> | undefined;

  if (!tracks || tracks.length === 0) {
    throw new Error('This video has no captions available');
  }

  return tracks.map((t) => ({
    baseUrl: t.baseUrl,
    languageCode: t.languageCode,
    name: t.name?.simpleText || t.languageCode,
  }));
}

/**
 * Fetch caption XML from a track URL and parse into segments.
 */
async function fetchCaptionXml(
  trackUrl: string
): Promise<{ text: string; start: number; dur: number }[]> {
  // Request JSON3 format instead of XML for easier parsing
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');

  const res = await fetch(url.toString(), { headers: BROWSER_HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch captions: ${res.status}`);
  }

  const data = await res.json() as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8: string }>;
    }>;
  };

  if (!data.events) {
    throw new Error('No caption events in response');
  }

  const segments: { text: string; start: number; dur: number }[] = [];

  for (const event of data.events) {
    if (!event.segs) continue;
    const text = event.segs
      .map((s) => s.utf8)
      .join('')
      .replace(/\n/g, ' ')
      .trim();
    if (!text || text === '\n') continue;

    segments.push({
      text,
      start: (event.tStartMs ?? 0) / 1000,
      dur: (event.dDurationMs ?? 0) / 1000,
    });
  }

  return segments;
}

/**
 * Try InnerTube API to get transcript (fallback method).
 */
async function getTranscriptViaInnerTube(
  videoId: string
): Promise<{ text: string; start: number; dur: number }[]> {
  // First, get the transcript renderer params
  const engagementUrl = `${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`;

  const engagementRes = await fetch(engagementUrl, {
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

  if (!engagementRes.ok) {
    throw new Error(`InnerTube next API returned ${engagementRes.status}`);
  }

  const nextData = await engagementRes.json();

  // Find the transcript panel
  const panels =
    nextData?.engagementPanels as Array<Record<string, unknown>> | undefined;
  if (!panels) throw new Error('No engagement panels');

  let serializedParams: string | null = null;

  for (const panel of panels) {
    const epir = panel?.engagementPanelSectionListRenderer as Record<string, unknown> | undefined;
    const panelId = epir?.panelIdentifier;
    if (panelId === 'engagement-panel-searchable-transcript') {
      const content = epir?.content as Record<string, unknown>;
      const ctr = content?.continuationItemRenderer as Record<string, unknown>;
      const ce = ctr?.continuationEndpoint as Record<string, unknown>;
      const cc = ce?.getTranscriptEndpoint as Record<string, unknown>;
      serializedParams = (cc?.params as string) || null;
      break;
    }
  }

  if (!serializedParams) {
    throw new Error('No transcript available via InnerTube');
  }

  // Fetch transcript
  const transcriptUrl = `${INNERTUBE_BASE}/get_transcript?key=${INNERTUBE_API_KEY}`;
  const transcriptRes = await fetch(transcriptUrl, {
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

  if (!transcriptRes.ok) {
    throw new Error(`InnerTube transcript API returned ${transcriptRes.status}`);
  }

  const transcriptData = await transcriptRes.json();

  // Parse transcript segments
  const body =
    transcriptData?.actions?.[0]?.updateEngagementPanelAction?.content
      ?.transcriptRenderer?.body?.transcriptBodyRenderer;
  const cueGroups = body?.cueGroups as Array<Record<string, unknown>> | undefined;

  if (!cueGroups || cueGroups.length === 0) {
    throw new Error('No transcript segments found');
  }

  const segments: { text: string; start: number; dur: number }[] = [];

  for (const group of cueGroups) {
    const cues = (group?.transcriptCueGroupRenderer as Record<string, unknown>)
      ?.cues as Array<Record<string, unknown>> | undefined;
    if (!cues) continue;

    for (const cue of cues) {
      const renderer = cue?.transcriptCueRenderer as Record<string, unknown>;
      if (!renderer) continue;

      const text = ((renderer.cue as Record<string, unknown>)?.simpleText as string || '').trim();
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

/**
 * Extract transcript from YouTube video captions.
 * Strategy:
 * 1. Fetch video page → extract caption track URLs → fetch caption data
 * 2. Fallback: InnerTube API for transcript
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

  // Method 1: Page scrape → caption track URL → JSON3
  try {
    const tracks = await getCaptionTracksFromPage(videoId);
    // Pick the best track: prefer original language, then any available
    const track = tracks[0]; // YouTube lists the primary language first
    rawSegments = await fetchCaptionXml(track.baseUrl);
  } catch (err) {
    errors.push(`Page method: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Method 2: InnerTube API
  if (rawSegments.length === 0) {
    try {
      rawSegments = await getTranscriptViaInnerTube(videoId);
    } catch (err) {
      errors.push(`InnerTube method: ${err instanceof Error ? err.message : String(err)}`);
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

  // Fetch video title from oEmbed API (reliable, no auth needed)
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
    // Title is non-critical
  }

  // Convert to segments with start/end in ms
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
