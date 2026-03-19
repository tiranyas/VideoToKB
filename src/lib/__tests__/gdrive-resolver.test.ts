import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveGoogleDriveUrl } from '@/lib/gdrive-resolver';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

// ── URL parsing ───────────────────────────────────────────

describe('URL parsing', () => {
  it('throws for invalid Google Drive URL', async () => {
    await expect(resolveGoogleDriveUrl('https://example.com/not-gdrive')).rejects.toThrow(
      /invalid google drive url/i
    );
  });

  it('throws for empty string', async () => {
    await expect(resolveGoogleDriveUrl('')).rejects.toThrow(/invalid google drive url/i);
  });

  it('extracts file ID from /file/d/{id}/view format', async () => {
    const fileId = 'abc123_XYZ-def456';
    const shareUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

    // First candidate returns video content
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      if (url.includes(fileId)) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.videoUrl).toContain(fileId);
  });

  it('extracts file ID from /open?id={id} format', async () => {
    const fileId = 'xyz789_ABC-ghi012';
    const shareUrl = `https://drive.google.com/open?id=${fileId}`;

    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      if (url.includes(fileId)) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.videoUrl).toContain(fileId);
  });
});

// ── Download resolution ───────────────────────────────────

describe('resolveGoogleDriveUrl', () => {
  const fileId = 'testFileId123';
  const shareUrl = `https://drive.google.com/file/d/${fileId}/view`;

  it('returns videoUrl when first download candidate returns non-HTML content', async () => {
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      // First candidate (usercontent domain) returns video
      if (url.includes('drive.usercontent.google.com')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.videoUrl).toContain('drive.usercontent.google.com');
    expect(result.videoUrl).toContain(fileId);
  });

  it('tries next candidate when first returns HTML', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      callCount++;
      // First candidate returns HTML
      if (callCount === 1) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: async () => '<html>No form action here</html>',
        };
      }
      // Second candidate returns video
      if (callCount === 2) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    // Should be second candidate URL (legacy with confirm)
    expect(result.videoUrl).toContain('drive.google.com/uc?export=download');
    expect(result.videoUrl).toContain('confirm=t');
  });

  it('extracts download URL from HTML form action when all candidates return HTML', async () => {
    const extractedUrl = 'https://drive.usercontent.google.com/download?id=testFileId123&export=download&confirm=abc123';
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      // All candidates return HTML, first one has form action
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'text/html' }),
        text: async () =>
          `<html><form action="${extractedUrl.replace(/&/g, '&amp;')}"><button>Download</button></form></html>`,
      };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.videoUrl).toBe(extractedUrl);
  });

  it('throws when no download URL can be resolved', async () => {
    mockFetch.mockImplementation(async (_url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      // All candidates return 404
      return { ok: false, status: 404 };
    });

    await expect(resolveGoogleDriveUrl(shareUrl)).rejects.toThrow(
      /could not get a direct download url/i
    );
  });

  it('extracts title from content-disposition header', async () => {
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      // HEAD request for title
      if (opts?.method === 'HEAD') {
        return {
          ok: true,
          headers: new Headers({
            'content-disposition': 'attachment; filename="My Video.mp4"',
          }),
        };
      }
      // First candidate returns video
      if (url.includes('drive.usercontent.google.com')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.title).toBe('My Video');
  });

  it('uses default title when content-disposition is missing', async () => {
    mockFetch.mockImplementation(async (url: string, opts?: RequestInit) => {
      if (opts?.method === 'HEAD') {
        return { ok: true, headers: new Headers() };
      }
      if (url.includes('drive.usercontent.google.com')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'video/mp4' }),
        };
      }
      return { ok: false };
    });

    const result = await resolveGoogleDriveUrl(shareUrl);
    expect(result.title).toBe('Google Drive Video');
  });
});
