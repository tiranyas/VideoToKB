import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures this runs before the hoisted vi.mock calls
const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn().mockResolvedValue({ ok: true, remaining: 9, retryAfterMs: 0 }),
}));

// Mock dependencies before importing the route
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({
    check: mockCheck,
  })),
}));

vi.mock('@/lib/supabase/queries', () => ({
  checkQuota: vi.fn().mockResolvedValue({ allowed: true, usage: null }),
}));

vi.mock('@/lib/pipeline', () => ({
  runPhaseA: vi.fn(async (_opts: unknown, onProgress: (e: unknown) => void) => {
    onProgress({ step: 'review', status: 'done', article: '# Test Article' });
  }),
  runPhaseB: vi.fn(async (_opts: unknown, onProgress: (e: unknown) => void) => {
    onProgress({ step: 'done', status: 'done', html: '<h1>Test</h1>' });
  }),
}));

vi.mock('@/lib/usage-logger', () => ({
  flushUsageLogs: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '@/app/api/process/route';
import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function makeRequest(body?: unknown): Request {
  return new Request('http://localhost/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : '{}',
  });
}

function makeRawRequest(rawBody: string): Request {
  return new Request('http://localhost/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  });
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: authenticated user
  mockCreateClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  } as never);

  // Default: rate limit OK
  mockCheck.mockResolvedValue({ ok: true, remaining: 9, retryAfterMs: 0 });
});

describe('POST /api/process', () => {
  it('returns 401 when no user session', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    } as never);

    const res = await POST(makeRequest({ phase: 'generate', videoUrl: 'https://example.com' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 429 with Retry-After when rate limited', async () => {
    mockCheck.mockResolvedValue({ ok: false, remaining: 0, retryAfterMs: 30000 });

    const res = await POST(makeRequest({ phase: 'generate' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    const json = await res.json();
    expect(json.error).toContain('Too many requests');
  });

  it('returns 400 when body is not valid JSON', async () => {
    const res = await POST(makeRawRequest('not json!!!'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid JSON');
  });

  it('returns 400 when phase=generate but videoUrl and transcript are both missing', async () => {
    const res = await POST(makeRequest({ phase: 'generate', draftPrompt: 'p', structurePrompt: 's' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('videoUrl');
  });

  it('returns 400 when phase=generate but draftPrompt is missing', async () => {
    const res = await POST(makeRequest({ phase: 'generate', videoUrl: 'https://example.com' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('draftPrompt');
  });

  it('returns 413 when transcript exceeds 500k chars', async () => {
    const longTranscript = 'a'.repeat(500_001);
    const res = await POST(makeRequest({
      phase: 'generate',
      transcript: longTranscript,
      draftPrompt: 'p',
      structurePrompt: 's',
    }));
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toContain('too long');
  });

  it('returns SSE response (text/event-stream) for valid generate request', async () => {
    const res = await POST(makeRequest({
      phase: 'generate',
      videoUrl: 'https://loom.com/share/abc123',
      draftPrompt: 'Write a draft',
      structurePrompt: 'Structure it',
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
