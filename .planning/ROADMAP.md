# Roadmap: VideoToKB

## Overview

VideoToKB delivers a web-based pipeline that converts video recordings into structured KB articles. The roadmap is pipeline-risk-first: Phase 1 proves the end-to-end architecture works (one video source, one template, deployed on Vercel), then subsequent phases expand video sources, template quality, export options, and usage controls. Every phase delivers a vertically complete, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: End-to-End Pipeline** - Loom URL to KB article with progress feedback, deployed on Vercel
- [ ] **Phase 2: Multi-Source Video Input** - YouTube + Google Drive support with validation and error handling
- [ ] **Phase 3: Templates and Generation Quality** - All 4 distinct templates, metadata, and regeneration
- [ ] **Phase 4: Export Formats** - Markdown, HTML, code copy, and Word document export
- [ ] **Phase 5: Usage Control and Polish** - Free tier limits, mobile responsive, navigation flow

## Phase Details

### Phase 1: End-to-End Pipeline
**Goal**: A user can paste a Loom URL, see real-time progress, and view a generated KB article -- deployed and working on Vercel, not just local dev
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
- [ ] 01-01-PLAN.md — Project scaffolding, shared types, test infrastructure (Wave 0)
- [ ] 01-02-PLAN.md — Backend pipeline services (Loom resolver, transcription, article generator, SSE API)
- [ ] 01-03-PLAN.md — Frontend UI (URL form, progress display, article view, homepage wiring)
- [ ] 01-04-PLAN.md — Vercel deployment and end-to-end verification

### Phase 2: Multi-Source Video Input
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

### Phase 3: Templates and Generation Quality
**Goal**: Users can choose from 4 genuinely different article templates and refine output without re-transcribing
**Depends on**: Phase 2
**Requirements**: GENR-01, GENR-03, GENR-04, GENR-05
**Success Criteria** (what must be TRUE):
  1. User can select one of 4 templates (How-to, Feature Explainer, Troubleshooting, Onboarding) before processing
  2. Each template produces a visibly different article structure (different headings, sections, and formatting -- not just a title swap)
  3. Generated articles include a suggested title, tags, and description alongside the article body
  4. User can type adjustment instructions and regenerate the article without waiting for re-transcription
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Export Formats
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

### Phase 5: Usage Control and Polish
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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. End-to-End Pipeline | 3/4 | In Progress|  |
| 2. Multi-Source Video Input | 0/? | Not started | - |
| 3. Templates and Generation Quality | 0/? | Not started | - |
| 4. Export Formats | 0/? | Not started | - |
| 5. Usage Control and Polish | 0/? | Not started | - |

---
*Roadmap created: 2026-03-12*
*Last updated: 2026-03-12*
