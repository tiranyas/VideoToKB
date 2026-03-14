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

// ── Constants ────────────────────────────────────────────

const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const CONSENT_COOKIES =
  'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMzA4MjkuMDdfcDAQAhgCGgJlbg; CONSENT=PENDING+999';

// Client configs — TV_EMBEDDED is the least restricted
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
      thirdParty: { embedUrl: 'https://www.google.com' },
    },
    headers: {
      'User-Agent': 'Mozilla/5.0',
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

// ── Caption Extraction ───────────────────────────────────

async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  const errors: string[] = [];

  for (const config of CLIENT_CONFIGS) {
    try {
      const res = await fetch(`${INNERTUBE_BASE}/player?key=${INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({ context: config.context, videoId }),
      });

      if (!res.ok) {
        errors.push(`${config.name}: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const status = (data?.playabilityStatus as Record<string, unknown>)?.status as string | undefined;
      if (status === 'LOGIN_REQUIRED' || status === 'UNPLAYABLE') {
        errors.push(`${config.name}: ${status}`);
        continue;
      }

      const tracks = (
        (data?.captions as Record<string, unknown>)
          ?.playerCaptionsTracklistRenderer as Record<string, unknown>
      )?.captionTracks as Array<{
        baseUrl: string;
        languageCode: string;
        name: { simpleText?: string; runs?: Array<{ text: string }> };
      }> | undefined;

      if (tracks?.length) {
        return tracks.map((t) => ({
          baseUrl: t.baseUrl,
          languageCode: t.languageCode,
          name: t.name?.simpleText || t.name?.runs?.map(r => r.text).join('') || t.languageCode,
        }));
      }
      errors.push(`${config.name}: no caption tracks`);
    } catch (err) {
      errors.push(`${config.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(errors.join('; '));
}

async function fetchCaptionData(trackUrl: string): Promise<RawSegment[]> {
  const url = new URL(trackUrl);
  url.searchParams.set('fmt', 'json3');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: CONSENT_COOKIES },
  });
  if (!res.ok) throw new Error(`Caption fetch returned ${res.status}`);

  const data = (await res.json()) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8: string }>;
    }>;
  };
  if (!data.events) throw new Error('No events in caption response');

  const segments: RawSegment[] = [];
  for (const event of data.events) {
    if (!event.segs) continue;
    const text = event.segs.map((s) => s.utf8).join('').replace(/\n/g, ' ').trim();
    if (text) {
      segments.push({
        text,
        start: (event.tStartMs ?? 0) / 1000,
        dur: (event.dDurationMs ?? 0) / 1000,
      });
    }
  }
  return segments;
}

// ── Main Entry Point ─────────────────────────────────────

/**
 * Custom error class for YouTube extraction failures.
 * Contains `isServerBlocked` flag to help UI decide whether to show
 * the manual transcript fallback instructions.
 */
export class YouTubeExtractionError extends Error {
  isServerBlocked: boolean;
  constructor(message: string, isServerBlocked: boolean) {
    super(message);
    this.name = 'YouTubeExtractionError';
    this.isServerBlocked = isServerBlocked;
  }
}

export async function getYouTubeTranscript(
  url: string
): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new YouTubeExtractionError(
      'Invalid YouTube URL. Supported: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/',
      false
    );
  }

  let rawSegments: RawSegment[] = [];

  try {
    const tracks = await getCaptionTracks(videoId);
    rawSegments = await fetchCaptionData(tracks[0].baseUrl);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const isBlocked = detail.includes('LOGIN_REQUIRED') || detail.includes('HTTP 400');

    throw new YouTubeExtractionError(
      isBlocked
        ? 'YouTube is blocking caption extraction from this server. Please copy the transcript manually from YouTube.'
        : `Could not extract captions: ${detail}`,
      isBlocked
    );
  }

  if (rawSegments.length === 0) {
    throw new YouTubeExtractionError(
      'This video has no captions available. Please copy the transcript manually from YouTube.',
      false
    );
  }

  // Fetch title
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
