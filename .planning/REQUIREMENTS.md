# Requirements: VideoToKB

**Defined:** 2026-03-12
**Core Value:** A user can take a video recording and get back a publish-ready KB article in minutes instead of days

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Video Input

- [x] **VINP-01**: User can paste a Loom share URL and submit it for processing
- [ ] **VINP-02**: User can paste a YouTube URL (including unlisted videos) and submit it for processing
- [ ] **VINP-03**: User can paste a Google Drive URL (MP4, MOV sharing link) and submit it for processing
- [ ] **VINP-04**: System validates URL format and video accessibility before starting the pipeline
- [ ] **VINP-05**: System shows specific error messages for invalid/inaccessible URLs ("video is private", "unsupported format", "URL not recognized")
- [ ] **VINP-06**: System rejects videos longer than 15 minutes with a clear message

### Transcription

- [x] **TRNS-01**: System transcribes video audio via AssemblyAI with timestamps
- [x] **TRNS-02**: System preprocesses transcript (strips filler words, collapses to paragraph-level timestamps)
- [ ] **TRNS-03**: System supports speaker diarization when multiple speakers are detected

### Article Generation

- [ ] **GENR-01**: User can select one of 4 article templates: How-to, Feature Explainer, Troubleshooting, Onboarding
- [x] **GENR-02**: System generates structured KB article via Claude API (claude-sonnet-4-5) based on transcript + selected template
- [ ] **GENR-03**: Each template produces a genuinely different article structure (not just heading changes)
- [ ] **GENR-04**: System auto-generates suggested article title and metadata (tags, description) in the same generation pass
- [ ] **GENR-05**: User can provide adjustment instructions and regenerate the article without re-transcribing

### Processing UX

- [x] **PRUX-01**: User sees step-by-step progress during processing (Resolving → Transcribing → Generating → Done)
- [x] **PRUX-02**: System streams progress via SSE so user gets real-time feedback
- [x] **PRUX-03**: System shows specific, actionable error messages at each pipeline stage

### Output & Export

- [ ] **OUTP-01**: User can view generated article in an editable text area
- [ ] **OUTP-02**: User can copy article as Markdown to clipboard
- [ ] **OUTP-03**: User can copy article as HTML to clipboard
- [ ] **OUTP-04**: User can copy article as code-only format to clipboard
- [ ] **OUTP-05**: User can export article as Word document (.docx)
- [ ] **OUTP-06**: User can go back to the input page and generate another article

### Usage Control

- [ ] **USAG-01**: Guest users get 3 free articles tracked via localStorage
- [ ] **USAG-02**: System shows clear message when free limit is reached with call-to-action

### UI / Landing

- [ ] **UILP-01**: Homepage is a single centered input field ("Paste your Loom / YouTube / Google Drive URL") with template dropdown and "Create Article" button
- [x] **UILP-02**: No login, no dashboard, no navigation — the URL input IS the homepage
- [ ] **UILP-03**: App is mobile-responsive

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication & Billing

- **AUTH-01**: User can sign up and log in via Supabase auth
- **AUTH-02**: Registered user sees credit balance and purchase options
- **AUTH-03**: User can buy article credits via Stripe (Starter $19/10, Growth $49/30, Pro $129/100)
- **AUTH-04**: System enforces credit-based usage for registered users

### History & Dashboard

- **HIST-01**: Registered user can view previously generated articles
- **HIST-02**: Dashboard accessible from nav menu (not homepage)

### Advanced Output

- **ADVT-01**: Google Doc export (requires OAuth + Drive API)
- **ADVT-02**: KB-platform-aware formatting (Helpjuice, Zendesk, Freshdesk styles)
- **ADVT-03**: Automatic table of contents for articles over 1000 words

### Power Features

- **POWR-01**: Batch processing (multiple video URLs at once)
- **POWR-02**: Screenshot extraction from video frames placed inline
- **POWR-03**: Style matching from existing KB articles
- **POWR-04**: Custom template builder

## Out of Scope

| Feature | Reason |
|---------|--------|
| Built-in KB hosting/CMS | Pipeline tool, not KB replacement — users have existing KB platforms |
| Real-time collaborative editing | Google Doc / Word export handles collaboration |
| Video recording/capture | Loom, OBS, native tools exist — accept URLs only |
| Full video player with transcript sync | Users care about article output, not re-watching video |
| AI chatbot for article refinement | Regenerate with instructions covers this simpler |
| Multi-language translation | Generate in video's spoken language; translation is separate |
| Direct KB API push (v1) | Each integration is a week+ of work; copy/export first |
| Chrome Extension (v1) | Growth play, not validation play |
| Video file upload | Only URLs for MVP — storage/bandwidth cost |
| Mobile app | Web-first |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VINP-01 | Phase 1 | Complete |
| VINP-02 | Phase 2 | Pending |
| VINP-03 | Phase 2 | Pending |
| VINP-04 | Phase 2 | Pending |
| VINP-05 | Phase 2 | Pending |
| VINP-06 | Phase 2 | Pending |
| TRNS-01 | Phase 1 | Complete |
| TRNS-02 | Phase 1 | Complete |
| TRNS-03 | Phase 2 | Pending |
| GENR-01 | Phase 3 | Pending |
| GENR-02 | Phase 1 | Complete |
| GENR-03 | Phase 3 | Pending |
| GENR-04 | Phase 3 | Pending |
| GENR-05 | Phase 3 | Pending |
| PRUX-01 | Phase 1 | Complete |
| PRUX-02 | Phase 1 | Complete |
| PRUX-03 | Phase 1 | Complete |
| OUTP-01 | Phase 1 | Pending |
| OUTP-02 | Phase 4 | Pending |
| OUTP-03 | Phase 4 | Pending |
| OUTP-04 | Phase 4 | Pending |
| OUTP-05 | Phase 4 | Pending |
| OUTP-06 | Phase 5 | Pending |
| USAG-01 | Phase 5 | Pending |
| USAG-02 | Phase 5 | Pending |
| UILP-01 | Phase 1 | Pending |
| UILP-02 | Phase 1 | Complete |
| UILP-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*
