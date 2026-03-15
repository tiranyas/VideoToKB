# Phase 6: Security and Tests - Research

**Researched:** 2026-03-15
**Domain:** Rate limiting (serverless-safe), SSRF protection (IPv6), test suite repair
**Confidence:** HIGH

## Summary

Phase 6 addresses four specific, well-scoped issues: an in-memory rate limiter that resets on serverless cold starts, incomplete SSRF protection missing IPv6 private ranges, pipeline tests calling a removed 3-argument function signature, and an article-generator test asserting the wrong model name.

All four issues have been verified by reading the actual source code. The fixes are straightforward and do not require new external dependencies for SSRF or test fixes. The rate limiter does require a persistent store -- Supabase (already in the stack) is the natural choice, avoiding a new dependency like Upstash Redis.

**Primary recommendation:** Use Supabase as the persistent rate-limit store (simple `rate_limit_hits` table with cleanup), extract `validateUrl` into a shared utility with IPv6 support, and update tests to match current function signatures.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SEC-01 | Rate limiter uses persistent storage that works across serverless instances | Supabase-backed rate limiter replaces in-memory Map; see Architecture Patterns section |
| SEC-02 | SSRF protection blocks IPv6 private/loopback ranges in addition to IPv4 | Shared `validateUrl` utility with full IPv6 coverage; see SSRF section |
| TEST-01 | Pipeline tests use the current function signature and pass | `runPipeline` now takes `(PipelineInput, onProgress)` not `(url, type, callback)`; see Test Fixes section |
| TEST-02 | Article generator test asserts the correct model name (claude-sonnet-4-6) | Line 26 of test asserts `claude-sonnet-4-5`, actual code uses `claude-sonnet-4-6`; see Test Fixes section |
</phase_requirements>

## Standard Stack

### Core (already installed -- no new dependencies needed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.99.1 | Persistent rate-limit storage | Already in stack; avoids adding Upstash Redis |
| Vitest | 4.x | Test runner | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase rate-limit table | Upstash Redis (`@upstash/ratelimit`) | Redis is purpose-built for rate limiting and faster, but adds a new service dependency and billing. Supabase is already deployed and sufficient for 10-15 req/min limits. |
| Custom IPv6 parsing | `ipaddr.js` npm package | External dep for IP parsing. Not needed -- IPv6 private ranges are a finite, well-known set that can be checked with string matching and simple parsing. |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### SEC-01: Persistent Rate Limiter via Supabase

**Current state:** `src/lib/rate-limit.ts` uses an in-memory `Map<string, number[]>` for sliding-window tracking. On Vercel, each cold start creates a fresh `Map`, so the limit resets per instance.

**Approach:** Replace the in-memory store with a Supabase table. The rate limiter writes timestamps to a `rate_limit_hits` table, queries recent hits within the window, and returns the same `{ ok, remaining, retryAfterMs }` interface.

**Schema:**
```sql
CREATE TABLE rate_limit_hits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  identifier text NOT NULL,       -- user ID or "api:{userId}"
  hit_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_hits_lookup
  ON rate_limit_hits (identifier, hit_at DESC);
```

**Cleanup strategy:** A scheduled Supabase cron job (pg_cron) or a `DELETE WHERE hit_at < now() - interval '2 minutes'` run on each `check()` call. Given the low volume (max ~15 users), inline cleanup is fine.

**Key design decisions:**
- The `rateLimit()` factory function keeps the same external API: `{ check(identifier): RateLimitResult }`
- It needs a Supabase admin client (service role) since rate limiting runs before user auth in the API key flow
- The function becomes `async` -- callers already `await` in the route handlers, so this is a minor change
- Use `SUPABASE_SERVICE_ROLE_KEY` (already available in env) to bypass RLS

**Consumers that import `rateLimit`:**
1. `src/app/api/process/route.ts` -- module-level `const limiter = rateLimit(...)`
2. `src/app/api/v1/generate/route.ts` -- module-level `const limiter = rateLimit(...)`
3. `src/app/api/scrape-context/route.ts` -- module-level `const limiter = rateLimit(...)`
4. `src/app/api/scrape-template/route.ts` -- module-level `const limiter = rateLimit(...)`

