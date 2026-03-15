---
phase: 6
slug: security-and-tests
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SEC-01 | unit | `npx vitest run src/lib/__tests__/rate-limit.test.ts` | No - W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SEC-02 | unit | `npx vitest run src/lib/__tests__/url-validation.test.ts` | No - W0 | ⬜ pending |
| 06-02-01 | 02 | 1 | TEST-01 | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts` | Yes (broken) | ⬜ pending |
| 06-02-02 | 02 | 1 | TEST-02 | unit | `npx vitest run src/lib/__tests__/article-generator.test.ts` | Yes (wrong) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/rate-limit.test.ts` — stubs for SEC-01 (mock Supabase client, verify check returns 429 after N hits)
- [ ] `src/lib/__tests__/url-validation.test.ts` — stubs for SEC-02 (test IPv6 loopback, fc00::, fe80::, ::ffff:10.x)

*Existing test files for TEST-01 and TEST-02 exist but need fixes, not stubs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limiter works across cold starts | SEC-01 | Requires multiple Vercel instances | Deploy, hit rate limit, wait for cold start, verify still limited |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
