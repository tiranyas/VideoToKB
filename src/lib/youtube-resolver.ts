import { getSubtitles } from 'youtube-caption-extractor';

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

// ── Transcript Extraction ────────────────────────────────

interface YouTubeSubtitle {
  text: string;
  start: string | number;
  dur: string | number;
}

export interface YouTubeTranscriptResult {
  transcript: string;
  title: string;
  segments: { text: string; start: number; end: number }[];
}

/**
 * Extract transcript from YouTube video captions.
 * Tries multiple language codes, preferring the video's original language.
 */
export async function getYouTubeTranscript(
  url: string
): Promise<YouTubeTranscriptResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL. Supported formats: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/');
  }

  // Try fetching captions — try without lang first (gets default), then common codes
  const langAttempts = ['', 'en', 'he', 'iw'];
  let subtitles: YouTubeSubtitle[] = [];
  let lastError: Error | null = null;

  for (const lang of langAttempts) {
    try {
      const options: { videoID: string; lang?: string } = { videoID: videoId };
      if (lang) options.lang = lang;

      const result = await getSubtitles(options);
      if (result && result.length > 0) {
        subtitles = result as YouTubeSubtitle[];
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (subtitles.length === 0) {
    const baseMsg = 'Could not extract captions from this YouTube video.';
    const hint = ' The video may not have captions enabled, or YouTube may be blocking the request.';
    const tip = ' Try pasting the transcript manually instead.';
    throw new Error(baseMsg + hint + tip + (lastError ? ` (${lastError.message})` : ''));
  }

  // Fetch video title from oEmbed API (reliable, no auth needed)
  let title = 'YouTube Video';
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      title = data.title || title;
    }
  } catch {
    // Title is non-critical, use default
  }

  // Convert subtitles to segments with start/end times
  const segments = subtitles.map((sub) => {
    const startSec = typeof sub.start === 'string' ? parseFloat(sub.start) : sub.start;
    const durSec = typeof sub.dur === 'string' ? parseFloat(sub.dur) : sub.dur;
    const startMs = Math.round(startSec * 1000);
    const durMs = Math.round(durSec * 1000);
    const endMs = startMs + durMs;
    return {
      text: sub.text.replace(/\n/g, ' ').trim(),
      start: startMs,
      end: endMs,
    };
  });

  // Build full transcript text (same format as AssemblyAI paragraphs)
  const transcript = segments
    .filter((s) => s.text.length > 0)
    .map((s) => s.text)
    .join(' ');

  return { transcript, title, segments };
}
