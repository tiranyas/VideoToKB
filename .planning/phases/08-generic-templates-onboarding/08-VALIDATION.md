---
phase: 8
slug: generic-templates-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-18
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | SC-5,SC-6 | unit | `npx vitest run src/lib/__tests__/template-neutralization.test.ts` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | SC-1,SC-2 | manual | Browser test: signup → /onboarding redirect | N/A | ⬜ pending |
| 08-02-02 | 02 | 1 | SC-3 | manual | Browser test: skip onboarding → homepage | N/A | ⬜ pending |
| 08-02-03 | 02 | 1 | SC-4 | manual | Browser test: complete all steps → workspace populated | N/A | ⬜ pending |
| 08-03-01 | 03 | 2 | SC-5,SC-6,SC-7 | unit | `npx vitest run src/lib/__tests__/branding-injection.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/template-neutralization.test.ts` — verify no #6d28d9 in any built-in template
- [ ] `src/lib/__tests__/branding-injection.test.ts` — verify {{placeholder}} replacement with branding colors

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Onboarding wizard flow | SC-1, SC-2, SC-3 | Full-page UI wizard with navigation | Sign up → verify redirect → complete/skip each step |
| Brand extraction from URL | SC-4 | Requires live HTTP scraping | Paste real company URL → verify context + colors extracted |
| Platform card selection | SC-4 | Visual UI interaction | Select platform card → verify workspace default updated |
| Article URL scraping in wizard | SC-4 | Requires live HTTP scraping | Paste article URL → verify iframe preview + template saved |
| Generated HTML uses neutral colors | SC-5, SC-6, SC-7 | End-to-end generation test | Generate article without branding → verify no #6d28d9 in output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