All four must be updated to pass a Supabase admin client or use a shared admin client within the rate-limit module.

### SEC-02: SSRF IPv6 Protection

**Current state:** `validateUrl` exists as duplicated code in two files:
- `src/app/api/scrape-context/route.ts` (lines 11-51)
- `src/app/api/scrape-template/route.ts` (lines 10-50)

Both block: `localhost`, `127.0.0.1`, `[::1]`, `0.0.0.0`, and IPv4 private ranges (10.x, 172.16-31.x, 192.168.x, 169.254.x, 127.x).

**Missing IPv6 coverage:**
- `::1` (loopback) -- partially covered via string match on `[::1]` but URL parsing may strip brackets
- `::ffff:127.0.0.1` (IPv4-mapped IPv6 loopback)
- `::ffff:10.x.x.x` etc (IPv4-mapped private ranges)
- `fc00::/7` (unique local addresses, i.e., `fc00::` through `fdff::`)
- `fe80::/10` (link-local)
- `::` (unspecified address)
- `100::/64` (discard prefix)
- `2001:db8::/32` (documentation range)

**Approach:** Extract `validateUrl` into `src/lib/url-validation.ts` as a shared utility. Add IPv6 checks by:
1. Stripping brackets from hostnames (URL API gives `[::1]` as hostname for IPv6)
2. Expanding and normalizing IPv6 addresses
3. Checking against the known private/reserved IPv6 prefixes
4. Checking for IPv4-mapped IPv6 (prefix `::ffff:`) and re-validating the embedded IPv4

**Pattern for IPv6 private range detection:**
```typescript
function isPrivateIPv6(hostname: string): boolean {
  // Strip brackets that URL API adds
  const ip = hostname.replace(/^\[|\]$/g, '');

  // Loopback
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;

  // Unspecified
  if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;

  const lower = ip.toLowerCase();

  // Unique local (fc00::/7)
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

  // Link-local (fe80::/10)
  if (lower.startsWith('fe80:') || lower.startsWith('fe80')) return true;

  // IPv4-mapped (::ffff:x.x.x.x) -- extract IPv4 and check
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) {
    return isPrivateIPv4(v4mapped[1]);
  }

  // Documentation (2001:db8::/32)
  if (lower.startsWith('2001:db8:') || lower.startsWith('2001:0db8:')) return true;

  // Discard (100::/64)
  if (lower.startsWith('100::')) return true;

  return false;
}
```

### TEST-01: Pipeline Test Signature Fix

**Current state:** `pipeline.test.ts` imports and calls:
```typescript
import { runPipeline } from '@/lib/pipeline';
// Called as:
await runPipeline(url, 'how-to', callback);  // 3 args: string, string, function
```

**Actual signature:**
```typescript
export async function runPipeline(
  input: PipelineInput,  // { videoUrl?, transcript?, template }
  onProgress: (event: ProgressEvent) => void
): Promise<void>
```

The test also mocks `generateArticle` (legacy single-step function) but the pipeline now calls `generateDraft` + `generateStructured` (two-step).

Additionally, the test mocks `transcribeVideo` from `@/lib/transcription`, but pipeline imports `transcribeVideo` and `preprocessTranscript` -- both need mocking.

**Required changes:**
1. Change call signature from `(url, 'how-to', callback)` to `({ videoUrl: url, template: 'how-to' }, callback)` -- BUT `runPipeline` legacy wrapper actually calls `runPhaseA` with dynamic import of templates. Tests should mock `generateDraft` and `generateStructured` instead of `generateArticle`.
2. Update mocks: `@/lib/article-generator` mock should export `generateDraft` and `generateStructured` (not `generateArticle`)
3. The `resolveLoomUrl` mock return shape looks correct (returns `{ videoUrl, title }`)
4. `transcribeVideo` and `preprocessTranscript` mocks look correct
5. Also need to mock `@/lib/templates/agent2-draft` since `runPipeline` dynamically imports it

