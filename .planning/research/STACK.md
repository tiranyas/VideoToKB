# Stack Research

**Domain:** Video-to-KB article pipeline (web app)
**Researched:** 2026-03-12
**Confidence:** HIGH (versions verified via npm registry)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | ^16.1.6 | Full-stack framework (frontend + API routes) | App Router with Server Components is the standard for React apps on Vercel. API routes handle the pipeline orchestration server-side, keeping API keys secure. Route Handlers replace the need for a separate backend. |
| React | ^19.2.4 | UI library | Ships with Next.js 16. React 19 Server Components reduce client bundle size -- important since this app is mostly a form + progress display + result viewer. |
| TypeScript | ^5.9.3 | Type safety | Non-negotiable for a pipeline app where data flows through multiple stages (URL input -> video metadata -> transcript -> article). Type safety prevents silent data corruption between stages. |
| Tailwind CSS | ^4.2.1 | Styling | Utility-first CSS that ships zero unused styles. Tailwind v4 uses CSS-first configuration (no more tailwind.config.js). Fast to build UIs without custom CSS files. |

### External Services (API-based)

| Service | Purpose | Why Recommended |
|---------|---------|-----------------|
| AssemblyAI | Video/audio transcription | Best accuracy-to-price ratio for English transcription. Supports direct URL submission (no need to download audio first for many sources). Timestamp support enables section detection. Speaker diarization available for multi-speaker videos. ~$0.01/min which fits the $0.15/article cost target. |
| Claude API (claude-sonnet-4-5) | Article generation from transcript | Strong instruction-following for structured output (KB article templates). Handles long transcripts well with 200K context window. Good at maintaining consistent formatting across templates. Cost: ~$3/1M input tokens, ~$15/1M output tokens -- a 15-min transcript + template prompt costs roughly $0.05-0.10. |
| Supabase | Database + Auth (deferred) | PostgreSQL under the hood with a generous free tier. Auth module is plug-and-play when needed in Week 3. Row Level Security for future multi-tenant needs. Realtime subscriptions available if you later want live collaboration. |
| Vercel | Hosting + deployment | Zero-config deployment for Next.js (same company). Serverless functions for API routes with automatic scaling. Edge network for fast global delivery. Free tier sufficient for MVP validation. |

### Service SDKs

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| assemblyai | ^4.26.1 | AssemblyAI Node.js SDK | Official SDK. Handles polling for transcript completion, provides typed responses. Use `transcriber.transcribe()` with audio URL directly. |
| @anthropic-ai/sdk | ^0.78.0 | Claude API SDK | Official SDK. Supports streaming responses (useful for showing article generation progress). Typed message construction. |
| @supabase/supabase-js | ^2.99.1 | Supabase client | Official SDK. Not needed for MVP (no auth yet), but install when adding auth in Week 3. |
| googleapis | ^171.4.0 | Google Drive + Google Docs API | Official Google APIs client. Needed for: (1) downloading video from Google Drive URLs, (2) Google Doc export feature. Single package covers both use cases. |

### Video/Audio Processing

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| @distube/ytdl-core | ^4.16.12 | YouTube video audio extraction | Maintained fork of ytdl-core. Extracts audio stream URL from YouTube videos so AssemblyAI can transcribe. The original ytdl-core (4.11.5) has chronic breakage issues with YouTube -- the @distube fork is actively maintained. |

**Note on Loom:** Loom provides direct download URLs via their oEmbed endpoint (`https://www.loom.com/v1/oembed?url=VIDEO_URL`). No special SDK needed -- a simple fetch to their API returns the video download URL. AssemblyAI can then transcribe directly from that URL.

### UI Components

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.577.0 | Icons | Lightweight tree-shakeable icon set. Use for step progress indicators, copy buttons, template selection cards. |
| sonner | ^2.0.7 | Toast notifications | Best React toast library. Use for "Copied to clipboard", error notifications, processing status updates. |
| clsx | ^2.1.1 | Conditional CSS classes | Tiny utility for building className strings conditionally. Use everywhere with Tailwind. |
| tailwind-merge | ^3.5.0 | Merge Tailwind classes | Resolves conflicting Tailwind classes. Use with clsx as `cn()` utility pattern. |
| class-variance-authority | ^0.7.1 | Component variants | Define button/card variants declaratively. Use for template selection cards, status badges. |

