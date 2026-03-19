---
phase: 11-full-qa-suite-vitest-expansion-and-playwright-e2e-tests
plan: 03
subsystem: testing
tags: [playwright, e2e, chromium, auth, coverage]

requires:
  - phase: none
    provides: existing Next.js app with auth middleware
provides:
  - Playwright E2E infrastructure with Chromium
  - Auth helper for cookie injection
  - Login page E2E tests (3 tests)
  - Articles page E2E tests (2 tests)
  - Vitest v8 coverage configuration
affects: []

tech-stack:
  added: ["@playwright/test", "@vitest/coverage-v8"]
  patterns: [webServer config for Next.js, Supabase auth cookie injection, context.addCookies]

key-files:
  created:
    - playwright.config.ts
    - e2e/login.spec.ts
    - e2e/articles.spec.ts
    - e2e/helpers/auth.ts
  modified:
    - vitest.config.ts
    - package.json
    - .gitignore

key-decisions:
  - "Used input[type=email] and button[type=submit] selectors instead of getByRole since login page inputs lack aria labels"
  - "Auth helper uses Supabase admin API to create test user and inject session cookies"
  - "Set kbpipe-onboarded cookie to bypass onboarding redirect in E2E tests"
  - "Chromium-only for now, can add Firefox/WebKit later"

patterns-established:
  - "E2E auth: loginAsTestUser(context) injects sb-{ref}-auth-token + kbpipe-onboarded cookies"
  - "Playwright webServer: reuse existing dev server locally, start fresh in CI"

requirements-completed: [E2E-01, E2E-02, E2E-03, E2E-04]

duration: 4min
completed: 2026-03-19
---

# Phase 11 Plan 03: Playwright E2E Setup Summary

**Playwright installation, configuration, auth helper, and foundational E2E tests for login and articles pages**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files created:** 4
- **Files modified:** 3

## Accomplishments
- Playwright installed with Chromium browser
- playwright.config.ts with webServer (npm run dev), baseURL, trace on retry
- Vitest v8 coverage configured with include/exclude patterns
- npm scripts: test:e2e and test:coverage added
- Auth helper using Supabase admin API for session cookie injection
- 3 login E2E tests: redirect to /landing, email input visible, submit button visible
- 2 articles E2E tests: authenticated access without redirect, article list or empty state renders

## Task Commits

1. **Task 1: Playwright + coverage infrastructure** - `cf0865c` (chore)
2. **Task 2: Auth helper + E2E tests** - committed with fixes below

## Files Created/Modified
- `playwright.config.ts` - Chromium project, webServer, baseURL, trace
- `e2e/helpers/auth.ts` - loginAsTestUser with Supabase admin cookie injection
- `e2e/login.spec.ts` - 3 tests for unauthenticated login page
- `e2e/articles.spec.ts` - 2 tests for authenticated articles page
- `vitest.config.ts` - added v8 coverage configuration
- `package.json` - added @playwright/test, @vitest/coverage-v8, test scripts
- `.gitignore` - added playwright-report/, test-results/, coverage/

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed login page selectors**
- **Issue:** Login page inputs lack aria-label/label attributes, getByRole fails
- **Fix:** Changed to input[type="email"] and button[type="submit"] selectors
- **Verification:** Tests pass with correct selectors

## Issues Encountered
- E2E tests require running dev server and Supabase credentials — these are integration tests that need environment setup

---
*Phase: 11-full-qa-suite-vitest-expansion-and-playwright-e2e-tests*
*Completed: 2026-03-19*
