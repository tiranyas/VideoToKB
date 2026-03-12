# Project Research Summary

**Project:** VideoToKB — Video to Knowledge Base Article Pipeline
**Domain:** Content transformation SaaS (video-to-documentation pipeline)
**Researched:** 2026-03-12
**Confidence:** MEDIUM (stack HIGH, architecture HIGH, features MEDIUM, pitfalls HIGH)

## Executive Summary

VideoToKB occupies a clear gap in the documentation tooling market: no existing tool takes an arbitrary video URL and produces a formatted, template-driven KB article ready for platforms like Helpjuice, Zendesk, or Freshdesk. Competitors (Scribe, Loom AI, Otter.ai) either capture screen interactions, enhance the video-watching experience, or transcribe meetings — none produce publishable KB articles from pre-recorded video. The recommended approach is a Next.js full-stack app with AssemblyAI for transcription and Claude API for article generation, deployed on Vercel. The architecture is a single server-side orchestration pipeline (not client-orchestrated multi-step calls) with Server-Sent Events for progress streaming — keeping the pipeline under the 5-minute Vercel Hobby serverless limit for typical 15-minute videos.

The biggest implementation risk is the Vercel serverless timeout constraint. The total pipeline (URL resolution + transcription + article generation) runs 1-3 minutes and fits within Vercel Hobby's 300-second Fluid Compute limit — but only if the pipeline is implemented as a single server-side orchestrator using SSE, NOT as client-orchestrated sequential API calls. The second-biggest risk is Google Doc export: the Docs API is significantly more complex than it appears (requires OAuth, uses a structural batchUpdate format, not HTML/Markdown input) and should be deferred from Phase 1. "Copy as Markdown" and "Copy as HTML" cover the export use case for MVP validation.

The cost model is validated: ~$0.11 per article (AssemblyAI ~$0.06 + Claude API ~$0.05) fits comfortably under the $0.15 target. Per-article credit pricing is a strategic advantage over the subscription-model competitors, which charge $12-29/user/month for tools that are not optimized for the KB article production use case.

## Key Findings

### Recommended Stack

The stack is Next.js 16 + React 19 (App Router, Server Components) with TypeScript strict mode, Tailwind CSS v4, and Vercel for deployment. This combination is well-matched to the project: API routes handle pipeline orchestration server-side (API keys never reach the client), Server Components reduce client bundle size for an app that is mostly form + progress + result display, and Vercel provides zero-config deployment with Fluid Compute enabled for the long-running pipeline function.

The two external services that make the product work are AssemblyAI (transcription, ~$0.06/15-min video, direct URL submission, no download needed) and Claude API using claude-sonnet-4-5 (article generation, ~$0.05/article, 200K context window handles long transcripts). The critical library choice for YouTube is `@distube/ytdl-core` — the original `ytdl-core` is chronically broken, and the @distube fork is actively maintained. For Loom, a simple fetch to their oEmbed endpoint (`https://www.loom.com/v1/oembed?url=VIDEO_URL`) returns the video download URL — no SDK needed.

**Core technologies:**
- Next.js 16: Full-stack framework — App Router + Route Handlers replace the need for a separate backend
- TypeScript 5.9: Type safety — prevents silent data corruption across the multi-stage pipeline
- AssemblyAI SDK 4.x: Transcription — direct URL submission, no server-side video download required
- @anthropic-ai/sdk 0.78: Article generation — streaming support, typed message construction
- @distube/ytdl-core 4.x: YouTube audio extraction — maintained fork, avoids chronic ytdl-core breakage
- Zod 4.x: Runtime validation — essential at pipeline boundaries; bad input at step 1 cascades through all steps
- Supabase (deferred to Phase 2): Auth + database — not needed for MVP localStorage-based free tier

### Expected Features

VideoToKB has a clear MVP scope that validates the core pipeline before adding auth and billing complexity. The 3-free-articles-via-localStorage approach is the right validation strategy — it removes the auth barrier for first use while capping costs.

**Must have (table stakes):**
- URL input for Loom, YouTube, Google Drive — the core entry point; users have videos in these platforms
- AssemblyAI transcription with timestamps — the pipeline foundation; poor transcript = poor article
- Template-based article generation (4 templates: How-to, Feature Explainer, Troubleshooting, Onboarding) — structured output is the core differentiator; generic summaries are not the product
- Real-time processing progress indicators — 2-3 minutes feels broken without step-by-step feedback
- Editable output area — AI output always needs tweaking before publish
- Copy as Markdown — primary export; KB platforms universally accept Markdown
- Copy as HTML — secondary export; rich text editors in KB platforms accept HTML
- Error handling with specific messages — "video is private", "too long", not "something went wrong"
- 3 free articles via localStorage — validation without auth friction

