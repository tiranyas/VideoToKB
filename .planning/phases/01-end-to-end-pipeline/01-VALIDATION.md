---
phase: 1
slug: end-to-end-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (latest, compatible with Next.js 16) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 0 | VINP-01 | unit | `npx vitest run src/lib/__tests__/loom-resolver.test.ts -t "loom"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01 | 0 | TRNS-01, TRNS-02 | unit | `npx vitest run src/lib/__tests__/transcription.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01 | 0 | GENR-02 | unit | `npx vitest run src/lib/__tests__/article-generator.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-04 | 01 | 0 | PRUX-01, PRUX-03 | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | VINP-01 | unit | `npx vitest run src/lib/__tests__/loom-resolver.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-02 | 02 | 1 | TRNS-01, TRNS-02 | unit+integration | `npx vitest run src/lib/__tests__/transcription.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-03 | 02 | 1 | GENR-02 | unit+integration | `npx vitest run src/lib/__tests__/article-generator.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | PRUX-01, PRUX-02, PRUX-03 | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 3 | UILP-01, UILP-02 | manual | Visual inspection | N/A | ⬜ pending |
| 01-04-02 | 04 | 3 | OUTP-01 | manual | Visual inspection | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest configuration for Next.js project
- [ ] `src/lib/__tests__/loom-resolver.test.ts` — Loom URL parsing and CDN URL extraction tests
- [ ] `src/lib/__tests__/transcription.test.ts` — Transcript preprocessing tests (unit) + AssemblyAI integration (mocked)
- [ ] `src/lib/__tests__/article-generator.test.ts` — Claude API integration tests (mocked)
- [ ] `src/lib/__tests__/pipeline.test.ts` — Pipeline orchestrator tests (progress events, error handling)
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Homepage layout (centered input, template dropdown, submit button) | UILP-01 | Visual layout verification | Open homepage, confirm single centered input, dropdown with 4 templates, "Create Article" button |
| No navigation/login/dashboard | UILP-02 | Visual absence verification | Open homepage, confirm no nav bar, no login, no sidebar |
| Article in editable textarea | OUTP-01 | UI interaction verification | Complete pipeline, confirm article appears in textarea, verify text is editable |
| SSE stream works end-to-end | PRUX-02 | Requires real Vercel deployment | Deploy to Vercel, submit Loom URL, confirm progress updates stream in real time |
| Deployed pipeline works on Vercel | SC-05 | Full deployment test | Deploy, submit real Loom URL, confirm article generation completes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
