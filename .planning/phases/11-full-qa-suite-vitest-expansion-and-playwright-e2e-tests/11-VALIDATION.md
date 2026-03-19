---
phase: 11
slug: full-qa-suite-vitest-expansion-and-playwright-e2e-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 + Playwright ~1.58 |
| **Config file** | `vitest.config.ts` (exists), `playwright.config.ts` (Wave 0) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx playwright test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run && npx playwright test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | TEST-03 | unit | `npx vitest run src/lib/__tests__/youtube-resolver.test.ts -x` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | TEST-04 | unit | `npx vitest run src/lib/__tests__/gdrive-resolver.test.ts -x` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 1 | TEST-05 | integration | `npx vitest run src/app/api/__tests__/ -x` | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 2 | E2E | e2e | `npx playwright test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D @playwright/test @vitest/coverage-v8` — new dev dependencies
- [ ] `npx playwright install chromium` — browser binaries
- [ ] `playwright.config.ts` — Playwright configuration
- [ ] `e2e/` directory — E2E test directory
- [ ] `src/lib/__tests__/youtube-resolver.test.ts` — stub for TEST-03
- [ ] `src/lib/__tests__/gdrive-resolver.test.ts` — stub for TEST-04
- [ ] `src/app/api/__tests__/` directory — stubs for TEST-05

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Auth flow E2E | E2E login | Supabase magic-link requires email | Verify cookie injection approach works locally |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
