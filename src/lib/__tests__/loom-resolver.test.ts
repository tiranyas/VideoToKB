import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveLoomUrl } from '@/lib/loom-resolver';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('resolveLoomUrl', () => {
  const validUrl = 'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';
  const validVideoId = '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d';

  it('accepts a valid Loom share URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><script>var url = "https://cdn.loom.com/sessions/raw/${validVideoId}/video.mp4"</script><title>My Loom Video</title></html>`,
    });

    const result = await resolveLoomUrl(validUrl);
    expect(result).toBeDefined();
    expect(result.videoUrl).toContain('cdn.loom.com');
    expect(result.title).toBeDefined();
  });

  it('throws a descriptive error for invalid URL format', async () => {
    await expect(resolveLoomUrl('https://example.com/not-a-loom-url')).rejects.toThrow(
      /invalid.*loom.*url/i
    );
  });

  it('throws an error for wrong domain', async () => {
    await expect(
      resolveLoomUrl('https://www.youtube.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d')
    ).rejects.toThrow(/loom/i);
  });

  it('extracts video ID correctly from URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `<html><script>var url = "https://cdn.loom.com/sessions/raw/${validVideoId}/video.mp4"</script><title>Test</title></html>`,
    });

    const result = await resolveLoomUrl(validUrl);
    expect(result.videoUrl).toContain(validVideoId);
  });

  it('handles 404 response with "video not found" error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(resolveLoomUrl(validUrl)).rejects.toThrow(/not found/i);
  });

  it('handles 403 response with "video is private" error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    await expect(resolveLoomUrl(validUrl)).rejects.toThrow(/private/i);
  });
});