**Alternative approach (simpler):** Test `runPhaseA` directly instead of the legacy `runPipeline` wrapper. This tests the actual code path used in production.

### TEST-02: Model Name Assertion Fix

**Current state:** `article-generator.test.ts` line 26:
```typescript
it('calls Anthropic with claude-sonnet-4-5 model', async () => {
  // ...
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      model: expect.stringContaining('claude-sonnet-4-5'),
    })
  );
```

**Actual code:** `const MODEL = 'claude-sonnet-4-6';` in `article-generator.ts` line 3.

**Fix:** Change `claude-sonnet-4-5` to `claude-sonnet-4-6` in the test description and assertion.

**Additional issue:** The test imports and calls `generateArticle` (the legacy function). This still exists and works, so the test structure is valid -- only the model name assertion is wrong.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting | Custom Redis client or KV abstraction | Supabase table + simple SQL | Already have Supabase; adding Redis is unnecessary complexity for this scale |
| IPv6 address parsing | Full RFC 5952 parser | Prefix-based string checks on known private ranges | Only need to identify private/reserved, not fully parse arbitrary IPv6 |
| Test mocking patterns | Custom mock frameworks | Vitest built-in `vi.mock`, `vi.mocked`, `vi.fn` | Already established in the codebase |

## Common Pitfalls

### Pitfall 1: Rate Limiter Async Migration
**What goes wrong:** The current `rateLimit()` returns a sync `check()` function. Making it async (for Supabase queries) changes the call site from `const rl = limiter.check(id)` to `const rl = await limiter.check(id)`.
**Why it happens:** Database calls are inherently async.
**How to avoid:** The `check()` function must return a Promise. All four route handler call sites already run in async contexts, so adding `await` is straightforward.
**Warning signs:** TypeScript will flag if you forget `await` -- the result would be a Promise object (truthy), not the actual `{ ok, remaining }`.

### Pitfall 2: Race Condition in Rate Limiting
**What goes wrong:** Two concurrent requests could both read "9 hits in window" and both insert, resulting in 11 hits.
**How to avoid:** Use a Supabase RPC function that performs the count + insert atomically, or accept the slight over-admission as acceptable for this use case (rate limiting is defense-in-depth, not a billing boundary).
**Recommendation:** Accept the minor race condition. The rate limit is 10 req/min -- even with a race, the worst case is 11-12 getting through, which is fine.

### Pitfall 3: IPv6 URL Parsing Brackets
**What goes wrong:** `new URL('http://[::1]/path')` returns `hostname` as `[::1]` (with brackets). Code that checks `hostname === '::1'` would miss this.
**How to avoid:** Always strip brackets from hostname before IPv6 checks: `hostname.replace(/^\[|\]$/g, '')`.

