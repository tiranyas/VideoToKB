# Concerns

## Technical Debt

| Issue | Location | Impact |
|-------|----------|--------|
| In-memory rate limiter resets on cold start | `src/lib/rate-limit.ts` | Rate limiting ineffective in serverless — no real protection |
| Duplicated admin Supabase singleton pattern | `src/lib/supabase/server.ts`, API routes | Inconsistent admin client initialization |
| Legacy `runPipeline` function signature mismatch | `src/lib/pipeline.ts`, tests | Tests call old 3-arg signature that no longer exists |
| Unused `getWorkspace` query lacks ownership guards | `src/lib/supabase/queries.ts` | Could expose workspace data if used |
| Race condition in quota period-reset logic | Quota handling code | Concurrent requests could bypass quota limits |
| Company context string built identically in 3 places | Article generation templates | Violation of DRY, maintenance burden |
| 12 suppressed React hook exhaustive-deps warnings | Various components | Potential stale closure bugs |

## Known Bugs

| Bug | Location | Severity |
|-----|----------|----------|
| Pipeline tests call removed function signature | `src/lib/__tests__/pipeline.test.ts` | Medium — tests fail |
| Article generator test asserts wrong model name | `src/lib/__tests__/article-generator.test.ts` | Low — test inaccuracy |
| Article deletion has no confirmation dialog | Article management UI | Medium — accidental data loss |

## Security Concerns

| Issue | Location | Risk |
|-------|----------|------|
| Incomplete SSRF protection (IPv6 private ranges not blocked) | URL validation logic | High — server can be tricked into hitting internal services |
| Data export returns raw `SELECT *` rows | `src/app/api/account/export/route.ts` | Medium — may expose internal fields |
| Hardcoded YouTube InnerTube API key in source | `src/lib/youtube-resolver.ts` | Low — it's a public API key, but still a code smell |
| Hardcoded consent cookie values | `src/components/cookie-consent.tsx` | Low |

## Performance

| Issue | Location | Impact |
|-------|----------|--------|
| Dashboard fetches all articles, aggregates in JS | `src/app/dashboard/page.tsx` | Scales poorly — should use DB aggregation |
| New Anthropic client created per request | Article generation flow | Unnecessary object allocation overhead |
| SSE parsing duplicated verbatim in two component files | `src/components/progress-display.tsx`, `src/components/url-form.tsx` | Maintenance burden, inconsistency risk |

## Fragile Areas

| Area | Why It's Fragile |
|------|-----------------|
| Loom HTML scraping | `src/lib/loom-resolver.ts` — relies on Loom's page HTML structure, breaks on any UI change |
| Google Drive unofficial download URLs | `src/lib/gdrive-resolver.ts` — undocumented URL patterns, can break anytime |
| YouTube InnerTube endpoint | `src/lib/youtube-resolver.ts` — undocumented internal API, no stability guarantees |
| Settings page (1101 lines) | `src/app/settings/page.tsx` — monolithic component, hard to maintain |
| Article deletion error handling | No error handling on delete operations |

## Scaling Limits

- No Stripe webhook handler — payment events may not be processed
- No quota increment on save — usage tracking may be inaccurate
- In-memory rate limiter — useless across serverless instances

## Test Gaps

- Zero test coverage on: active pipeline flow, Google Drive resolver, YouTube resolver, all API routes
- Existing tests have signature mismatches with current code
