# Requirements: VideoToKB

**Defined:** 2026-03-12
**Core Value:** A user can take a video recording and get back a publish-ready KB article in minutes instead of days

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Video Input

- [ ] **VINP-01**: User can paste a Loom share URL and submit it for processing
- [ ] **VINP-02**: User can paste a YouTube URL (including unlisted videos) and submit it for processing
- [ ] **VINP-03**: User can paste a Google Drive URL (MP4, MOV sharing link) and submit it for processing
- [ ] **VINP-04**: System validates URL format and video accessibility before starting the pipeline
- [ ] **VINP-05**: System shows specific error messages for invalid/inaccessible URLs ("video is private", "unsupported format", "URL not recognized")
- [ ] **VINP-06**: System rejects videos longer than 15 minutes with a clear message

### Transcription

- [ ] **TRNS-01**: System transcribes video audio via AssemblyAI with timestamps
- [ ] **TRNS-02**: System preprocesses transcript (strips filler words, collapses to paragraph-level timestamps)
- [ ] **TRNS-03**: System supports speaker diarization when multiple speakers are detected

### Article Generation

- [ ] **GENR-01**: User can select one of 4 article templates: How-to, Feature Explainer, Troubleshooting, Onboarding
- [ ] **GENR-02**: System generates structured KB article via Claude API (claude-sonnet-4-5) based on transcript + selected template
- [ ] **GENR-03**: Each template produces a genuinely different article structure (not just heading changes)
- [ ] **GENR-04**: System auto-generates suggested article title and metadata (tags, description) in the same generation pass
- [ ] **GENR-05**: User can provide adjustment instructions and regenerate the article without re-transcribing

### Processing UX

- [ ] **PRUX-01**: User sees step-by-step progress during processing (Resolving → Transcribing → Generating → Done)
- [ ] **PRUX-02**: System streams progress via SSE so user gets real-time feedback
- [ ] **PRUX-03**: System shows specific, actionable error messages at each pipeline stage

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
- [ ] **UILP-02**: No login, no dashboard, no navigation — the URL input IS the homepage
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
| VINP-01 | — | Pending |
| VINP-02 | — | Pending |
| VINP-03 | — | Pending |
| VINP-04 | — | Pending |
| VINP-05 | — | Pending |
| VINP-06 | — | Pending |
| TRNS-01 | — | Pending |
| TRNS-02 | — | Pending |
| TRNS-03 | — | Pending |
| GENR-01 | — | Pending |
| GENR-02 | — | Pending |
| GENR-03 | — | Pending |
| GENR-04 | — | Pending |
| GENR-05 | — | Pending |
| PRUX-01 | — | Pending |
| PRUX-02 | — | Pending |
| PRUX-03 | — | Pending |
| OUTP-01 | — | Pending |
| OUTP-02 | — | Pending |
| OUTP-03 | — | Pending |
| OUTP-04 | — | Pending |
| OUTP-05 | — | Pending |
| OUTP-06 | — | Pending |
| USAG-01 | — | Pending |
| USAG-02 | — | Pending |
| UILP-01 | — | Pending |
| UILP-02 | — | Pending |
| UILP-03 | — | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 0
- Unmapped: 28 ⚠️

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