### Pitfall 4: Pipeline Test Dynamic Import
**What goes wrong:** `runPipeline` does `await import('@/lib/templates/agent2-draft')` inside the function body. If not mocked, Vitest will try to load this module, which may have side effects or missing dependencies.
**How to avoid:** Either mock `@/lib/templates/agent2-draft` or test `runPhaseA` directly (preferred -- it's the production code path).

### Pitfall 5: Supabase Admin Client in Rate Limiter
**What goes wrong:** The rate limiter needs a service-role client to bypass RLS, but creating one requires env vars that may not exist in tests.
**How to avoid:** Accept the Supabase client as a parameter to `rateLimit()`, or use lazy initialization with a fallback for tests.

## Code Examples

### Current pipeline test call (BROKEN)
```typescript
// Source: src/lib/__tests__/pipeline.test.ts lines 54-58
await runPipeline(
  'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
  'how-to',
  (event) => events.push(event)
);
```

### Fixed pipeline test call (using runPhaseA directly)
```typescript
import { runPhaseA } from '@/lib/pipeline';

vi.mock('@/lib/article-generator', () => ({
  generateDraft: vi.fn(),
  generateStructured: vi.fn(),
}));

// Call with PhaseAInput object
await runPhaseA(
  {
    videoUrl: 'https://www.loom.com/share/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    draftPrompt: 'Test draft prompt',
    structurePrompt: 'Test structure prompt',
  },
  (event) => events.push(event)
);
```

### Current validateUrl IPv4-only check
```typescript
// Source: src/app/api/scrape-context/route.ts lines 36-48
const ipv4Match = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
if (ipv4Match) {
  const [, a, b] = ipv4Match.map(Number);
  // ... checks IPv4 ranges only
}
// No IPv6 checks beyond literal [::1]
```

### Rate limiter Supabase check pattern
```typescript
async function check(identifier: string): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - interval);

  // Count hits in window
  const { count } = await supabase
    .from('rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('identifier', identifier)
    .gte('hit_at', windowStart.toISOString());

  const hitCount = count ?? 0;

  if (hitCount >= tokens) {
    return { ok: false, remaining: 0, retryAfterMs: interval };
  }

  // Record this hit
  await supabase.from('rate_limit_hits').insert({
    identifier,
    hit_at: now.toISOString(),
  });

  // Cleanup old entries (non-blocking)
  supabase
    .from('rate_limit_hits')
    .delete()
    .lt('hit_at', windowStart.toISOString())
    .then(() => {});

  return { ok: true, remaining: tokens - hitCount - 1, retryAfterMs: 0 };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateArticle` (single step) | `generateDraft` + `generateStructured` (two-step) | v1.0 multi-agent pipeline | Tests still reference old single-step function |
| `runPipeline(url, type, cb)` | `runPipeline({ videoUrl, template }, cb)` then `runPhaseA(PhaseAInput, cb)` | v1.0 refactor | Tests use old 3-arg signature |
| `claude-sonnet-4-5` | `claude-sonnet-4-6` | Model upgrade | Test assertion outdated |

## Open Questions

1. **Rate limit cleanup strategy**
   - What we know: Inline DELETE on each check works fine at low scale
   - What's unclear: Whether pg_cron is enabled on this Supabase project
   - Recommendation: Use inline cleanup; if pg_cron is available, add a scheduled cleanup as a bonus

2. **Should `validateUrl` also be applied to video URLs in `/api/process`?**
   - What we know: SSRF protection currently only covers scrape-context and scrape-template routes
   - What's unclear: Whether video URLs (Loom, YouTube, GDrive) could be SSRF vectors
   - Recommendation: Out of scope for SEC-02 (which specifically targets the existing validateUrl gaps), but worth noting as a future consideration

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | Rate limiter persists across instances (uses Supabase) | unit | `npx vitest run src/lib/__tests__/rate-limit.test.ts -x` | No -- Wave 0 |
| SEC-02 | IPv6 private/loopback addresses rejected | unit | `npx vitest run src/lib/__tests__/url-validation.test.ts -x` | No -- Wave 0 |
| TEST-01 | Pipeline tests pass with current signature | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts -x` | Yes (broken) |
| TEST-02 | Article generator test asserts claude-sonnet-4-6 | unit | `npx vitest run src/lib/__tests__/article-generator.test.ts -x` | Yes (wrong assertion) |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/rate-limit.test.ts` -- covers SEC-01 (mock Supabase client, verify check returns 429 after N hits)
- [ ] `src/lib/__tests__/url-validation.test.ts` -- covers SEC-02 (test IPv6 loopback, fc00::, fe80::, ::ffff:10.x, etc.)

## Sources

### Primary (HIGH confidence)
- Direct source code reading of all affected files (rate-limit.ts, pipeline.ts, article-generator.ts, scrape-context/route.ts, scrape-template/route.ts, pipeline.test.ts, article-generator.test.ts)
- `vitest.config.ts` and `package.json` for framework and dependency versions

### Secondary (MEDIUM confidence)
- IPv6 private/reserved ranges from RFC 4193 (fc00::/7), RFC 4291 (::1, ::), RFC 3927/4291 (fe80::/10), RFC 4291 (::ffff:0:0/96 mapped)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, using existing Supabase
- Architecture: HIGH - all changes verified against actual source code
- Pitfalls: HIGH - identified from direct code reading, not hypothetical
- Test fixes: HIGH - exact line numbers and mismatches documented

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable -- no fast-moving dependencies)