**Should have (competitive):**
- KB-platform-aware formatting (Helpjuice, Zendesk, Freshdesk) — the core differentiator vs. generic Loom AI summaries; start with the most-requested platform among paying users
- Suggested article title and metadata (tags, description) — LLM generates this in the same pass; high polish for low effort
- Automatic table of contents for long articles — expected in articles over 1,000 words
- Regenerate with instructions — users reliably want to adjust tone or structure without re-running transcription
- Authentication + user accounts — triggers when users want history and more than 3 articles
- Credit-based billing (Stripe) — triggers when users convert to paid

**Defer (v2+):**
- Screenshot extraction from video frames — high value, high complexity; requires video download + frame extraction + relevance detection; not blocking validation
- Batch processing / queue system — requires billing infrastructure; strong differentiator for enterprise but premature without a paid user base
- Style matching from existing articles — massive differentiator but requires sample article ingestion system
- Direct KB API push (Helpjuice, Zendesk API) — one integration is a week of work; validate copy/export first
- Google Doc export — more complex than it appears (see pitfalls); defer to Phase 2+; Copy as HTML covers the use case for MVP
- Chrome extension — growth/convenience play, not validation play

### Architecture Approach

The architecture is a single-page Next.js app with three UI states (input, processing, result) connected to a server-side pipeline orchestrator via SSE streaming. The pipeline runs entirely server-side: URL form submits once, the `/api/process` Route Handler resolves the video URL, polls AssemblyAI for transcript completion, sends the cleaned transcript to Claude, and streams progress events back to the client throughout. No intermediate data passes through the client. The key structural decision is keeping the pipeline in `lib/` service modules (Video Resolver, Transcription Service, Article Generator) called by thin API route handlers — business logic stays testable and separate from HTTP concerns. Templates are TypeScript modules (not database-stored) for MVP, giving full type safety and version control over prompt engineering.

**Major components:**
1. Pipeline API (`/api/process`) — single SSE-streaming Route Handler, `maxDuration = 300`, orchestrates all pipeline steps server-side
2. Video Resolver (`lib/video-resolver.ts`) — provider strategy pattern; routes Loom/YouTube/GDrive URLs to provider-specific extractors
3. Transcription Service (`lib/transcription.ts`) — AssemblyAI SDK wrapper with polling; preprocesses transcript before returning
4. Article Generator (`lib/article-generator.ts`) — Claude API wrapper; composes system prompt from template + cleaned transcript
5. Progress UI (React) — SSE consumer; renders step-by-step status (Resolving, Transcribing, Generating, Done)
6. Article View (React) — displays rendered Markdown (via `@tailwindcss/typography` prose class), enables editing, triggers export
7. Usage Tracker — localStorage-based for MVP, abstracted behind interface for Supabase migration at auth phase

### Critical Pitfalls

1. **Vercel timeout kills pipeline mid-processing** — implement as single server-side orchestrator with SSE, NOT client-orchestrated sequential requests. Set `export const maxDuration = 300` on the route. Verify on Vercel preview deployment early in Phase 1, not after the entire pipeline is built locally.

2. **No transcript preprocessing before Claude** — raw AssemblyAI output contains word-level timestamps, filler words ("um", "uh"), and speaker label repetition that double token costs and produce poor articles. Build preprocessing (strip fillers, collapse to paragraph-level, use `auto_chapters`) into the pipeline from day one. This is never acceptable technical debt — the cost and quality impact are immediate.

3. **Google Doc export complexity underestimated** — the Docs API requires OAuth 2.0, a consent screen, and uses a structural batchUpdate format (not HTML/Markdown input). It is a 1-2 week feature, not 1-2 days. Defer entirely from Phase 1; use Copy as HTML instead. Option A for when it ships: upload HTML to Google Drive (Drive API, simpler scope) and let Google auto-convert to Doc format.

4. **Binary dependencies (yt-dlp, ffmpeg) on Vercel serverless** — yt-dlp works locally but cannot run on Vercel without custom Lambda layers. Use `@distube/ytdl-core` (Node.js native) for YouTube, Loom oEmbed endpoint for Loom, and direct download URL construction for Google Drive. Test all three video sources on Vercel preview deployments in Phase 1, not just local dev.

