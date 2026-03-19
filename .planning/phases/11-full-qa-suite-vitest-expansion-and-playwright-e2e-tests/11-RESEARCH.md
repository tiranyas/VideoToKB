# Phase 11: Full QA Suite - Research

**Researched:** 2026-03-19
**Domain:** Testing (Vitest unit/integration expansion + Playwright E2E)
**Confidence:** HIGH

## Summary

KBPipe currently has 12 Vitest test files with 119 passing tests, all in `src/lib/__tests__/`. Coverage is concentrated on library-level units (pipeline orchestration, resolvers, article generator, URL validation, SSE, rate limiting, branding, template neutralization). There are zero tests for API routes, zero tests for React components, zero tests for Supabase query functions, and no E2E tests whatsoever.

Phase 11 expands the test suite in two directions: (1) Vitest unit/integration tests for untested source files (YouTube resolver, Google Drive resolver, API routes, key Supabase queries), and (2) Playwright E2E tests covering the critical user journeys (login, article generation, onboarding, settings). Playwright is not yet installed; the project uses Next.js 16.1.6 with App Router.

**Primary recommendation:** Install Playwright with Chromium-only for E2E, expand Vitest with v8 coverage reporting, and target the highest-value gaps first: API routes and resolvers (Vitest), then login-to-generation flow (Playwright).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.1.0 | Unit/integration tests | Already installed, Next.js official recommendation |
| @playwright/test | ^1.58.0 | E2E browser tests | Next.js official recommendation, single API for all browsers |
| @vitest/coverage-v8 | ^4.1.0 | Coverage reporting | Native V8 coverage, zero config, fast |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vitejs/plugin-react | ^6.0.0 | React component test support | Already installed, needed if adding component tests |
| msw | ^2.x | API mocking for integration tests | Mock Supabase/external APIs in Vitest without hitting real services |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Cypress | Playwright is faster, lighter, Next.js officially recommends both but Playwright has better CI story |
| @vitest/coverage-v8 | istanbul | Istanbul has broader runtime support but v8 is faster and already native to Node |
| msw | vi.mock | vi.mock is simpler for pure unit tests; msw is better for route-handler integration tests that use fetch |

**Installation:**
```bash
npm install -D @playwright/test @vitest/coverage-v8
npx playwright install chromium
```

## Architecture Patterns

### Recommended Test Structure
```
src/
  lib/
    __tests__/          # Existing Vitest unit tests (keep as-is)
      pipeline.test.ts
      article-generator.test.ts
      ...
      youtube-resolver.test.ts    # NEW
      gdrive-resolver.test.ts     # NEW
      api-keys.test.ts            # NEW
  app/
    api/
      __tests__/                  # NEW: API route integration tests
        process.test.ts
        v1-generate.test.ts
e2e/                              # NEW: Playwright E2E tests
  login.spec.ts
  article-generation.spec.ts
  onboarding.spec.ts
  settings.spec.ts
playwright.config.ts              # NEW
```

### Pattern 1: API Route Testing with Vitest
**What:** Test Next.js route handlers by importing the POST/GET function directly and passing a Request object.
**When to use:** For all API routes -- they are plain async functions that accept Request and return Response.
**Example:**
```typescript
// Source: Next.js route handler pattern
import { POST } from '@/app/api/process/route';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  }),
}));

it('returns 401 when no user session', async () => {
  vi.mocked(createClient).mockResolvedValueOnce({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  } as any);

  const req = new Request('http://localhost/api/process', {
    method: 'POST',
    body: JSON.stringify({ phase: 'generate', videoUrl: 'https://loom.com/share/abc' }),
  });

  const res = await POST(req);
  expect(res.status).toBe(401);
});
```

### Pattern 2: Resolver Unit Tests with Fetch Mocking
**What:** Test YouTube/GDrive resolvers by mocking global fetch.
**When to use:** For resolver modules that make HTTP requests to external services.
**Example:**
```typescript
// Source: Existing pattern from loom-resolver.test.ts
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('extractYouTubeId', () => {
  it('extracts ID from standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
});
```

