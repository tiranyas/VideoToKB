/**
 * Supabase-backed sliding-window rate limiter.
 *
 * Persists hits across serverless cold starts by storing them
 * in a `rate_limit_hits` table in Supabase.
 *
 * Usage in an API route:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const limiter = rateLimit({ tokens: 10, interval: 60_000 });
 *
 *   // inside async handler:
 *   const limited = await limiter.check(userId);
 *   if (!limited.ok) return Response.json({ error: 'Too many requests' }, { status: 429 });
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

export interface RateLimitOptions {
  /** Maximum number of requests allowed within the interval. */
  tokens: number;
  /** Sliding window duration in milliseconds. */
  interval: number;
  /** Optional Supabase admin client (for testing or shared instances). */
  supabaseAdmin?: SupabaseClient;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

let _sharedAdmin: SupabaseClient | null = null;

function getSharedAdmin(): SupabaseClient {
  if (!_sharedAdmin) {
    _sharedAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _sharedAdmin;
}

export function rateLimit({ tokens, interval, supabaseAdmin }: RateLimitOptions) {
  const getClient = () => supabaseAdmin ?? getSharedAdmin();

  async function check(identifier: string): Promise<RateLimitResult> {
    const client = getClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() - interval);

    // Count hits in the current sliding window
    const { count, error: countError } = await client
      .from('rate_limit_hits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', identifier)
      .gte('hit_at', windowStart.toISOString());

    const hitCount = count ?? 0;

    if (countError) {
      // On DB error, fail open (allow request) but log
      console.error('Rate limit count error:', countError);
      return { ok: true, remaining: tokens - 1, retryAfterMs: 0 };
    }

    if (hitCount >= tokens) {
      // Over limit
      return {
        ok: false,
        remaining: 0,
        retryAfterMs: interval, // conservative: full window
      };
    }

    // Under limit: record this hit
    await client
      .from('rate_limit_hits')
      .insert({ identifier, hit_at: now.toISOString() });

    // Fire-and-forget cleanup of expired hits
    client
      .from('rate_limit_hits')
      .delete()
      .lt('hit_at', windowStart.toISOString())
      .then(() => {/* ignore cleanup errors */})
      .catch(() => {/* ignore cleanup errors */});

    return {
      ok: true,
      remaining: tokens - hitCount - 1,
      retryAfterMs: 0,
    };
  }

  return { check };
}