5. **Silent failures on private/restricted video URLs** — Loom workspace links, private YouTube videos, and Google Drive files with restricted permissions all fail non-obviously (HTML login page instead of video, or 403 not surfaced to user). Validate URL accessibility (HEAD request + domain allowlist) before starting the pipeline. Return specific, actionable error messages ("This video is private — make it public and try again").

## Implications for Roadmap

Based on research, the phase ordering is driven by two constraints: (1) the pipeline is the riskiest part — external API integrations with Vercel serverless limitations — so it must be validated first; (2) auth and billing are not needed for MVP validation, so they come after the core pipeline is proven.

### Phase 1: Core Pipeline + MVP UI

**Rationale:** The pipeline (video resolution + transcription + article generation) is the riskiest part of the project and the core value. Everything else depends on it working. Build and verify on Vercel before writing any frontend polish. Architecture must be correct here — wrong pipeline architecture (client-orchestrated, single monolithic function, video download to /tmp) requires a full rewrite.

**Delivers:** A working end-to-end pipeline: paste a Loom URL, get a formatted KB article. Verified on Vercel production, not just local dev. The product is usable for internal validation.

**Addresses features:** URL input (Loom first, then YouTube + Google Drive), 4 article templates, processing progress, editable output, Copy as Markdown, Copy as HTML, 3 free articles (localStorage), error handling

**Avoids pitfalls:**
- Vercel timeout: single orchestrator + SSE, `maxDuration = 300`
- No transcript preprocessing: build preprocessing into pipeline from the start
- Binary dependencies: `@distube/ytdl-core` only, no yt-dlp or ffmpeg, test on Vercel preview early
- Silent URL failures: domain allowlist + HEAD validation + specific error messages
- Google Doc export scope creep: explicitly excluded from Phase 1

**Build order (recommended):**
1. Video Resolver (Loom first — simplest, oEmbed API)
2. Transcription Service (AssemblyAI + preprocessing)
3. Article Generator (Claude + one template)
4. Pipeline Orchestrator + SSE Route Handler
5. Remaining 3 templates
6. URL Form + Progress UI + Article View (React)
7. Copy as Markdown / HTML (client-side)
8. Guest usage tracking (localStorage + abstraction interface)
9. YouTube provider
10. Google Drive provider

### Phase 2: Auth, Billing, and History

**Rationale:** After Phase 1 validates that the pipeline produces articles worth paying for, add the infrastructure that enables paid use. Auth gates the free tier bypass. Billing validates the per-article credit pricing model. History makes the tool reusable. This phase also includes the localStorage-to-Supabase migration for usage tracking (already abstracted behind an interface in Phase 1).

**Delivers:** Registered users with credit-based billing (Stripe), article history dashboard, server-side usage enforcement

**Uses:** Supabase (`@supabase/supabase-js`), Stripe, Next.js middleware for auth gates

**Implements:** Supabase auth integration, Stripe webhook handler, article storage schema, usage tracking migration from localStorage to Supabase

**Avoids:** Building billing before validating willingness to pay; auth complexity before core pipeline is proven

### Phase 3: Output Quality and Export

**Rationale:** Once paying users exist, their most frequent requests will be output quality (platform-aware formatting, regenerate with instructions) and export convenience (Google Doc, richer editing). This phase addresses the differentiators that grow from table stakes to competitive advantages.

**Delivers:** KB-platform-aware formatting (starting with the most-requested platform), Google Doc export (Drive API HTML upload approach), regenerate with instructions, suggested title + metadata, automatic ToC

**Uses:** `googleapis` (Drive API for HTML-to-Doc conversion), additional Claude prompt engineering for platform-specific formatting

**Research flag: Phase 3 likely needs research-phase for Google Doc export** — the Drive API HTML upload approach needs verification that auto-conversion preserves article formatting adequately. Also research Helpjuice/Zendesk HTML conventions before building platform-aware formatting.

### Phase 4: Power Features

**Rationale:** Phase 4 features require stable infrastructure (auth, billing, job queue) and are primarily for enterprise/power users. Screenshot extraction, batch processing, and style matching are the differentiators that expand from individual KB authors to team workflows.

**Delivers:** Batch processing queue, screenshot extraction from video frames, style matching from existing articles

**Research flag: Phase 4 needs research-phase for screenshot extraction** — frame extraction from video URLs without downloading the full file is a non-trivial computer vision problem. Needs research into client-side video frame extraction vs. server-side, and relevance detection approaches.

### Phase Ordering Rationale

