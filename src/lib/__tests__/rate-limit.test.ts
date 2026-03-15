import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
function createMockSupabase(hitCount: number = 0) {
  const deleteMock = {
    lt: vi.fn().mockResolvedValue({ error: null }),
  };
  const insertMock = {
    select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: {}, error: null }) }),
  };
  const selectMock = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ count: hitCount, error: null }),
  };

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table !== 'rate_limit_hits') throw new Error(`Unexpected table: ${table}`);
    return {
      select: vi.fn().mockReturnValue(selectMock),
      insert: vi.fn().mockReturnValue(insertMock),
      delete: vi.fn().mockReturnValue(deleteMock),
    };
  });

  return { from: fromMock, _selectMock: selectMock, _insertMock: insertMock, _deleteMock: deleteMock };
}

describe('rateLimit (Supabase-backed)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns ok: true with remaining count when under limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(2); // 2 hits out of 10 allowed
    const limiter = rateLimit({ tokens: 10, interval: 60_000, supabaseAdmin: mock as any });

    const result = await limiter.check('user-1');

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(7); // 10 - 2 - 1 (new insert) = 7
    expect(result.retryAfterMs).toBe(0);
  });

  it('returns ok: false with remaining: 0 when hits exceed token count', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(10); // 10 hits, limit is 10
    const limiter = rateLimit({ tokens: 10, interval: 60_000, supabaseAdmin: mock as any });

    const result = await limiter.check('user-1');

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('does not count old hits outside the sliding window', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    // Mock returns 0 hits in window (old ones expired)
    const mock = createMockSupabase(0);
    const limiter = rateLimit({ tokens: 5, interval: 60_000, supabaseAdmin: mock as any });

    const result = await limiter.check('user-1');

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 0 - 1 = 4
    // Verify gte was called with a timestamp (sliding window filter)
    expect(mock._selectMock.gte).toHaveBeenCalled();
  });

  it('tracks different identifiers independently', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(3);
    const limiter = rateLimit({ tokens: 5, interval: 60_000, supabaseAdmin: mock as any });

    await limiter.check('user-a');
    await limiter.check('user-b');

    // Verify eq was called with different identifiers
    const eqCalls = mock._selectMock.eq.mock.calls;
    const identifiers = eqCalls
      .filter((call: any[]) => call[0] === 'identifier')
      .map((call: any[]) => call[1]);
    expect(identifiers).toContain('user-a');
    expect(identifiers).toContain('user-b');
  });

  it('calls Supabase .from().select/.insert/.delete correctly', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(2);
    const limiter = rateLimit({ tokens: 10, interval: 60_000, supabaseAdmin: mock as any });

    await limiter.check('test-user');

    // Should have called from('rate_limit_hits') for select + insert + delete
    expect(mock.from).toHaveBeenCalledWith('rate_limit_hits');
    // At least 2 calls: one for select (count), one for insert
    expect(mock.from.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
