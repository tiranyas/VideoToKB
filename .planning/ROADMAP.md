# Roadmap: KBPipe

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (complete)
- ✅ **v1.1 Stabilization** - Phases 6-7 (complete)
- 🚧 **v2.0 Onboarding & Multi-Platform** - Phases 8-10 (in progress)

## Phases

### ✅ v1.0 MVP (Complete)

**Milestone Goal:** A deployed SaaS that converts video recordings into publish-ready KB articles across multiple sources, export formats, and usage controls.

**Status:** All core features deployed and running in production. Minor gaps remain (duration limit, speaker diarization, tags/description metadata) — moved to Active requirements for future work.

#### Phase 1: End-to-End Pipeline ✅
**Status**: Complete (core pipeline working in production)

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, shared types, test infrastructure
- [x] 01-02-PLAN.md — Backend pipeline services
- [x] 01-03-PLAN.md — Frontend UI
- [~] 01-04-PLAN.md — Vercel deployment (skipped — deployed organically)

#### Phase 2: Multi-Source Video Input ✅
**Status**: Complete — YouTube, Google Drive, URL validation with SSRF protection

#### Phase 3: Templates and Generation Quality ✅
**Status**: Complete — 2 built-in + custom article types, title extraction

#### Phase 4: Export Formats ✅
**Status**: Complete — Markdown, HTML, code clipboard + Word (.docx) export

#### Phase 5: Usage Control and Polish ✅
**Status**: Complete — quota enforcement, responsive UI, stateful navigation

---

### ✅ v1.1 Stabilization (Complete)

**Milestone Goal:** Production-reliable — persistent rate limiting, SSRF protection, passing tests, DB-level stats, shared SSE parser.

#### Phase 6: Security and Tests ✅
Plans:
- [x] 06-01-PLAN.md — Persistent rate limiter + IPv6 SSRF protection
- [x] 06-02-PLAN.md — Fix test signatures and model assertions

#### Phase 7: Performance and Cleanup ✅
Plans:
- [x] 07-01-PLAN.md — DB aggregation for dashboard stats + shared SSE utility

---

### 🚧 v2.0 Onboarding & Multi-Platform (In Progress)

**Milestone Goal:** New users get a guided onboarding that captures their brand, platform, and style reference — so the very first article matches their KB. Platform templates are generic (not FinBot-branded), and we support Zendesk and Intercom in addition to existing platforms.

**Research:** `.planning/research/platform-templates-research.md` (2026-03-18)

#### Phase 8: Generic Templates & Onboarding
**Goal**: New users go through a guided setup that captures their brand/context/platform/style before generating their first article. Default templates use neutral colors instead of FinBot branding.
**Depends on**: v1.1 (complete)
**Success Criteria** (what must be TRUE):
  1. A new user who signs up sees an onboarding flow before reaching the article generator
  2. Onboarding collects: workspace name, company website URL (for branding/context scrape), KB platform selection, and optional existing article URL (for style scraping)
  3. Onboarding is skippable — user can skip and return to it later from settings
  4. After onboarding, the workspace has: company context populated, branding colors extracted from website, platform profile selected, and (if article URL provided) a custom HTML template scraped from their existing article
  5. The default Helpjuice template uses neutral blue (`#2563eb`) instead of FinBot purple (`#6d28d9`) as the accent color fallback
  6. The Generic HTML template uses neutral colors throughout
  7. A user who skips onboarding and generates an article gets a clean, professionally-styled result with no FinBot-specific colors
**Plans**: 5 plans

Plans:
- [x] 08-01-PLAN.md — Template neutralization + branding placeholder system
- [x] 08-02-PLAN.md — Zendesk and Intercom platform templates
- [x] 08-03-PLAN.md — Onboarding data model (migration + types + queries)
- [ ] 08-04-PLAN.md — Onboarding wizard UI (4-step wizard)
- [ ] 08-05-PLAN.md — Middleware wiring + navigation integration

