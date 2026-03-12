import type { LoomVideoInfo } from '@/types';

const LOOM_URL_PATTERN = /loom\.com\/share\/([a-f0-9]{32})/;

function extractTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    // Clean up common Loom title suffixes
    return titleMatch[1]
      .replace(/\s*\|\s*Loom\s*$/, '')
      .replace(/\s*-\s*Loom\s*$/, '')
      .trim() || 'Untitled Loom Video';
  }
  return 'Untitled Loom Video';
}

export async function resolveLoomUrl(shareUrl: string): Promise<LoomVideoInfo> {
  const match = shareUrl.match(LOOM_URL_PATTERN);
  if (!match) {
    throw new Error(
      'Invalid Loom URL format. Expected: https://www.loom.com/share/{32-character-id}'
    );
  }

  const videoId = match[1];

  const response = await fetch(`https://www.loom.com/share/${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Loom video not found. Check the URL.');
    }
    if (response.status === 403) {
      throw new Error(
        'This Loom video is private. Make it public or use a share link.'
      );
    }
    throw new Error(`Could not access Loom video (HTTP ${response.status})`);
  }

  const html = await response.text();

  // Try CDN MP4 pattern first
  const cdnMatch = html.match(
    /https:\/\/cdn\.loom\.com\/sessions\/[^"'\s\\]+\.mp4/
  );
  if (cdnMatch) {
    return { videoUrl: cdnMatch[0], title: extractTitle(html) };
  }

  // Fallback: parse Apollo state for transcoded URL
  const apolloMatch = html.match(
    /window\.__APOLLO_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s
  );
  if (apolloMatch) {
    try {
      const apolloData = JSON.parse(apolloMatch[1]);
      for (const key of Object.keys(apolloData)) {
        const val = apolloData[key];
        if (
          val?.url &&
          typeof val.url === 'string' &&
          val.url.includes('cdn.loom.com')
        ) {
          return { videoUrl: val.url, title: extractTitle(html) };
        }
      }
    } catch {
      // Apollo JSON parse failed, fall through to error
    }
  }

  throw new Error(
    'Could not extract video URL from Loom. The video may be private or the page structure may have changed.'
  );
}
