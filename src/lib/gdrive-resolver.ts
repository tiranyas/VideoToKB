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

export async function resolveGoogleDriveUrl(shareUrl: string): Promise<VideoInfo> {
  const fileId = extractFileId(shareUrl);
  if (!fileId) {
    throw new Error(
      'Invalid Google Drive URL. Expected: https://drive.google.com/file/d/{id}/view or https://drive.google.com/open?id={id}'
    );
  }

  // Construct direct download URL
  const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  // Verify the file is accessible by making a HEAD request
  const response = await fetch(directUrl, {
    method: 'HEAD',
    redirect: 'follow',
  });

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

  // Try to get filename from Content-Disposition header
  const disposition = response.headers.get('content-disposition');
  let title = 'Google Drive Video';
  if (disposition) {
    const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
    if (filenameMatch) {
      title = decodeURIComponent(filenameMatch[1]).replace(/\.[^.]+$/, '');
    }
  }

  return { videoUrl: directUrl, title };
}
