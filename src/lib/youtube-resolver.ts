// ── URL Patterns ─────────────────────────────────────────
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

interface CaptionTrack {
  baseUrl: string;
  languageCode: string;
  name: string;
}

interface RawSegment {
  text: string;
  start: number;
  dur: number;
}

// ── Client Configurations ────────────────────────────────
// YouTube treats different "clients" differently.
// Server IPs get LOGIN_REQUIRED with WEB client but often work with
// ANDROID, IOS, or TV_EMBEDDED clients.

const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

const CONSENT_COOKIES =
  'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMzA4MjkuMDdfcDAQAhgCGgJlbg; CONSENT=PENDING+999';

// Different client contexts to try — each has different restrictions
const CLIENT_CONFIGS: Array<{
  name: string;
  context: Record<string, unknown>;
  headers: Record<string, string>;
}> = [
  {
    name: 'TV_EMBEDDED',
    context: {
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
        hl: 'en',
        gl: 'US',
      },
      thirdParty: {
        embedUrl: 'https://www.google.com',
      },
    },
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Content-Type': 'application/json',
      Cookie: CONSENT_COOKIES,
    },
  },
  {
    name: 'ANDROID',
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '19.09.37',
        androidSdkVersion: 30,
        hl: 'en',
        gl: 'US',
      },
    },
    headers: {
      'User-Agent':
        'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip',
      'Content-Type': 'application/json',
      Cookie: CONSENT_COOKIES,
    },
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.09.3',
        deviceModel: 'iPhone14,3',
        hl: 'en',
        gl: 'US',
      },
    },
    headers: {
      'User-Agent':
        'com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)',
      'Content-Type': 'application/json',
      Cookie: CONSENT_COOKIES,
    },
  },
  {
    name: 'WEB',
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20241126.01.00',
        hl: 'en',
        gl: 'US',
      },
    },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      Cookie: CONSENT_COOKIES,
    },
  },
];

// ── InnerTube /player API ────────────────────────────────
// Try each client config until one returns caption tracks.