### Content Processing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| marked | ^17.0.4 | Markdown to HTML conversion | For the "Copy as HTML" feature. Converts the generated Markdown article to clean HTML. Fast and well-maintained. |
| turndown | ^7.2.2 | HTML to Markdown conversion | Reverse direction if needed. Useful if Claude returns mixed format or for future HTML-to-markdown needs. |
| zod | ^4.3.6 | Runtime validation | Validate video URLs, API responses, template schemas. Essential for pipeline reliability -- bad data at step 1 cascades through all steps. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| TypeScript | ^5.9.3 | Type checking | Strict mode enabled. Use `satisfies` operator for template type safety. |
| ESLint | ^10.0.3 | Linting | Use with next/core-web-vitals config. |
| Prettier | ^3.8.1 | Code formatting | Set up with Tailwind plugin for class sorting. |
| @tailwindcss/typography | ^0.5.19 | Prose styling | Apply `prose` class to the article preview area for beautiful rendered Markdown display. |

## Installation

```bash
# Core framework
npx create-next-app@latest videotokb --typescript --tailwind --eslint --app --src-dir

# Service SDKs
npm install assemblyai @anthropic-ai/sdk googleapis

# Video processing
npm install @distube/ytdl-core

# UI components
npm install lucide-react sonner clsx tailwind-merge class-variance-authority

# Content processing
npm install marked turndown zod

# Dev dependencies
npm install -D @tailwindcss/typography @types/turndown prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| AssemblyAI | Deepgram | If you need real-time streaming transcription (not relevant here -- video is pre-recorded). Deepgram is faster but AssemblyAI has better accuracy for varied audio quality. |
| AssemblyAI | OpenAI Whisper (self-hosted) | Never for this project. Self-hosting adds infrastructure complexity for no benefit. AssemblyAI's managed API is cheaper than running GPU instances. |
| @distube/ytdl-core | yt-dlp-exec (^1.0.2) | If ytdl-core breaks again (YouTube changes frequently). yt-dlp-exec wraps the Python yt-dlp binary which is more reliable but requires Python on the server -- problematic on Vercel serverless. Keep as fallback plan only. |
| Claude API | OpenAI GPT-4o | If Claude API has availability issues. GPT-4o is competent at structured writing but Claude is stronger at following complex formatting instructions and maintaining template consistency across articles. |
| Supabase | Neon + NextAuth | If you need more database flexibility. But Supabase bundles auth + DB + realtime in one service with a single SDK, reducing integration surface area. For an MVP, fewer services = faster shipping. |
| marked | react-markdown | If you want to render Markdown in React components (for the preview). react-markdown gives JSX output. But marked is better for the "Copy as HTML" feature since it outputs raw HTML strings. Use marked for both preview (via dangerouslySetInnerHTML with sanitization) and copy. |
| Tailwind CSS v4 | shadcn/ui | shadcn/ui is a component collection, not an alternative to Tailwind (it uses Tailwind). Consider adding shadcn/ui components if you want pre-built accessible form inputs and dialogs, but for MVP the app is simple enough to build with raw Tailwind + a few utility libraries. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| ytdl-core (original, v4.11.5) | Chronically broken. YouTube constantly changes their API, and the original maintainer is inactive. Breaks every few weeks. | @distube/ytdl-core -- actively maintained fork that patches YouTube changes quickly. |
| Prisma ORM | Overkill for this project. You have one table (articles, later users). Prisma adds cold start latency on serverless (schema engine binary). Supabase client queries PostgreSQL directly. | @supabase/supabase-js for database queries. Raw SQL via Supabase is fine for simple schemas. |
| Redux / Zustand | The app has minimal client state: a URL input, a template selection, and a processing status. React useState + useReducer handles this trivially. State management libraries add complexity for zero benefit here. | React built-in useState, useReducer. Lift state to a parent component or use URL search params for shareable state. |
| Express / Fastify | Next.js API routes (Route Handlers) cover all backend needs. A separate server means separate deployment, separate hosting, CORS configuration, and doubled infrastructure cost. | Next.js Route Handlers in `app/api/` directory. |
| Firebase | Supabase is the better choice here: open-source, PostgreSQL (real SQL), better free tier for this use case, and simpler auth integration with Next.js. Firebase's NoSQL model is wrong for structured article data. | Supabase for DB + Auth. |
| Cheerio / Puppeteer | You do not need to scrape video pages. Loom has an oEmbed API, YouTube has ytdl-core, Google Drive has the googleapis SDK. Scraping is fragile and unnecessary. | Use official APIs and SDKs for each video source. |
| ffmpeg (server-side) | Do not download and transcode video on Vercel serverless functions. The 10-second timeout (or 60s on Pro) and 250MB tmp limit make this unreliable. | Let AssemblyAI handle the audio. Pass it a URL; it downloads and processes the audio itself. |

## Stack Patterns

**For the processing pipeline (API route):**
- Use a single long-running Route Handler at `POST /api/process`
- Use Server-Sent Events (SSE) to stream progress updates to the client (Downloading -> Transcribing -> Writing -> Done)
- Each stage calls the next: extract audio URL -> submit to AssemblyAI -> poll for completion -> send transcript to Claude -> stream article back
- Vercel Serverless Functions have a 10s timeout on Hobby, 60s on Pro, 300s on Enterprise. A 15-min video transcription takes ~1-3 minutes. You MUST use Vercel's `maxDuration` config (Pro plan: set to 300) or split into separate requests with polling.

**For the long-running pipeline on Vercel free tier:**
- Split the pipeline into stages with client-side polling
- Stage 1: `POST /api/process/start` -- extracts audio URL, submits to AssemblyAI, returns a transcript ID
- Stage 2: `GET /api/process/status?id=X` -- polls AssemblyAI for transcript completion (client polls every 3s)
- Stage 3: `POST /api/process/generate` -- sends completed transcript to Claude, streams article back via SSE
- This keeps each request under 10 seconds, compatible with Vercel Hobby plan

**For the article preview:**
- Render Markdown to HTML using `marked`, display in a `<div className="prose">` with @tailwindcss/typography
- Sanitize HTML output before rendering (use DOMPurify or similar)
- For "Copy as Markdown" -- just copy the raw string
- For "Copy as HTML" -- copy the marked output

**For Google Doc export:**
- Use googleapis to create a Google Doc via the Docs API
- Convert Markdown to Google Docs format (paragraphs, headings, lists) using the Docs API batchUpdate method
- Alternatively, upload as HTML to Google Drive with `mimeType: 'application/vnd.google-apps.document'` and Google auto-converts -- simpler approach, good enough for MVP

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16 | react@19, react-dom@19 | Next.js 16 requires React 19. Do not downgrade React. |
| tailwindcss@4 | @tailwindcss/typography@0.5 | Tailwind v4 uses CSS-first config via `@import "tailwindcss"` in CSS. The typography plugin works but check import syntax. |
| assemblyai@4 | Node.js 18+ | SDK requires Node 18+. Vercel serverless runs Node 20 by default, so no issue. |
| @anthropic-ai/sdk@0.78 | Node.js 18+ | Supports streaming via async iterators. |
| zod@4 | TypeScript 5.5+ | Zod v4 dropped support for older TS versions. |

## Environment Variables

```env
# .env.local (never commit this file)
ASSEMBLYAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here

