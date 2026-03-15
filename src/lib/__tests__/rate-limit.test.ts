import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client that simulates chained query API
function createMockSupabase(hitCount: number = 0) {
  const deleteChain = {
    lt: vi.fn().mockReturnValue(Promise.resolve({ error: null })),
  };

  const insertChain = vi.fn().mockResolvedValue({ error: null });

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockResolvedValue({ count: hitCount, error: null }),
  };

  const fromMock = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue(selectChain),
    insert: insertChain,
    delete: vi.fn().mockReturnValue(deleteChain),
  }));

  return {
    from: fromMock,
    _selectChain: selectChain,
    _insertChain: insertChain,
    _deleteChain: deleteChain,
  };
}

describe('rateLimit (Supabase-backed)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns ok: true with remaining count when under limit', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(2); // 2 hits in window, limit is 10
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
    // Mock returns 0 hits in window (old ones expired via gte filter)
    const mock = createMockSupabase(0);
    const limiter = rateLimit({ tokens: 5, interval: 60_000, supabaseAdmin: mock as any });

    const result = await limiter.check('user-1');

    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(4); // 5 - 0 - 1 = 4
    // Verify gte was called with a timestamp string (sliding window filter)
    expect(mock._selectChain.gte).toHaveBeenCalledWith('hit_at', expect.any(String));
  });

  it('tracks different identifiers independently', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(3);
    const limiter = rateLimit({ tokens: 5, interval: 60_000, supabaseAdmin: mock as any });

    await limiter.check('user-a');
    await limiter.check('user-b');

    // Verify eq was called with different identifiers
    const eqCalls = mock._selectChain.eq.mock.calls;
    const identifiers = eqCalls
      .filter((call: any[]) => call[0] === 'identifier')
      .map((call: any[]) => call[1]);
    expect(identifiers).toContain('user-a');
    expect(identifiers).toContain('user-b');
  });

  it('calls Supabase from(rate_limit_hits) for select, insert, and delete', async () => {
    const { rateLimit } = await import('@/lib/rate-limit');
    const mock = createMockSupabase(2);
    const limiter = rateLimit({ tokens: 10, interval: 60_000, supabaseAdmin: mock as any });

    await limiter.check('test-user');

    // Should call from('rate_limit_hits') for select + insert + delete (fire-and-forget)
    expect(mock.from).toHaveBeenCalledWith('rate_limit_hits');
    // At least 2 calls: count query + insert (delete is fire-and-forget)
    expect(mock.from.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