### Pattern 3: Playwright E2E with webServer
**What:** Playwright config that auto-starts Next.js dev server before tests.
**When to use:** All E2E tests.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/testing/playwright
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Pattern 4: Auth Bypass for E2E
**What:** Supabase magic-link auth cannot be tested end-to-end without email access. Use a test helper that sets a session cookie or a test-only auth bypass.
**When to use:** Every E2E test that needs an authenticated user.
**Example:**
```typescript
// e2e/helpers/auth.ts
import { Page } from '@playwright/test';

export async function loginAsTestUser(page: Page) {
  // Option A: Use Supabase admin API to create a session token
  // Option B: Set auth cookies directly via page.context().addCookies()
  // Option C: Use a /api/test-login endpoint (only enabled in test env)
}
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Don't assert on internal state. Test observable behavior (HTTP responses, DOM content).
- **Flaky E2E selectors:** Don't use CSS classes or tag names. Use `data-testid` attributes or accessible roles.
- **Mocking too much in integration tests:** For API route tests, mock only external boundaries (Supabase, Anthropic) -- let the actual route handler logic run.
- **Running E2E in CI without headless mode:** Always default to headless; use `--headed` flag for local debugging only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage collection | Custom instrumentation | `@vitest/coverage-v8` | Native V8 coverage, zero config |
| Browser automation | Puppeteer scripts | `@playwright/test` | Built-in test runner, assertions, parallelization |
| API mocking in E2E | Custom mock servers | Playwright route interception (`page.route()`) | Built into Playwright, no extra deps |
| Test data setup | Manual DB manipulation | Supabase admin client in test fixtures | Consistent, teardown-safe |

**Key insight:** The project already has excellent Vitest patterns established (12 test files). The expansion should follow the same conventions (vi.mock, vi.stubGlobal, describe/it blocks) rather than introducing new patterns.

## Common Pitfalls

### Pitfall 1: Supabase Auth in E2E Tests
**What goes wrong:** Magic-link auth requires email delivery, making E2E tests dependent on an email service.
**Why it happens:** Supabase auth is designed for real users, not automated tests.
**How to avoid:** Create a test-only API route (`/api/test-auth`) gated behind `NODE_ENV === 'test'`, or use Supabase admin API to generate session tokens directly. Alternatively, use `page.context().addCookies()` to inject a valid session cookie.
**Warning signs:** Tests that fail intermittently due to email delivery delays.

### Pitfall 2: SSE Stream Testing
**What goes wrong:** The `/api/process` endpoint returns an SSE stream, not a simple JSON response. Standard request/response assertions don't work.
**Why it happens:** SSE responses are long-lived connections with chunked transfer encoding.
**How to avoid:** For Vitest, mock the pipeline and test the route handler's response status and headers. For E2E, use Playwright's `page.waitForResponse()` or intercept with `page.route()`.
**Warning signs:** Tests that hang waiting for a response to complete.

### Pitfall 3: Next.js Route Handler Imports
**What goes wrong:** Importing route handlers directly in Vitest may fail because they use Next.js server-only APIs (cookies, headers).
**Why it happens:** `createClient()` in route handlers calls `cookies()` from `next/headers`, which is only available in a real request context.
**How to avoid:** Mock `@/lib/supabase/server` entirely. The route handler itself is just an async function -- mock its dependencies, not Next.js internals.
**Warning signs:** "cookies() can only be called in a Server Component" errors during tests.

### Pitfall 4: Playwright Browser Installation in CI
**What goes wrong:** Playwright tests fail in CI because browsers aren't installed.
**Why it happens:** `npx playwright install` downloads ~400MB of browsers and must be cached.
**How to avoid:** Add `npx playwright install chromium` to CI setup steps. Use Chromium-only to minimize download size. Cache `~/.cache/ms-playwright/`.
**Warning signs:** "Executable doesn't exist" errors in CI.

### Pitfall 5: Coverage Thresholds Too Aggressive
**What goes wrong:** Setting 80%+ coverage thresholds causes every PR to fail when adding new uncovered code.
**Why it happens:** New features naturally start with low coverage.
**How to avoid:** Start with no global thresholds. Use per-file thresholds on critical modules only (pipeline.ts, article-generator.ts, url-validation.ts). Increase thresholds gradually.
**Warning signs:** Developers writing meaningless tests just to hit coverage numbers.

## Code Examples

### Vitest Coverage Configuration
```typescript
// vitest.config.ts (updated)
// Source: https://vitest.dev/guide/coverage
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: ['src/lib/__tests__/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html', 'json'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### YouTube Resolver Test (Pure Functions)
```typescript
// src/lib/__tests__/youtube-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { extractYouTubeId, isYouTubeUrl } from '@/lib/youtube-resolver';

describe('extractYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts ID from %s', (url, expected) => {
    expect(extractYouTubeId(url)).toBe(expected);
  });

  it('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull();
  });
});
```

### Playwright Login Flow
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('login page shows email input', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
});
```

## Existing Test Coverage Map

### Currently Tested (12 files, 119 tests)
| File | Test File | Tests | Coverage Area |
|------|-----------|-------|---------------|
| pipeline.ts | pipeline.test.ts | 5 | Phase A orchestration, progress events, error handling |
| article-generator.ts | article-generator.test.ts | 5 | Claude API calls, model name, response parsing |
| loom-resolver.ts | loom-resolver.test.ts | 5 | URL validation, fetch mocking, error codes |
| url-validation.ts | url-validation.test.ts | ~20 | SSRF protection, IPv4/IPv6, protocol checks |
| rate-limit.ts | rate-limit.test.ts | varies | Sliding window, token depletion |
| sse.ts | sse.test.ts | varies | SSE parsing utility |
| workspace-stats.ts | workspace-stats.test.ts | varies | Stats computation |
| transcription.ts | transcription.test.ts | varies | Transcript preprocessing |
| branding.ts | branding.test.ts | varies | Color extraction, branding application |
| zendesk template | zendesk-template.test.ts | varies | Zendesk HTML output |
| intercom template | intercom-template.test.ts | varies | Intercom HTML output |
| template neutralization | template-neutralization.test.ts | varies | Neutral color replacement |

### Untested -- High Priority
| File | Why High Priority | Test Type |
|------|-------------------|-----------|
| youtube-resolver.ts | v2 requirement TEST-03, complex fallback logic | Unit (pure fn) + Unit (mocked fetch) |
| gdrive-resolver.ts | v2 requirement TEST-04, multiple download URL strategies | Unit (mocked fetch) |
| api/process/route.ts | v2 requirement TEST-05, primary user endpoint | Integration (mocked deps) |
| api/v1/generate/route.ts | v2 requirement TEST-05, public API, API key auth | Integration (mocked deps) |
| api-keys.ts | Security-critical, SHA-256 hashing | Unit |

### Untested -- Medium Priority
| File | Why | Test Type |
|------|-----|-----------|
| api/scrape-context/route.ts | Onboarding feature | Integration |
| api/scrape-template/route.ts | Onboarding feature | Integration |
| api/account/delete/route.ts | GDPR compliance | Integration |
| api/account/export/route.ts | GDPR compliance | Integration |
| word-export.ts | User-facing feature | Unit |
| usage-logger.ts | Supports analytics | Unit |

### E2E Journeys (Playwright)
| Journey | Pages Touched | Auth Required |
|---------|---------------|---------------|
| Login redirect | /, /login | No |
| Article generation (happy path) | /, article view | Yes |
| Onboarding flow | /onboarding | Yes |
| Settings page | /settings | Yes |
| Article list + detail | /articles, /articles/[id] | Yes |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest for Next.js | Vitest (official recommendation) | 2024 | Faster, native ESM, Vite-aligned |
| Cypress for E2E | Playwright (co-recommended with Cypress) | 2023 | Better parallelism, lighter, multi-browser |
| istanbul coverage | v8 coverage provider | Vitest 1.x | No instrumentation step, faster |
| Manual coverage collection | `@vitest/coverage-v8` auto-integration | Vitest 2.x | Single config line |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 + Playwright ~1.58 |
| Config file | `vitest.config.ts` (exists), `playwright.config.ts` (Wave 0) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run && npx playwright test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-03 | YouTube resolver coverage | unit | `npx vitest run src/lib/__tests__/youtube-resolver.test.ts -x` | Wave 0 |
| TEST-04 | GDrive resolver coverage | unit | `npx vitest run src/lib/__tests__/gdrive-resolver.test.ts -x` | Wave 0 |
| TEST-05 | API route coverage | integration | `npx vitest run src/app/api/__tests__/ -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `playwright.config.ts` -- Playwright configuration
- [ ] `e2e/` directory -- E2E test directory
- [ ] `npx playwright install chromium` -- browser binaries
- [ ] `npm install -D @playwright/test @vitest/coverage-v8` -- new dev dependencies
- [ ] `src/lib/__tests__/youtube-resolver.test.ts` -- covers TEST-03
- [ ] `src/lib/__tests__/gdrive-resolver.test.ts` -- covers TEST-04
- [ ] `src/app/api/__tests__/` directory -- covers TEST-05