- Pipeline-first because external API integrations (AssemblyAI, YouTube, Google Drive access) are the highest-risk unknowns. These must be validated on Vercel (not just locally) before UI polish.
- Auth after pipeline because the 3-free-articles localStorage approach removes signup friction for initial validation, and auth infrastructure is genuinely premature before knowing users want to return.
- Google Doc export in Phase 3 not Phase 1 because the Docs API complexity is a trap (see Pitfall 6) and Copy as HTML + Markdown covers the export need for MVP.
- Batch processing in Phase 4 because it requires billing infrastructure (cost-per-batch) and a job queue — both premature until there are paying users with a backlog.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Google Doc export):** Drive API HTML-to-Doc conversion quality needs verification. Helpjuice/Zendesk HTML formatting conventions need research before building platform-aware output.
- **Phase 4 (screenshot extraction):** Frame extraction strategy from video URLs without downloading full video file. Client-side vs. server-side approach. Relevance/keyframe detection approaches.
- **Phase 2 (Stripe billing):** Credit model implementation details (prepaid vs. postpaid, overage handling, trial credits).

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Pipeline):** AssemblyAI + Claude + Next.js SSE patterns are well-documented. The architecture is clear. Risk is implementation details, not unknown patterns.
- **Phase 2 (Auth):** Supabase auth with Next.js is extremely well-documented. Standard pattern.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm registry. Version compatibility matrix verified. |
| Features | MEDIUM | Based on training data (May 2025 cutoff). Competitor features may have evolved. Core table stakes analysis is sound. Verify competitor pricing before making positioning decisions. |
| Architecture | HIGH | Vercel timeout limits verified against official docs. SSE pattern on Vercel App Router is well-established. Pipeline orchestration approach is well-reasoned. |
| Pitfalls | HIGH | Vercel limits verified. Other pitfalls (transcript preprocessing, binary dependencies, Google Docs API complexity) are well-known patterns in the community with consistent documentation. |

**Overall confidence:** HIGH for technical decisions; MEDIUM for competitive positioning.

### Gaps to Address

- **AssemblyAI pricing:** Research cites ~$0.06/15-min video but notes LOW confidence on exact pricing. Verify on assemblyai.com before launch — cost model depends on this.
- **AssemblyAI YouTube URL support:** Architecture suggests passing YouTube URLs directly to AssemblyAI (eliminating the ytdl-core dependency entirely). Verify during Phase 1 implementation — if AssemblyAI accepts YouTube URLs natively, YouTube integration simplifies significantly.
- **Loom oEmbed API availability:** Research cites MEDIUM-LOW confidence on Loom's developer API. Verify the oEmbed endpoint works for public share links during Phase 1 implementation.
- **Vercel Fluid Compute default status:** Research confirms 300s limit with Fluid Compute enabled (Hobby tier). Verify Fluid Compute is enabled by default for new projects, or add explicit configuration.
- **Google Drive "virus scan" interstitial:** Large Google Drive files trigger a virus scan confirmation page that breaks direct download URL construction. Handle explicitly in Phase 1 Google Drive implementation.
- **Competitor pricing verification:** Feature research is based on training data (May 2025). Verify Scribe, Loom AI, Otter.ai pricing before finalizing VideoToKB's credit pricing strategy.

## Sources

### Primary (HIGH confidence)
- Vercel Functions Duration Docs — verified 2026-03-12: https://vercel.com/docs/functions/configuring-functions/duration — Hobby 300s / Pro 800s with Fluid Compute
- Vercel Functions Runtimes — verified 2026-03-12: https://vercel.com/docs/functions/runtimes
- npm registry — verified 2026-03-12: all package version numbers confirmed via `npm view [package] version`

### Secondary (MEDIUM confidence)
- AssemblyAI API documentation (training data, May 2025 cutoff) — webhook vs polling patterns, `auto_chapters`, URL transcription, pricing
- Claude API / Anthropic SDK documentation (training data) — claude-sonnet-4-5 context window, pricing, streaming patterns
- Google Docs/Drive API documentation (training data) — batchUpdate format, OAuth requirements, HTML-to-Doc conversion
- Competitor landscape (Scribe, Tango, Loom AI, Otter.ai, Grain) — training data knowledge of features and pricing

### Tertiary (LOW confidence)
- Loom Developer API — oEmbed endpoint behavior, video CDN URL extraction; verify current availability and behavior during Phase 1
- AssemblyAI exact pricing — ~$0.01/min figure from training data; verify on assemblyai.com before launch

---
*Research completed: 2026-03-12*
*Ready for roadmap: yes*
