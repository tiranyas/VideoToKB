import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractYouTubeId } from '@/lib/youtube-resolver';

export const runtime = 'nodejs';

interface VideoMeta {
  title: string;
  thumbnail: string | null;
  duration: number | null;   // seconds
  provider: 'youtube' | 'loom' | 'gdrive';
}

// ── YouTube ─────────────────────────────────────────────

const INNERTUBE_API_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const CONSENT_COOKIES =
  'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlfZnJvbnRlbmRfdWlzZXJ2ZXJfMjAyMzA4MjkuMDdfcDAQAhgCGgJlbg; CONSENT=PENDING+999';

async function getYouTubeMeta(videoId: string): Promise<VideoMeta> {
  const meta: VideoMeta = {
    title: 'YouTube Video',
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    duration: null,
    provider: 'youtube',
  };

  // oEmbed for title (fast, reliable)
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.title) meta.title = data.title;
    }
  } catch { /* non-critical */ }

  // Method 1: InnerTube for duration
  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          Cookie: CONSENT_COOKIES,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
              clientVersion: '2.0',
              hl: 'en',
              gl: 'US',
            },
            thirdParty: { embedUrl: 'https://www.google.com' },
          },
          videoId,
        }),
        signal: AbortSignal.timeout(5000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const details = data?.videoDetails as Record<string, unknown> | undefined;
      if (details?.lengthSeconds) {
        meta.duration = parseInt(details.lengthSeconds as string, 10);
      }
      // InnerTube also has title — use as fallback
      if (meta.title === 'YouTube Video' && details?.title) {
        meta.title = details.title as string;
      }
    }
  } catch { /* duration is nice-to-have */ }

  // Method 2: Scrape embed page for duration (less likely to be blocked than watch page)
  if (meta.duration === null) {
    try {
      const res = await fetch(
        `https://www.youtube.com/embed/${videoId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            Cookie: CONSENT_COOKIES,
          },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const html = await res.text();
        // Try "lengthSeconds":"1234" from embedded player config
        const lenMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
        if (lenMatch) {
          meta.duration = parseInt(lenMatch[1], 10);
        }
        // Also try approxDurationMs
        if (meta.duration === null) {
          const msMatch = html.match(/"approxDurationMs"\s*:\s*"(\d+)"/);
          if (msMatch) {
            meta.duration = Math.round(parseInt(msMatch[1], 10) / 1000);
          }
        }
      }
    } catch { /* non-critical */ }
  }

  return meta;
}

// ── Loom ────────────────────────────────────────────────

const LOOM_URL_PATTERN = /loom\.com\/share\/([a-f0-9]{32})/;

async function getLoomMeta(url: string): Promise<VideoMeta> {
  const meta: VideoMeta = {
    title: 'Loom Video',
    thumbnail: null,
    duration: null,
    provider: 'loom',
  };

  const match = url.match(LOOM_URL_PATTERN);
  if (!match) return meta;

  // oEmbed for title + thumbnail
  try {
    const res = await fetch(
      `https://www.loom.com/v1/oembed?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.title) meta.title = data.title;
      if (data.thumbnail_url) meta.thumbnail = data.thumbnail_url;
      // Loom oEmbed includes duration in some responses
      if (data.duration) meta.duration = Math.round(data.duration);
    }
  } catch { /* non-critical */ }

  // Fallback: scrape share page for title + thumbnail if oEmbed failed
  if (meta.title === 'Loom Video') {
    try {
      const res = await fetch(`https://www.loom.com/share/${match[1]}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          meta.title = titleMatch[1].replace(/\s*[|\-]\s*Loom\s*$/, '').trim() || 'Loom Video';
        }
        // og:image for thumbnail
        if (!meta.thumbnail) {
          const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
          if (ogMatch) meta.thumbnail = ogMatch[1];
        }
        // og:video:duration
        if (!meta.duration) {
          const durMatch = html.match(/<meta[^>]*property="og:video:duration"[^>]*content="([^"]+)"/i);
          if (durMatch) meta.duration = parseInt(durMatch[1], 10);
        }
      }
    } catch { /* non-critical */ }
  }

  return meta;
}

// ── Google Drive ────────────────────────────────────────

const GDRIVE_PATTERN = /\/d\/([a-zA-Z0-9_-]{10,})/;

async function getGDriveMeta(url: string): Promise<VideoMeta> {
  const meta: VideoMeta = {
    title: 'Google Drive Video',
    thumbnail: null,
    duration: null,
    provider: 'gdrive',
  };

  const match = url.match(GDRIVE_PATTERN);
  if (!match) return meta;

  const fileId = match[1];

  // Try fetching the file page for title
  try {
    const res = await fetch(
      `https://drive.google.com/file/d/${fileId}/view`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      }
    );
    if (res.ok) {
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        meta.title = titleMatch[1]
          .replace(/\s*-\s*Google Drive\s*$/, '')
          .trim() || 'Google Drive Video';
      }
      // og:image for thumbnail
      const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
      if (ogMatch) meta.thumbnail = ogMatch[1];
    }
  } catch { /* non-critical */ }

  return meta;
}

// ── Route Handler ───────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const url = body?.url;

  if (!url || typeof url !== 'string') {
    return Response.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    let meta: VideoMeta;

    if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
      const videoId = extractYouTubeId(url);
      if (!videoId) return Response.json({ error: 'Invalid YouTube URL' }, { status: 400 });
      meta = await getYouTubeMeta(videoId);
    } else if (url.includes('loom.com/share/')) {
      meta = await getLoomMeta(url);
    } else if (url.includes('drive.google.com')) {
      meta = await getGDriveMeta(url);
    } else {
      return Response.json({ error: 'Unsupported URL' }, { status: 400 });
    }

    console.log('[video-meta]', { provider: meta.provider, title: meta.title, duration: meta.duration, hasThumbnail: !!meta.thumbnail });
    return Response.json(meta);
  } catch {
    return Response.json({ error: 'Failed to fetch video metadata' }, { status: 500 });
  }
}
