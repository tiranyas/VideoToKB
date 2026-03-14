import { Supadata } from '@supadata/js';

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

interface RawSegment {
  text: string;
  start: number;
  dur: number;
}

// ── Error Class ──────────────────────────────────────────

export class YouTubeExtractionError extends Error {
  isServerBlocked: boolean;
  constructor(message: string, isServerBlocked: boolean) {
    super(message);
    this.name = 'YouTubeExtractionError';
    this.isServerBlocked = isServerBlocked;
  }
}

// ── Method 1: Direct InnerTube (free, may be blocked) ────

const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';
const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const CONSENT_COOKIES =
  'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMzA4MjkuMDdfcDAQAhgCGgJlbg; CONSENT=PENDING+999';

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

async function tryDirectExtraction(videoId: string): Promise<RawSegment[]> {
  const errors: string[] = [];

  for (const config of CLIENT_CONFIGS) {
    try {
      const res = await fetch(`${INNERTUBE_BASE}/player?key=${INNERTUBE_API_KEY}`, {
        method: 'POST',
        headers: config.headers,
        body: JSON.stringify({ context: config.context, videoId }),
      });

      if (!res.ok) { errors.push(`${config.name}: HTTP ${res.status}`); continue; }

      const data = await res.json();
      const status = (data?.playabilityStatus as Record<string, unknown>)?.status as string | undefined;
      if (status === 'LOGIN_REQUIRED' || status === 'UNPLAYABLE') {
        errors.push(`${config.name}: ${status}`); continue;
      }

      const tracks = (
        (data?.captions as Record<string, unknown>)
          ?.playerCaptionsTracklistRenderer as Record<string, unknown>
      )?.captionTracks as Array<{ baseUrl: string }> | undefined;

      if (!tracks?.length) { errors.push(`${config.name}: no tracks`); continue; }

      // Fetch caption data as JSON3
      const url = new URL(tracks[0].baseUrl);
      url.searchParams.set('fmt', 'json3');
      const capRes = await fetch(url.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0', Cookie: CONSENT_COOKIES },
      });
      if (!capRes.ok) { errors.push(`${config.name}: caption fetch ${capRes.status}`); continue; }

      const capData = (await capRes.json()) as {
        events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: Array<{ utf8: string }> }>;
      };

      if (!capData.events) { errors.push(`${config.name}: no events`); continue; }

      const segments: RawSegment[] = [];
      for (const event of capData.events) {
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

      if (segments.length > 0) return segments;
      errors.push(`${config.name}: empty segments`);
    } catch (err) {
      errors.push(`${config.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(errors.join('; '));
}

// ── Method 2: Supadata API (paid, reliable) ──────────────

async function trySupadata(url: string): Promise<RawSegment[]> {
  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    throw new Error('SUPADATA_API_KEY not configured');
  }

  const supadata = new Supadata({ apiKey });

  const result = await supadata.youtube.transcript({
    url,
    text: false, // Get timestamped segments
  });

  if (!result.content || !Array.isArray(result.content) || result.content.length === 0) {
    throw new Error('No transcript content returned from Supadata');
  }

  return (result.content as Array<{ text: string; offset: number; duration: number }>).map((seg) => ({
    text: seg.text.replace(/\n/g, ' ').trim(),
    start: seg.offset / 1000, // ms → seconds
    dur: seg.duration / 1000,
  }));
}

// ── Main Entry Point ─────────────────────────────────────

/**
 * Extract YouTube transcript using a 3-tier fallback:
 * 1. Direct InnerTube extraction (free, may be blocked on server IPs)
 * 2. Supadata API (reliable, uses credits — needs SUPADATA_API_KEY env var)
 * 3. If both fail → throws YouTubeExtractionError with isServerBlocked=true
 *    so the UI can show manual transcript instructions
 */
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
  const errors: string[] = [];

  // Method 1: Direct extraction (free)
  try {
    rawSegments = await tryDirectExtraction(videoId);
  } catch (err) {
    errors.push(`Direct: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Method 2: Supadata API (reliable fallback)
  if (rawSegments.length === 0) {
    try {
      rawSegments = await trySupadata(url);
    } catch (err) {
      errors.push(`Supadata: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // All methods failed
  if (rawSegments.length === 0) {
    const allErrors = errors.join('; ');
    const isBlocked = allErrors.includes('LOGIN_REQUIRED') || allErrors.includes('HTTP 400');
    throw new YouTubeExtractionError(
      'Could not extract YouTube captions. ' +
        (isBlocked
          ? 'YouTube is blocking server requests and Supadata fallback is unavailable.'
          : `Details: ${allErrors}`),
      true // Show manual fallback regardless — if we got here, nothing worked
    );
  }

  // Fetch title via oEmbed
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