## Open Questions

1. **Auth strategy for E2E tests**
   - What we know: Supabase uses magic-link auth with cookies. No test user exists.
   - What's unclear: Whether to create a test-only auth bypass route or inject cookies directly.
   - Recommendation: Use Supabase admin API to create a test session token in a global setup fixture. Avoid test-only routes in production code.

2. **CI pipeline**
   - What we know: No CI configuration exists in the repo. Playwright needs browser binaries.
   - What's unclear: Whether the user wants CI setup as part of this phase.
   - Recommendation: Defer CI setup. Focus on local test infrastructure. Add npm scripts (`test:e2e`, `test:coverage`).

3. **E2E scope with external APIs**
   - What we know: Article generation calls AssemblyAI and Anthropic. E2E tests against real APIs are slow and expensive.
   - What's unclear: Whether to mock external APIs in E2E or test only navigation/UI flows.
   - Recommendation: E2E tests should verify UI flows only. Use Playwright route interception to mock `/api/process` SSE responses. Do not call real AI APIs in E2E.

## Sources

### Primary (HIGH confidence)
- [Next.js Playwright Guide](https://nextjs.org/docs/app/guides/testing/playwright) - Official setup, webServer config, example tests
- [Next.js Vitest Guide](https://nextjs.org/docs/app/guides/testing/vitest) - Official Vitest recommendation for Next.js
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage) - v8 provider setup, include/exclude patterns
- [Vitest Coverage Config](https://vitest.dev/config/coverage) - Threshold configuration, reporters
- Existing codebase: 12 test files in `src/lib/__tests__/` establishing project patterns

### Secondary (MEDIUM confidence)
- [@playwright/test npm](https://www.npmjs.com/package/@playwright/test) - Version 1.58.2 current as of Feb 2026
- [Playwright Release Notes](https://playwright.dev/docs/release-notes) - Latest features and browser support

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest already in use, Playwright is Next.js official recommendation
- Architecture: HIGH - Existing test patterns are well-established, just expanding coverage
- Pitfalls: HIGH - SSE testing, auth in E2E, and Next.js route handler imports are well-documented issues

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable domain, 30 days)
