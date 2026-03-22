---
phase: 12
slug: auth-overhaul-remove-magic-link-add-password-reset-and-google-sso
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-22
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run src/app/auth/__tests__/confirm.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | AUTH-01 | unit | `npx vitest run src/app/auth/__tests__/confirm.test.ts` | ❌ W0 | ⬜ pending |
| 12-01-02 | 01 | 1 | AUTH-02 | unit | `npx vitest run src/app/auth/__tests__/confirm.test.ts` | ❌ W0 | ⬜ pending |
| 12-02-01 | 02 | 1 | - | manual | Login page renders without magic link | N/A | ⬜ pending |
| 12-03-01 | 03 | 2 | - | manual | Google SSO button triggers OAuth flow | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/auth/__tests__/confirm.test.ts` — stubs for auth confirm route handler (recovery token verification)
- [ ] Login page is a client-side React component — UI verification via manual smoke test, not unit tests

*Existing Vitest infrastructure covers unit test needs. No new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login page renders correctly without magic link | AUTH-UI | Client-side React component with Supabase client calls | Load /login, verify no magic link toggle, verify Google button and email/password form |
| Google SSO redirects to Google consent screen | AUTH-GOOGLE | Requires real Google OAuth credentials | Click "Continue with Google", verify redirect |
| Password reset email is received | AUTH-RESET | Requires real email delivery | Submit reset form, check email, click link |
| Password reset completes and auto-signs-in | AUTH-RESET | End-to-end flow with email + session | Complete reset flow, verify redirect to app |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