async function getCaptionTracksMultiClient(
  videoId: string
): Promise<{ tracks: CaptionTrack[]; clientUsed: string }> {
  const errors: string[] = [];

  for (const config of CLIENT_CONFIGS) {
    try {
      const playerUrl = `${INNERTUBE_BASE}/player?key=${INNERTUBE_API_KEY}`;
      const res = await fetch(playerUrl, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({
          context: config.context,
          videoId,
        }),
      });

      if (!res.ok) {
        errors.push(`${config.name}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();

      // Check playability
      const playability = data?.playabilityStatus as Record<string, unknown> | undefined;
      const status = playability?.status as string | undefined;
      if (status === 'LOGIN_REQUIRED' || status === 'UNPLAYABLE') {
        errors.push(`${config.name}: ${status}`);
        continue;
      }

      // Extract caption tracks
      const captions = data?.captions as Record<string, unknown> | undefined;
      const renderer = captions?.playerCaptionsTracklistRenderer as Record<string, unknown> | undefined;
      const tracks = renderer?.captionTracks as Array<{
        baseUrl: string;
        languageCode: string;
        name: { simpleText?: string; runs?: Array<{ text: string }> };
      }> | undefined;

      if (!tracks || tracks.length === 0) {
        errors.push(`${config.name}: no caption tracks`);
        continue;
      }

      return {
        tracks: tracks.map((t) => ({
          baseUrl: t.baseUrl,
          languageCode: t.languageCode,
          name: t.name?.simpleText || t.name?.runs?.map(r => r.text).join('') || t.languageCode,
        })),
        clientUsed: config.name,
      };
    } catch (err) {
      errors.push(`${config.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All clients failed: ${errors.join('; ')}`);
}

// ── Fetch caption data from track URL ────────────────────

async function fetchCaptionData(trackUrl: string): Promise<RawSegment[]> {
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Cookie: CONSENT_COOKIES,
    },
  });

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

  const segments: RawSegment[] = [];

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

// ── InnerTube transcript panel (last resort) ─────────────

async function getTranscriptPanel(videoId: string): Promise<RawSegment[]> {
  // Use WEB client for /next since it has the transcript panel
  const webConfig = CLIENT_CONFIGS[CLIENT_CONFIGS.length - 1];

  const nextRes = await fetch(`${INNERTUBE_BASE}/next?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: webConfig.headers,
    body: JSON.stringify({
      context: webConfig.context,
      videoId,
    }),
  });

  if (!nextRes.ok) {
    throw new Error(`next API returned ${nextRes.status}`);
  }

  const nextData = await nextRes.json();
  const panels = nextData?.engagementPanels as Array<Record<string, unknown>> | undefined;
  if (!panels) throw new Error('No engagement panels');

  let params: string | null = null;
  for (const panel of panels) {
    const epir = panel?.engagementPanelSectionListRenderer as Record<string, unknown> | undefined;
    if (epir?.panelIdentifier === 'engagement-panel-searchable-transcript') {
      const content = epir?.content as Record<string, unknown>;
      const ctr = content?.continuationItemRenderer as Record<string, unknown>;
      const ce = ctr?.continuationEndpoint as Record<string, unknown>;
      const cc = ce?.getTranscriptEndpoint as Record<string, unknown>;
      params = (cc?.params as string) || null;
      break;
    }
  }

  if (!params) throw new Error('No transcript panel');

  const tRes = await fetch(`${INNERTUBE_BASE}/get_transcript?key=${INNERTUBE_API_KEY}`, {
    method: 'POST',
    headers: webConfig.headers,
    body: JSON.stringify({
      context: webConfig.context,
      params,
    }),
  });

  if (!tRes.ok) throw new Error(`get_transcript returned ${tRes.status}`);

  const tData = await tRes.json();
  const body = tData?.actions?.[0]?.updateEngagementPanelAction?.content
    ?.transcriptRenderer?.body?.transcriptBodyRenderer;
  const cueGroups = body?.cueGroups as Array<Record<string, unknown>> | undefined;

  if (!cueGroups?.length) throw new Error('No cue groups');

  const segments: RawSegment[] = [];
  for (const group of cueGroups) {
    const cues = (group?.transcriptCueGroupRenderer as Record<string, unknown>)
      ?.cues as Array<Record<string, unknown>> | undefined;
    if (!cues) continue;
    for (const cue of cues) {
      const r = cue?.transcriptCueRenderer as Record<string, unknown>;
      if (!r) continue;
      const text = ((r.cue as Record<string, unknown>)?.simpleText as string || '').trim();
      const startMs = parseInt(r.startOffsetMs as string, 10) || 0;
      const durMs = parseInt(r.durationMs as string, 10) || 0;
      if (text) segments.push({ text, start: startMs / 1000, dur: durMs / 1000 });
    }
  }

  return segments;
}

// ── Main Entry Point ─────────────────────────────────────

export async function getYouTubeTranscript(
  url: string
): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/');
  }

  let rawSegments: RawSegment[] = [];
  const errors: string[] = [];

  // Method 1: Try multiple InnerTube client configs to get caption tracks
  try {
    const { tracks } = await getCaptionTracksMultiClient(videoId);
    const track = tracks[0]; // First track is usually the primary language
    rawSegments = await fetchCaptionData(track.baseUrl);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
  }

  // Method 2: InnerTube transcript panel (only WEB client supports this)
  if (rawSegments.length === 0) {
    try {
      rawSegments = await getTranscriptPanel(videoId);
    } catch (err) {
      errors.push(`Transcript panel: ${err instanceof Error ? err.message : String(err)}`);
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

  // Fetch video title via oEmbed (always works, no auth)
  let title = 'YouTube Video';
  try {
    const oRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oRes.ok) {
      const d = await oRes.json();
      title = d.title || title;
    }
  } catch { /* non-critical */ }

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
