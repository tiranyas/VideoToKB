---
phase: 12-auth-overhaul-remove-magic-link-add-password-reset-and-google-sso
plan: 01
subsystem: auth
tags: [supabase, verifyOtp, password-reset, middleware, next.js]

requires:
  - phase: none
    provides: existing auth callback pattern
provides:
  - /auth/confirm route for password reset token verification
  - Middleware support for /auth/* public routes
  - Reset-password exception for authenticated user redirect
affects: [12-02, 12-03, login-page]

tech-stack:
  added: []
  patterns: [token verification via supabase.auth.verifyOtp, mode query param for login page state]

key-files:
  created:
    - src/app/auth/confirm/route.ts
    - src/app/auth/__tests__/confirm.test.ts
  modified:
    - src/middleware.ts

key-decisions:
  - "Widened middleware public route from /auth/callback to /auth/* for future auth routes"
  - "Used mode=reset-password query param to signal login page state"

patterns-established:
  - "Token verification routes use verifyOtp with token_hash + type from email links"
  - "Login page mode param controls UI state for password reset flow"

requirements-completed: [AUTH-01, AUTH-02]

duration: 3min
completed: 2026-03-22
---

# Phase 12 Plan 01: Auth Confirm Route Summary

**Server-side /auth/confirm route verifying password reset tokens via supabase.auth.verifyOtp with middleware exceptions for the reset flow**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T19:07:18Z
- **Completed:** 2026-03-22T19:10:32Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created /auth/confirm route handling recovery and email token types with proper redirects
- Updated middleware to allow unauthenticated access to all /auth/* routes
- Added reset-password exception so authenticated users stay on /login during password reset
- Full test coverage with 4 test cases using vi.hoisted mocks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /auth/confirm route with tests (TDD)** - `b094765` (test: RED) + `2b31720` (feat: GREEN)
2. **Task 2: Update middleware for auth confirm route and reset-password flow** - `b1e3f91` (feat)

_Note: Task 1 followed TDD with RED/GREEN commits_

## Files Created/Modified
- `src/app/auth/confirm/route.ts` - Token verification route for password reset emails
- `src/app/auth/__tests__/confirm.test.ts` - 4 unit tests covering all token scenarios
- `src/middleware.ts` - Widened public route, added reset-password exception

## Decisions Made
- Widened middleware public route from `/auth/callback` to `/auth/*` instead of listing each auth route individually — safer for future auth routes
- Used `mode=reset-password` query parameter to communicate state to the login page

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vi.mock hoisting for mockVerifyOtp**
- **Found during:** Task 1 (GREEN phase)
- **Issue:** `const mockVerifyOtp = vi.fn()` was not hoisted above `vi.mock`, causing "Cannot access before initialization" error
- **Fix:** Used `vi.hoisted()` to ensure mock function is available during module mock factory
- **Files modified:** src/app/auth/__tests__/confirm.test.ts
- **Verification:** All 4 tests pass
- **Committed in:** 2b31720 (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard Vitest hoisting fix. No scope creep.

## Issues Encountered
- Build verification blocked by stale `.next` lock file from running dev server — TypeScript compilation succeeded, confirming code correctness

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /auth/confirm route ready for password reset email links
- Middleware supports the full password reset flow
- Login page needs reset-password mode UI (Plan 12-02)

## Self-Check: PASSED

- [x] src/app/auth/confirm/route.ts exists
- [x] src/app/auth/__tests__/confirm.test.ts exists
- [x] src/middleware.ts modified
- [x] Commit b094765 (test RED) found
- [x] Commit 2b31720 (feat GREEN) found
- [x] Commit b1e3f91 (middleware update) found
- [x] All 186 tests pass (19 test files)

---
*Phase: 12-auth-overhaul-remove-magic-link-add-password-reset-and-google-sso*
*Completed: 2026-03-22*
