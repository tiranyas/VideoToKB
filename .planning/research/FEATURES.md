# Feature Research

**Domain:** Video-to-Knowledge Base Article Pipeline
**Researched:** 2026-03-12
**Confidence:** MEDIUM (based on training data up to May 2025; web search/fetch unavailable for live verification)

## Competitor Landscape Overview

The video-to-documentation space has several adjacent players but no direct competitor doing exactly what VideoToKB does (video URL in, structured KB article out). Competitors fall into three camps:

1. **Screen-capture-to-SOP tools** (Scribe, Tango): Record clicks, auto-generate step-by-step guides. They capture screen actions, not video content. Their output is procedural SOPs, not narrative KB articles.
2. **Video platforms with AI features** (Loom, Vidyard): AI summaries, auto-chapters, searchable transcripts. They enhance the video experience but do not produce standalone written articles.
3. **Meeting/conversation AI** (Grain, Otter.ai, Fireflies): Transcribe meetings, extract action items, generate summaries. Optimized for meetings, not for producing publishable documentation.

VideoToKB's unique position: takes an **existing video recording** and produces a **formatted, template-driven KB article** ready for a specific KB platform. None of the above do this end-to-end.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| URL-based video input (Loom, YouTube, Google Drive) | Core entry point; users have videos in these platforms | MEDIUM | Need to handle auth for private videos (Google Drive), URL parsing for each platform |
| Accurate transcription with speaker detection | Foundation of the entire pipeline; garbage transcript = garbage article | LOW | AssemblyAI handles this well; speaker diarization is standard |
| Template-based article generation | Users need structured output matching their KB style (how-to, troubleshooting, etc.) | MEDIUM | 4 templates for MVP is right; must produce genuinely different structures, not just heading changes |
| Real-time processing status | 2-3 min processing feels broken without progress indication | LOW | Already in requirements; step indicators (Downloading > Transcribing > Generating > Done) |
| Copy as Markdown | KB platforms accept Markdown; users expect clipboard-ready output | LOW | Standard clipboard API |
| Copy as HTML | Many KB platforms use rich text / HTML editors | LOW | Convert from Markdown |
| Editable output before export | Users always need to tweak AI output before publishing | MEDIUM | Rich text editor vs plain textarea has UX implications; start with textarea for MVP |
| Mobile-responsive viewing | Users review articles on mobile even if they generate on desktop | LOW | Next.js + Tailwind handles this |
| Error handling with clear messages | Failed transcription, unsupported URL, too-long video -- must communicate clearly | LOW | Critical for trust; "Something went wrong" is unacceptable |

### Differentiators (Competitive Advantage)

Features that set VideoToKB apart from the adjacent tools above.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| KB-platform-aware formatting | Output formatted specifically for Helpjuice, Zendesk, Freshdesk, Document360 -- not generic Markdown | HIGH | This is the core differentiator vs Loom AI summaries. Requires understanding each platform's formatting quirks, supported HTML/CSS, and content structure conventions |
| Template library with domain-specific variants | Templates for SaaS onboarding, feature updates, troubleshooting, internal training -- each with real KB structure (callout boxes, warning blocks, related articles sections) | MEDIUM | Competitors generate generic summaries; VideoToKB produces articles that look like they belong in the KB |
| Screenshot extraction from video | Auto-extract key frames as annotated screenshots placed inline in the article | HIGH | This is what makes the article visually complete. Scribe/Tango do this for screen recordings; nobody does it for arbitrary video URLs. Requires frame extraction + relevance detection |
| Google Doc export | Collaboration on drafts before publishing; fits the review workflow at target companies | MEDIUM | Already in requirements; Google Docs API integration |
| Batch processing (multiple videos) | Head of Support has 50+ videos backlogged; one-by-one is painful | MEDIUM | Queue system; needs credit/billing awareness. Strong differentiator for enterprise adoption |
| Style matching from existing articles | Analyze user's existing KB articles and match tone, structure, terminology | HIGH | v2 feature per PROJECT.md; massive differentiator but complex. Requires ingesting sample articles and fine-tuning prompt |
| Automatic table of contents generation | KB articles need navigation; auto-generate from article headings | LOW | Simple Markdown heading extraction; expected in longer articles |
| Suggested article title and metadata | Generate SEO-friendly title, meta description, tags/categories for the KB | LOW | LLM can do this in the same generation pass; small effort, high polish |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Built-in KB hosting/CMS | "Why not just host articles too?" | Competes with user's existing KB platform (Helpjuice, Zendesk); destroys the pipeline positioning; massive scope increase | Stay a pipeline tool. Export to their platform, never replace it |
| Real-time collaborative editing | Teams want to co-edit drafts | Massive engineering complexity (CRDT/OT); Google Docs export already solves collaboration | Google Doc export for collaboration; keep the editor single-user |
| Video recording/capture | "Let me record directly in the tool" | Loom, native screen recording, OBS all exist. Building a recorder is a product unto itself | Accept URLs from existing recording tools |
| Full video player with transcript sync | "Show me the video alongside the article with timestamp linking" | Significant frontend complexity; users care about the article output, not re-watching the video. Hosting/streaming video adds cost | Show transcript with timestamps for reference, not a full video player |
| AI chatbot for article refinement | "Let me chat with AI to improve the article" | Scope creep into AI writing assistant territory; users can paste into ChatGPT/Claude if they want conversational editing | Provide "Regenerate with instructions" -- a single text field for adjustment prompts, then regenerate |
| Multi-language translation | "Translate the article to Hebrew/Spanish" | Translation quality for technical content is mediocre; user's KB likely has a language strategy already | Generate in the video's spoken language; let users handle translation via their existing tools |
| Direct KB API push (v1) | "Push directly to my Helpjuice" | Each KB platform has different APIs, auth flows, content models; one integration is a week of work; doing 5 is a month | v1: Copy/export. v2: Direct integrations starting with the most popular platform among paying users |
| Chrome extension (v1) | "Let me convert from the Loom page" | Separate codebase, Chrome Web Store review, cross-origin issues | Web app with URL paste is sufficient for validation; extension is a growth/convenience play for v2 |

