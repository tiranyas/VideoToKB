import type { VideoInfo } from '@/types';

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

export async function resolveLoomUrl(shareUrl: string): Promise<VideoInfo> {
  const match = shareUrl.match(LOOM_URL_PATTERN);
  if (!match) {
    throw new Error(
      'Invalid Loom URL format. Expected: https://www.loom.com/share/{32-character-id}'
    );
  }

  const videoId = match[1];

  // Try Loom's transcoded-url API first — returns URL with audio+video combined
  try {
    const apiRes = await fetch(
      `https://www.loom.com/api/campaigns/sessions/${videoId}/transcoded-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Origin': 'https://www.loom.com',
          'Referer': `https://www.loom.com/share/${videoId}`,
        },
        body: JSON.stringify({ anonID: '' }),
      }
    );
    if (apiRes.ok) {
      const apiData = await apiRes.json();
      if (apiData?.url) {
        // Get title from share page
        let title = 'Untitled Loom Video';
        try {
          const pageRes = await fetch(`https://www.loom.com/share/${videoId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (pageRes.ok) {
            title = extractTitle(await pageRes.text());
          }
        } catch {
          // Title extraction is best-effort
        }
        return { videoUrl: apiData.url, title };
      }
    }
  } catch {
    // API call failed, fall through to page scraping
  }

  // Fallback: scrape the share page
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
  const title = extractTitle(html);

  // Parse Apollo state for transcoded URL (prefer urls with audio)
  const apolloMatch = html.match(
    /window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]+?\});?\s*<\/script>/
  );
  if (apolloMatch) {
    try {
      const apolloData = JSON.parse(apolloMatch[1]);
      // Look for transcoded URL with audio first, then any CDN URL
      let fallbackUrl: string | null = null;
      for (const key of Object.keys(apolloData)) {
        const val = apolloData[key];
        // Prefer "has_audio" flagged entries
        if (val?.has_audio === true && val?.url && typeof val.url === 'string') {
          return { videoUrl: val.url, title };
        }
        // Collect any CDN URL as fallback
        if (
          val?.url &&
          typeof val.url === 'string' &&
          val.url.includes('cdn.loom.com') &&
          !fallbackUrl
        ) {
          fallbackUrl = val.url;
        }
      }
      if (fallbackUrl) {
        return { videoUrl: fallbackUrl, title };
      }
    } catch {
      // Apollo JSON parse failed, fall through
    }
  }

  // Last resort: CDN MP4 pattern from page HTML
  const cdnMatch = html.match(
    /https:\/\/cdn\.loom\.com\/sessions\/[^"'\s\\]+\.mp4/
  );
  if (cdnMatch) {
    return { videoUrl: cdnMatch[0], title };
  }

  throw new Error(
    'Could not extract video URL from Loom. The video may be private or the page structure may have changed.'
  );
}