#### Phase 9: More Platforms (Zendesk, Intercom)
**Goal**: Users on Zendesk Help Center or Intercom can select their platform and get articles formatted with the correct HTML structure and CSS classes for that platform. All 7 platform templates produce correct, paste-ready output.
**Depends on**: Phase 8
**Success Criteria** (what must be TRUE):
  1. User can select "Zendesk Help Center" as their platform and get HTML using Zendesk-compatible classes (`article-body`, `c-callout--info/warning/tip`, `wysiwyg-table`, semantic HTML with CSS classes instead of inline styles)
  2. User can select "Intercom" as their platform and get clean HTML using only Intercom-allowed tags (h1, h2, p, ul, ol, table, img, a, hr, pre/code) with Intercom-specific classes (`intercom-align-center`, `intercom-h2b-button`)
  3. Intercom output does NOT contain any tags that Intercom's API strips (no div, span, style, script, or custom attributes)
  4. Each platform's template produces output that can be pasted into that platform's editor and render correctly without manual cleanup
  5. Platform selection in onboarding includes all supported platforms: Generic HTML, Helpjuice, Zendesk, Intercom, Confluence, Notion, Markdown
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Harden Intercom/Zendesk prompts + edge-case tests + registry guard

#### Phase 10: Shared Workspaces & Team Access
**Goal**: Multiple team members can access the same workspace, with role-based permissions and invite-link system. Workspace quota inherits owner's plan.
**Depends on**: Phase 9
**Requirements**: [TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05]
**Success Criteria** (what must be TRUE):
  1. Workspace owner can invite team members by email
  2. Invited members can accept and access the shared workspace
  3. Members see shared articles, settings, and platform profiles
  4. Owner can remove members from the workspace
  5. Team subscription allows higher article quota than individual free tier
**Plans**: 4 plans

Plans:
- [ ] 10-01-PLAN.md — Database migration (team tables, RLS, helper functions, backfill)
- [ ] 10-02-PLAN.md — Query layer + workspace context (membership-based access)
- [ ] 10-03-PLAN.md — Invite system (API route + accept page)
- [ ] 10-04-PLAN.md — Team settings UI + end-to-end verification

---

### Phase 11: Full QA Suite — Vitest expansion and Playwright E2E tests

**Goal:** Expand test coverage to untested resolvers and API routes (Vitest), install Playwright with Chromium-only E2E tests covering login redirect and page rendering, and add v8 coverage reporting.
**Requirements**: [TEST-03, TEST-04, TEST-05, TEST-06, E2E-01, E2E-02, E2E-03, E2E-04]
**Depends on:** Phase 10
**Plans:** 3/3 plans complete

Plans:
- [ ] 11-01-PLAN.md — YouTube + Google Drive resolver unit tests
- [ ] 11-02-PLAN.md — API key utilities + API route integration tests
- [ ] 11-03-PLAN.md — Playwright setup + login/articles E2E tests

---

### Phase 12: Auth overhaul: remove magic link, add password reset and Google SSO

**Goal:** Remove magic link authentication (causing client confusion), add a password reset flow via Supabase email, and implement Google SSO with automatic account linking. The login page becomes a clean email/password + Google SSO experience with inline forgot/reset password forms.
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09]
**Depends on:** Phase 11
**Plans:** 3 plans

Plans:
- [x] 12-01-PLAN.md — Auth confirm route + middleware updates for password reset flow
- [ ] 12-02-PLAN.md — Login page rewrite (remove magic link, add Google SSO + password reset)
- [ ] 12-03-PLAN.md — External dashboard configuration + end-to-end verification

---

## Progress

| Phase | Milestone | Status | Completed |
|-------|-----------|--------|-----------|
| 1. End-to-End Pipeline | v1.0 | ✅ Complete | 2026-03-12 |
| 2. Multi-Source Video Input | v1.0 | ✅ Complete | pre-existing |
| 3. Templates and Generation Quality | v1.0 | ✅ Complete | pre-existing |
| 4. Export Formats | v1.0 | ✅ Complete | pre-existing |
| 5. Usage Control and Polish | v1.0 | ✅ Complete | pre-existing |
| 6. Security and Tests | v1.1 | ✅ Complete | 2026-03-15 |
| 7. Performance and Cleanup | v1.1 | ✅ Complete | 2026-03-15 |
| 8. Generic Templates & Onboarding | 4/5 | In Progress|  |
| 9. More Platforms (Zendesk, Intercom) | v2.0 | Planned | - |
| 10. Shared Workspaces & Team Access | v2.0 | Planned | - |
| 11. Full QA Suite | 3/3 | Complete    | 2026-03-19 |
| 12. Auth Overhaul | 1/3 | In Progress | - |

## Known Gaps (carried from v1.0/v1.1)

- Video duration limit (15 min)
- Speaker diarization
- Tags/description metadata in articles
- Regenerate from edited text without re-transcription
- rate-limit.ts TypeScript build error

---
*Roadmap created: 2026-03-12*
*Last updated: 2026-03-22 — Phase 12 plan 01 complete*