## Feature Dependencies

```
[URL Input + Parsing]
    |
    v
[Video Download/Access]
    |
    v
[Transcription (AssemblyAI)]
    |
    v
[Article Generation (Claude API)]
    |
    +--requires--> [Template System]
    |
    v
[Article Display + Editing]
    |
    +--enables--> [Copy as Markdown]
    +--enables--> [Copy as HTML]
    +--enables--> [Google Doc Export]
    +--enables--> [Regenerate with Instructions]

[Screenshot Extraction]
    +--requires--> [Video Download/Access]
    +--enhances--> [Article Generation]

[Batch Processing]
    +--requires--> [URL Input + Parsing]
    +--requires--> [Credit/Usage Tracking]

[KB-Platform-Aware Formatting]
    +--requires--> [Template System]
    +--enhances--> [Copy as HTML]

[Style Matching]
    +--requires--> [Article Generation]
    +--requires--> [Sample Article Ingestion]

[Direct KB API Push]
    +--requires--> [KB-Platform-Aware Formatting]
    +--requires--> [Authentication/Login]

[Credit/Usage Tracking]
    +--requires--> [Authentication/Login] (for paid tiers)
    +--independent--> [localStorage tracking] (for free tier)
```

### Dependency Notes

- **Article Generation requires Template System:** Templates define the prompt structure; without templates, output is generic and undifferentiated.
- **Screenshot Extraction requires Video Download:** Must have the video file locally to extract frames; cannot do this from a transcript alone.
- **Direct KB API Push requires Authentication:** Users must be logged in to store their KB platform credentials securely.
- **Batch Processing requires Credit Tracking:** Processing 50 videos without usage controls is a cost disaster.
- **Style Matching requires Sample Article Ingestion:** Need a way for users to provide example articles before this feature works.

## MVP Definition

### Launch With (v1)

Minimum viable product -- validate that the core pipeline produces articles worth editing.

- [x] URL input for Loom, YouTube, Google Drive -- core entry point
- [x] 4 article templates (How-to, Feature Explainer, Troubleshooting, Onboarding) -- covers main KB article types
- [x] AssemblyAI transcription with timestamps -- foundation
- [x] Claude API article generation from transcript + template -- core value
- [x] Step-by-step processing progress -- trust during wait
- [x] Editable text area for output -- users must tweak
- [x] Copy as Markdown -- primary export
- [x] Copy as HTML -- secondary export
- [x] Google Doc export -- collaboration workflow
- [x] 3 free articles via localStorage -- validation without auth
- [x] 15-minute video cap -- cost control

### Add After Validation (v1.x)

Features to add once core pipeline is proven and early users are converting.

