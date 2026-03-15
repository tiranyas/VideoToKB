# Roadmap: KBify

## Milestones

- 🚧 **v1.0 MVP** - Phases 1-5 (in progress)
- 📋 **v1.1 Stabilization** - Phases 6-7 (planned)

## Phases

### 🚧 v1.0 MVP (In Progress)

**Milestone Goal:** A deployed SaaS that converts video recordings into publish-ready KB articles across multiple sources, export formats, and usage controls.

#### Phase 1: End-to-End Pipeline
**Goal**: A user can paste a Loom URL, see real-time progress, and view a generated KB article — deployed and working on Vercel, not just local dev
**Depends on**: Nothing (first phase)
**Requirements**: UILP-01, UILP-02, VINP-01, TRNS-01, TRNS-02, GENR-02, PRUX-01, PRUX-02, PRUX-03, OUTP-01
**Success Criteria** (what must be TRUE):
  1. User can paste a Loom share URL on the homepage and submit it for processing
  2. User sees step-by-step progress updates in real time as the pipeline runs (Resolving, Transcribing, Generating, Done)
  3. User sees a specific, actionable error message if any pipeline stage fails
  4. User can view the generated article in an editable text area after processing completes
  5. The entire pipeline works on a Vercel deployment (not just localhost)
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, shared types, test infrastructure (Wave 0)
- [x] 01-02-PLAN.md — Backend pipeline services (Loom resolver, transcription, article generator, SSE API)
- [x] 01-03-PLAN.md — Frontend UI (URL form, progress display, article view, homepage wiring)
- [ ] 01-04-PLAN.md — Vercel deployment and end-to-end verification

#### Phase 2: Multi-Source Video Input
**Goal**: Users can submit videos from YouTube and Google Drive in addition to Loom, with clear validation and error messages for all sources
**Depends on**: Phase 1
**Requirements**: VINP-02, VINP-03, VINP-04, VINP-05, VINP-06, TRNS-03
**Success Criteria** (what must be TRUE):
  1. User can paste a YouTube URL (including unlisted videos) and get a generated article
  2. User can paste a Google Drive video link (MP4, MOV) and get a generated article
  3. System validates URL format and video accessibility before starting the pipeline, showing specific errors ("video is private", "unsupported format", "URL not recognized")
  4. System rejects videos longer than 15 minutes with a clear message before processing starts
  5. Multi-speaker videos produce transcripts with speaker attribution
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

#### Phase 3: Templates and Generation Quality
**Goal**: Users can choose from 4 genuinely different article templates and refine output without re-transcribing
**Depends on**: Phase 2
**Requirements**: GENR-01, GENR-03, GENR-04, GENR-05
**Success Criteria** (what must be TRUE):
  1. User can select one of 4 templates (How-to, Feature Explainer, Troubleshooting, Onboarding) before processing
  2. Each template produces a visibly different article structure (different headings, sections, and formatting — not just a title swap)
  3. Generated articles include a suggested title, tags, and description alongside the article body
  4. User can type adjustment instructions and regenerate the article without waiting for re-transcription
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

#### Phase 4: Export Formats
**Goal**: Users can get their article out of the tool in the format their KB platform needs
**Depends on**: Phase 3
**Requirements**: OUTP-02, OUTP-03, OUTP-04, OUTP-05
**Success Criteria** (what must be TRUE):
  1. User can copy the article as Markdown to clipboard with one click
  2. User can copy the article as HTML to clipboard with one click
  3. User can copy the article as a code-only format to clipboard
  4. User can export the article as a Word document (.docx) that downloads to their machine
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

#### Phase 5: Usage Control and Polish
**Goal**: The app enforces free-tier limits, works on mobile, and feels complete as a product flow
**Depends on**: Phase 4
**Requirements**: USAG-01, USAG-02, UILP-03, OUTP-06
**Success Criteria** (what must be TRUE):
  1. Guest users can generate exactly 3 free articles; the 4th attempt shows a clear limit-reached message with a call-to-action
  2. The app is usable on mobile devices (input, progress, and result views are responsive)
  3. User can go back from the results page and generate another article without refreshing the browser
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

---

### 📋 v1.1 Stabilization (Planned)

**Milestone Goal:** Production-reliable and maintainable — rate limiting that works in serverless, complete SSRF protection, passing test suite, DB-level dashboard aggregation, and shared SSE parsing logic.

#### Phase 6: Security and Tests
**Goal**: The system is correct and safe — rate limiting works across serverless instances, SSRF protection covers IPv6, and the test suite passes
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. Submitting more requests than the rate limit allows from two different serverless cold starts results in a 429 response — not reset on cold start
  2. Submitting a URL containing an IPv6 private/loopback address (e.g., `http://[::1]/internal`) is rejected by URL validation
  3. Running `npm test` produces a passing suite with no signature-mismatch errors in pipeline tests
  4. Running `npm test` produces a passing suite where the article-generator test asserts `claude-sonnet-4-6`
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Persistent rate limiter (Supabase) and shared URL validation with IPv6 SSRF protection
- [ ] 06-02-PLAN.md — Fix pipeline test signatures and article generator model assertion

#### Phase 7: Performance and Cleanup
**Goal**: The system is maintainable and efficient — dashboard stats come from the DB and SSE parsing logic lives in one place
**Depends on**: Phase 6
**Requirements**: PERF-01, PERF-02
**Success Criteria** (what must be TRUE):
  1. The dashboard page loads workspace stats without fetching all articles to the client — a workspace with 1000 articles returns stats as fast as one with 10
  2. Both the URL form and progress display components parse SSE events from the same shared utility — changing the parsing logic in one place updates both
**Plans**: 1 plan

Plans:
- [ ] 07-01-PLAN.md — DB aggregation for dashboard stats and shared SSE parsing utility

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. End-to-End Pipeline | v1.0 | 3/4 | In progress | - |
| 2. Multi-Source Video Input | v1.0 | 0/TBD | Not started | - |
| 3. Templates and Generation Quality | v1.0 | 0/TBD | Not started | - |
| 4. Export Formats | v1.0 | 0/TBD | Not started | - |
| 5. Usage Control and Polish | v1.0 | 0/TBD | Not started | - |
| 6. Security and Tests | 1/2 | In Progress|  | - |
| 7. Performance and Cleanup | 1/1 | Complete   | 2026-03-15 | - |

---
*Roadmap created: 2026-03-12*
*Last updated: 2026-03-15 — Phase 7 plans created (1 plan, 1 wave)*
