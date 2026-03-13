import type { VideoInfo } from '@/types';

const GDRIVE_FILE_PATTERN = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
const GDRIVE_OPEN_PATTERN = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;

function extractFileId(url: string): string | null {
  const fileMatch = url.match(GDRIVE_FILE_PATTERN);
  if (fileMatch) return fileMatch[1];

  const openMatch = url.match(GDRIVE_OPEN_PATTERN);
  if (openMatch) return openMatch[1];

  return null;
}

/**
 * Google Drive has multiple download URL patterns. We try them in order
 * until one returns actual media content (not an HTML confirmation page).
 */
async function resolveDirectDownloadUrl(fileId: string): Promise<string> {
  const candidates = [
    // New usercontent domain (current Google behavior)
    `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    // Legacy direct download with confirm bypass
    `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
    // Legacy without confirm
    `https://drive.google.com/uc?export=download&id=${fileId}`,
  ];

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          // Mimic a browser request to avoid being served the confirmation page
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') ?? '';

      // If it's not HTML, we got the real file — this URL works
      if (!contentType.includes('text/html')) {
        return url;
      }

      // It's HTML — try to extract a redirect/download URL from the page
      const html = await response.text();

      // Look for the download form action URL
      const formActionMatch = html.match(/action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]+)"/);
      if (formActionMatch) {
        const decoded = formActionMatch[1].replace(/&amp;/g, '&');
        return decoded;
      }
    } catch {
      // Try next candidate
      continue;
    }
  }

  throw new Error(
    'Could not get a direct download URL from Google Drive. The file may be too large, not publicly shared, or Google is blocking automated downloads. Try sharing it as "Anyone with the link" with Viewer access.'
  );
}

export async function resolveGoogleDriveUrl(shareUrl: string): Promise<VideoInfo> {
  const fileId = extractFileId(shareUrl);
  if (!fileId) {
    throw new Error(
      'Invalid Google Drive URL. Expected: https://drive.google.com/file/d/{id}/view or https://drive.google.com/open?id={id}'
    );
  }

  const videoUrl = await resolveDirectDownloadUrl(fileId);

  // Try to get filename via metadata endpoint (doesn't require auth for public files)
  let title = 'Google Drive Video';
  try {
    const metaResponse = await fetch(videoUrl, { method: 'HEAD', redirect: 'follow' });
    const disposition = metaResponse.headers.get('content-disposition');
    if (disposition) {
      const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
      if (filenameMatch) {
        title = decodeURIComponent(filenameMatch[1]).replace(/\.[^.]+$/, '');
      }
    }
  } catch {
    // Keep default title
  }

  return { videoUrl, title };
}