- [ ] Authentication + user accounts -- trigger: users want history and more than 3 articles
- [ ] Credit-based billing (Stripe) -- trigger: users willing to pay; validates pricing model
- [ ] Article history/dashboard -- trigger: returning users want to find past articles
- [ ] Regenerate with instructions -- trigger: users consistently want specific adjustments to output
- [ ] Suggested title and metadata (tags, description) -- trigger: users manually adding these every time
- [ ] Automatic ToC generation for longer articles -- trigger: articles exceed 1000 words regularly
- [ ] KB-platform-aware formatting (start with Helpjuice) -- trigger: paying users on a specific platform request it

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Screenshot extraction from video frames -- high complexity, high value but not blocking validation
- [ ] Batch processing / queue system -- requires billing infrastructure
- [ ] Style matching from existing articles -- requires sample ingestion system
- [ ] Direct KB API integrations (Helpjuice, Zendesk, Freshdesk) -- requires per-platform engineering
- [ ] Chrome extension -- growth/convenience play
- [ ] Team management / multi-user workspaces -- enterprise feature
- [ ] Video file upload (not just URLs) -- storage/bandwidth cost implications
- [ ] Custom template builder -- users define their own article structures

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL input (Loom, YouTube, GDrive) | HIGH | MEDIUM | P1 |
| Transcription (AssemblyAI) | HIGH | LOW | P1 |
| Article generation (Claude + templates) | HIGH | MEDIUM | P1 |
| Processing progress indicators | HIGH | LOW | P1 |
| Copy as Markdown | HIGH | LOW | P1 |
| Copy as HTML | MEDIUM | LOW | P1 |
| Editable output area | HIGH | LOW | P1 |
| Google Doc export | MEDIUM | MEDIUM | P1 |
| Free tier tracking (localStorage) | MEDIUM | LOW | P1 |
| Error handling + clear messages | HIGH | LOW | P1 |
| Authentication / user accounts | MEDIUM | MEDIUM | P2 |
| Credit-based billing (Stripe) | MEDIUM | MEDIUM | P2 |
| Article history / dashboard | MEDIUM | MEDIUM | P2 |
| Regenerate with instructions | HIGH | LOW | P2 |
| Suggested title + metadata | MEDIUM | LOW | P2 |
| KB-platform-aware formatting | HIGH | HIGH | P2 |
| Screenshot extraction | HIGH | HIGH | P3 |
| Batch processing | MEDIUM | MEDIUM | P3 |
| Style matching | HIGH | HIGH | P3 |
| Direct KB API push | MEDIUM | HIGH | P3 |
| Chrome extension | LOW | HIGH | P3 |
| Team management | LOW | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Scribe/Tango | Loom AI | Otter.ai/Grain | VideoToKB Approach |
|---------|-------------|---------|----------------|-------------------|
| Input method | Browser extension captures clicks | Records video + screen | Records/joins meetings | Paste URL of existing video |
| Output format | Step-by-step SOP with screenshots | AI summary, chapters, titles | Transcript, summary, action items | Structured KB article from template |
| Template system | Basic SOP format only | None (auto-generated) | None (meeting-focused) | Multiple KB-specific templates |
| Screenshot/visual | Auto-captures each click | Video thumbnails | None | Frame extraction (v2) |
| Export options | PDF, Markdown, HTML, Confluence | Share link, embed | Export transcript, share clips | Markdown, HTML, Google Doc |
| KB platform targeting | Generic documentation | Not KB-focused | Not KB-focused | Formatted for specific KB platforms |
| Editing | In-app step editor | Title/description editing | Transcript editing | Text area (v1), rich editor (v2) |
| Collaboration | Share links, team workspaces | Comments, reactions | Share clips, highlights | Google Doc export for collaboration |
| Pricing model | Per-seat subscription ($23-29/user/mo) | Per-seat subscription ($12.50/user/mo) | Per-seat subscription ($16.99/user/mo) | Per-article credits (~$1.30-1.90/article) |
| Target user | Process documenters, L&D | Async communication | Meeting participants | Support/ops leads with video backlogs |

**Key insight from competitor analysis:** VideoToKB's per-article pricing is a strategic advantage for the target persona. A Head of Support converting 30 videos does not want to pay $23/user/month for Scribe when they need the tool episodically, not daily. Credit-based pricing aligns cost with value delivered.

## Sources

- Scribe (scribehow.com) -- training data knowledge of features and pricing as of early 2025
- Tango (tango.us) -- training data knowledge of features as of early 2025
- Loom AI features -- training data knowledge of Loom's AI summary/chapter features as of early 2025
- Otter.ai -- training data knowledge of transcription and summary features as of early 2025
- Grain -- training data knowledge of video highlight/clip features as of early 2025
- PROJECT.md -- validated POC context (200+ articles, FinBot case study)

**Note:** Web search and web fetch were unavailable during this research. All competitor information is based on training data (cutoff May 2025). Competitor features may have changed. Confidence is MEDIUM -- the feature categories and table stakes analysis are sound, but specific competitor pricing and feature details should be verified before making final product decisions.

---
*Feature research for: Video-to-Knowledge Base Article Pipeline*
*Researched: 2026-03-12*
