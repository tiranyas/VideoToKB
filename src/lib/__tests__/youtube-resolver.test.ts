import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractYouTubeId,
  isYouTubeUrl,
  getYouTubeTranscript,
  YouTubeExtractionError,
} from '@/lib/youtube-resolver';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock @supadata/js
const mockTranscript = vi.fn();
vi.mock('@supadata/js', () => ({
  Supadata: class MockSupadata {
    youtube = { transcript: mockTranscript };
  },
}));

beforeEach(() => {
  mockFetch.mockReset();
  mockTranscript.mockReset();
  vi.unstubAllEnvs();
});

// ── extractYouTubeId ──────────────────────────────────────

describe('extractYouTubeId', () => {
  it.each([
    ['watch URL', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['short URL', 'https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['embed URL', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['shorts URL', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['watch URL with extra params', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30', 'dQw4w9WgXcQ'],
  ])('extracts ID from %s', (_label, url, expectedId) => {
    expect(extractYouTubeId(url)).toBe(expectedId);
  });

  it.each([
    ['non-YouTube URL', 'https://www.example.com/watch?v=dQw4w9WgXcQ'],
    ['malformed URL', 'not-a-url'],
    ['empty string', ''],
    ['Loom URL', 'https://www.loom.com/share/abc123'],
  ])('returns null for %s', (_label, url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

// ── isYouTubeUrl ──────────────────────────────────────────

describe('isYouTubeUrl', () => {
  it('returns true for valid YouTube URL', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  it('returns true for youtu.be short URL', () => {
    expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  it('returns false for non-YouTube URL', () => {
    expect(isYouTubeUrl('https://www.example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isYouTubeUrl('')).toBe(false);
  });
});

// ── getYouTubeTranscript ──────────────────────────────────

describe('getYouTubeTranscript', () => {
  const validUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  it('throws YouTubeExtractionError with isServerBlocked=false for invalid URL', async () => {
    try {
      await getYouTubeTranscript('https://example.com/not-youtube');
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(YouTubeExtractionError);
      expect((err as YouTubeExtractionError).isServerBlocked).toBe(false);
    }
  });

  it('returns transcript when InnerTube succeeds', async () => {
    // InnerTube player response with caption tracks
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('youtubei/v1/player')) {
        return {
          ok: true,
          json: async () => ({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en' }],
              },
            },
          }),
        };
      }
      // Caption data fetch (json3 format)
      if (url.includes('timedtext')) {
        return {
          ok: true,
          json: async () => ({
            events: [
              { tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello' }] },
              { tStartMs: 2000, dDurationMs: 3000, segs: [{ utf8: ' world' }] },
            ],
          }),
        };
      }
      // oEmbed
      if (url.includes('oembed')) {
        return {
          ok: true,
          json: async () => ({ title: 'Test Video' }),
        };
      }
      return { ok: false };
    });

    const result = await getYouTubeTranscript(validUrl);
    expect(result.transcript).toContain('Hello');
    expect(result.transcript).toContain('world');
    expect(result.title).toBe('Test Video');
    expect(result.segments.length).toBe(2);
    expect(result.segments[0].start).toBe(0);
    expect(result.segments[0].end).toBe(2000);
  });

  it('falls back to Supadata when InnerTube fails', async () => {
    vi.stubEnv('SUPADATA_API_KEY', 'test-key');

    // InnerTube fails for all client configs
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('youtubei/v1/player')) {
        return { ok: false, status: 403 };
      }
      // oEmbed
      if (url.includes('oembed')) {
        return {
          ok: true,
          json: async () => ({ title: 'Supadata Video' }),
        };
      }
      return { ok: false };
    });

    // Supadata returns transcript
    mockTranscript.mockResolvedValueOnce({
      content: [
        { text: 'Supadata transcript', offset: 0, duration: 5000 },
      ],
    });

    const result = await getYouTubeTranscript(validUrl);
    expect(result.transcript).toContain('Supadata transcript');
    expect(mockTranscript).toHaveBeenCalled();
  });

  it('throws YouTubeExtractionError with isServerBlocked=true when both methods fail', async () => {
    vi.stubEnv('SUPADATA_API_KEY', 'test-key');

    // InnerTube fails
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('youtubei/v1/player')) {
        return { ok: false, status: 400 };
      }
      return { ok: false };
    });

    // Supadata fails
    mockTranscript.mockRejectedValueOnce(new Error('Supadata error'));

    try {
      await getYouTubeTranscript(validUrl);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(YouTubeExtractionError);
      expect((err as YouTubeExtractionError).isServerBlocked).toBe(true);
    }
  });

  it('fetches title via oEmbed', async () => {
    // InnerTube succeeds
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('youtubei/v1/player')) {
        return {
          ok: true,
          json: async () => ({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en' }],
              },
            },
          }),
        };
      }
      if (url.includes('timedtext')) {
        return {
          ok: true,
          json: async () => ({
            events: [
              { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'test' }] },
            ],
          }),
        };
      }
      if (url.includes('oembed')) {
        return {
          ok: true,
          json: async () => ({ title: 'My Custom Title' }),
        };
      }
      return { ok: false };
    });

    const result = await getYouTubeTranscript(validUrl);
    expect(result.title).toBe('My Custom Title');
  });

  it('uses default title when oEmbed fails', async () => {
    // InnerTube succeeds
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('youtubei/v1/player')) {
        return {
          ok: true,
          json: async () => ({
            captions: {
              playerCaptionsTracklistRenderer: {
                captionTracks: [{ baseUrl: 'https://www.youtube.com/api/timedtext?v=test&lang=en' }],
              },
            },
          }),
        };
      }
      if (url.includes('timedtext')) {
        return {
          ok: true,
          json: async () => ({
            events: [
              { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'test' }] },
            ],
          }),
        };
      }
      // oEmbed fails
      if (url.includes('oembed')) {
        return { ok: false };
      }
      return { ok: false };
    });

    const result = await getYouTubeTranscript(validUrl);
    expect(result.title).toBe('YouTube Video');
  });
});
