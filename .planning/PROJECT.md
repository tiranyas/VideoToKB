# VideoToKB

## What This Is

VideoToKB is a web-based pipeline tool that converts video recordings (Loom, YouTube, Google Drive) into structured knowledge base articles ready for publishing. Users paste a video URL, choose a template, and receive a formatted article that needs less than 15 minutes of editing before publishing to their existing KB platform (Helpjuice, Zendesk, Freshdesk, Document360, etc.).

## Core Value

A user can take a video recording and get back a publish-ready KB article in minutes instead of days — the tool is a content pipeline, not a KB replacement.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can paste a Loom, YouTube, or Google Drive video URL and submit it for processing
- [ ] User can select an article template (How-to, Feature Explainer, Troubleshooting, Onboarding)
- [ ] System transcribes video via AssemblyAI with timestamps
- [ ] System generates structured KB article via Claude API (claude-sonnet-4-5) based on transcript + template
- [ ] User sees step-by-step progress during processing (Downloading → Transcribing → Writing → Done)
- [ ] User can view the generated article in an editable text area
- [ ] User can copy article as Markdown
- [ ] User can copy article as HTML
- [ ] User can export article as Google Doc
- [ ] Guest users get 3 free articles tracked via localStorage
- [ ] Video input limited to 15 minutes max for MVP
- [ ] User can go back and generate another article after viewing results

### Out of Scope

- Authentication/login — deferred to Week 3
- Payments/Stripe — deferred to post-MVP
- Dashboard/history — deferred to later
- Direct KB API integrations (Helpjuice, Zendesk) — v2
- Auto style detection from existing articles — v2
- Team management / multi-user — v2
- Chrome Extension — v2
- Video file upload (only URLs for now)

## Context

- **POC validated:** Head of Ops at FinBot built a manual pipeline (AssemblyAI → Claude → CSS templating) that produced 200+ articles in Helpjuice, saving 100K+ NIS/year
- **Target audience:** Head of Support / Head of Operations at Israeli B2B SaaS companies (20-150 employees)
- **Pain point:** Backlog of training/product update recordings that nobody converts to written documentation
- **Market gap:** No dedicated tool converts existing video recordings into structured KB articles formatted for the user's existing KB platform
- **Pricing model (future):** Credit-based, pay-per-use — 3 free, then $19/10, $49/30, $129/100 articles. ~$0.15 production cost per article, ~90% gross margin

## Constraints

- **Tech stack:** Next.js (frontend + API routes), Vercel (hosting), Supabase (DB/auth later), AssemblyAI (transcription), Claude API claude-sonnet-4-5 (writing)
- **No auth for MVP:** All API keys server-side via .env.local, guest usage tracked client-side
- **Video length:** Max 15 minutes for MVP (cost control)
- **Language:** PRD is in Hebrew but product UI is in English
- **Dependencies:** Must ask before adding any dependency not listed in stack

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pipeline tool, not KB replacement | Users already have KB platforms — meet them where they are | — Pending |
| No auth for MVP | Reduce friction, validate core value first | — Pending |
| 15-min video cap | Cost control during validation phase | — Pending |
| localStorage for free tier tracking | Simplest approach, no backend needed for guest limits | — Pending |
| 4 templates for MVP | Covers main KB article types without overcomplicating | — Pending |
| Google Doc export in v1 | Users need to share/collaborate on drafts before publishing | — Pending |
| Step progress during processing | ~3 min wait needs user confidence the pipeline is working | — Pending |

---
*Last updated: 2026-03-12 after initialization*