# Google APIs (for Google Drive download + Google Doc export)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# Supabase (add in Week 3 when auth is implemented)
# NEXT_PUBLIC_SUPABASE_URL=your_project_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Cost Estimate Per Article

| Service | Usage | Cost |
|---------|-------|------|
| AssemblyAI | 15 min transcription | ~$0.06 |
| Claude API | ~5K input tokens + ~2K output tokens | ~$0.05 |
| Vercel | Serverless function invocations | ~$0.00 (free tier) |
| **Total** | | **~$0.11/article** |

This confirms the ~$0.15 estimate in the project brief with margin for retries/errors.

## Sources

- npm registry (verified 2026-03-12) -- all version numbers confirmed via `npm view [package] version`
- Training data (May 2025 cutoff) -- architecture patterns, library comparisons, Vercel serverless limits. MEDIUM confidence on specifics that may have changed.
- AssemblyAI pricing from training data -- $0.00416/sec (~$0.25/min for async, but best-tier pricing closer to $0.01/min). LOW confidence on exact pricing; verify on assemblyai.com before launch.
- Claude API pricing from training data -- verify on anthropic.com before launch.
- Vercel function timeout limits from training data -- verify on vercel.com/docs for current plan limits.

---
*Stack research for: VideoToKB (video-to-KB article pipeline)*
*Researched: 2026-03-12*
