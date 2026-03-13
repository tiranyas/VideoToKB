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
 * Google Drive serves a virus-scan confirmation page for larger files
 * instead of the actual file. This function detects that and extracts
 * the real download URL by requesting with the confirm token.
 */
async function resolveDirectDownloadUrl(fileId: string): Promise<string> {
  const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  // First request — might return the file directly or a confirmation page
  const response = await fetch(baseUrl, { redirect: 'follow' });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Google Drive file not found. Check the URL.');
    }
    if (response.status === 403) {
      throw new Error(
        'This Google Drive file is not publicly shared. Set sharing to "Anyone with the link".'
      );
    }
    throw new Error(`Could not access Google Drive file (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  // If we got the actual file (not HTML), the base URL works fine
  if (!contentType.includes('text/html')) {
    return baseUrl;
  }

  // We got the confirmation page — extract the confirm token from cookies
  const cookies = response.headers.get('set-cookie') ?? '';
  const downloadWarningMatch = cookies.match(/download_warning_\w+=([^;]+)/);

  if (downloadWarningMatch) {
    return `${baseUrl}&confirm=${downloadWarningMatch[1]}`;
  }

  // Alternative: parse the HTML for the confirm link
  const html = await response.text();
  const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
  if (confirmMatch) {
    return `${baseUrl}&confirm=${confirmMatch[1]}`;
  }

  // Last resort: try with confirm=t (works for many files)
  return `${baseUrl}&confirm=t`;
}

export async function resolveGoogleDriveUrl(shareUrl: string): Promise<VideoInfo> {
  const fileId = extractFileId(shareUrl);
  if (!fileId) {
    throw new Error(
      'Invalid Google Drive URL. Expected: https://drive.google.com/file/d/{id}/view or https://drive.google.com/open?id={id}'
    );
  }

  const videoUrl = await resolveDirectDownloadUrl(fileId);

  // Verify the resolved URL returns actual media, not HTML
  const verifyResponse = await fetch(videoUrl, { method: 'HEAD', redirect: 'follow' });
  const verifyContentType = verifyResponse.headers.get('content-type') ?? '';

  if (verifyContentType.includes('text/html')) {
    throw new Error(
      'Google Drive is still returning an HTML page instead of the video file. The file may be too large or not properly shared. Try sharing it as "Anyone with the link" with Viewer access.'
    );
  }

  // Try to get filename from Content-Disposition header
  const disposition = verifyResponse.headers.get('content-disposition');
  let title = 'Google Drive Video';
  if (disposition) {
    const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
    if (filenameMatch) {
      title = decodeURIComponent(filenameMatch[1]).replace(/\.[^.]+$/, '');
    }
  }

  return { videoUrl, title };
}
