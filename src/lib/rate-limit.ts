/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Usage in an API route:
 *   import { rateLimit } from '@/lib/rate-limit';
 *   const limiter = rateLimit({ tokens: 10, interval: 60_000 });
 *
 *   // inside handler:
 *   const limited = limiter.check(userId);
 *   if (!limited.ok) return Response.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitOptions {
  /** Maximum number of requests allowed within the interval. */
  tokens: number;
  /** Sliding window duration in milliseconds. */
  interval: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit({ tokens, interval }: RateLimitOptions) {
  // Map from identifier -> array of timestamps
  const hits = new Map<string, number[]>();

  // Periodically prune stale entries to prevent memory leaks
  const PRUNE_INTERVAL = 60_000;
  let lastPrune = Date.now();

  function prune(now: number) {
    if (now - lastPrune < PRUNE_INTERVAL) return;
    lastPrune = now;
    const cutoff = now - interval;
    for (const [key, timestamps] of hits) {
      const filtered = timestamps.filter((t) => t > cutoff);
      if (filtered.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, filtered);
      }
    }
  }

  function check(identifier: string): RateLimitResult {
    const now = Date.now();
    prune(now);

    const cutoff = now - interval;
    const timestamps = (hits.get(identifier) ?? []).filter((t) => t > cutoff);

    if (timestamps.length >= tokens) {
      // Find when the oldest hit in the window expires
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + interval - now;
      return { ok: false, remaining: 0, retryAfterMs };
    }

    timestamps.push(now);
    hits.set(identifier, timestamps);

    return { ok: true, remaining: tokens - timestamps.length, retryAfterMs: 0 };
  }

  return { check };
}
