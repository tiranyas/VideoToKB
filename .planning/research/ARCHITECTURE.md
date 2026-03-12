# Architecture Research

**Domain:** Video-to-KB article pipeline (content transformation SaaS)
**Researched:** 2026-03-12
**Confidence:** HIGH

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js React)                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ URL Form │  │ Progress UI  │  │ Article View │               │
│  │ + Template│  │ (SSE/polling)│  │ + Export     │               │
│  └─────┬────┘  └──────┬───────┘  └──────┬───────┘               │
│        │               │                 │                       │
├────────┴───────────────┴─────────────────┴───────────────────────┤
│                     API Routes (Next.js)                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ /api/    │  │ /api/        │  │ /api/        │               │
│  │ process  │  │ status       │  │ export       │               │
│  └─────┬────┘  └──────┬───────┘  └──────┬───────┘               │
│        │               │                 │                       │
├────────┴───────────────┴─────────────────┴───────────────────────┤
│                     Pipeline Services                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Video    │  │ Transcription│  │ Article      │               │
│  │ Resolver │  │ Service      │  │ Generator    │               │
│  └──────────┘  └──────────────┘  └──────────────┘               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                     External Services                            │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Loom/YT/ │  │ AssemblyAI   │  │ Claude API   │               │
│  │ GDrive   │  │              │  │ (Sonnet 4.5) │               │
│  └──────────┘  └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────────────────────┘
```

## The Core Constraint: Vercel Serverless Timeouts

This is the single most important architectural decision for this project. Verified from Vercel docs (2026-03-12):

| Plan | Default Max Duration | Maximum Duration (Fluid Compute ON) |
|------|---------------------|--------------------------------------|
| Hobby | 300s (5 min) | 300s (5 min) |
| Pro | 300s (5 min) | 800s (13 min) |
| Enterprise | 300s (5 min) | 800s (13 min) |

**With Fluid Compute disabled** (legacy): Hobby = 60s max, Pro = 300s max.

A 15-minute video transcription via AssemblyAI takes roughly 30-90 seconds. Claude article generation takes roughly 10-30 seconds. Video URL resolution is near-instant. Total pipeline time: **1-3 minutes** in the typical case, which fits within the 5-minute Hobby limit with Fluid Compute enabled.

**Confidence: HIGH** -- verified against official Vercel documentation.

### Architectural Decision: Single Long-Running Function vs. Chained Steps

**Recommendation: Single orchestrator function with streaming progress updates.**

Why NOT split into multiple chained functions:
- Adds complexity (state management between functions, retry logic per step)
- Still need somewhere to hold intermediate state (transcript text between steps)
- The total pipeline time (1-3 min) fits comfortably within the 5-min Hobby limit
- No benefit from parallelism -- steps are sequential by nature

Why a single orchestrator works:
- URL resolve -> transcribe -> generate article is inherently sequential
- Total wall time stays under 5 minutes for 15-min videos
- Use Server-Sent Events (SSE) to stream progress updates to the client in real time
- Simple error handling -- one try/catch, one response lifecycle

## Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **URL Form** | Capture video URL, validate format, select template, check guest limit | React component with client-side validation |
| **Progress UI** | Show step-by-step pipeline status in real time | React component consuming SSE stream |
| **Article View** | Display generated article, enable editing, trigger exports | Textarea/editor with copy/export buttons |
| **Pipeline API** (`/api/process`) | Orchestrate entire pipeline, stream progress via SSE | Next.js API route, `maxDuration = 300` |
| **Status API** (`/api/status`) | Fallback: poll-based status if SSE connection drops | Next.js API route (lightweight) |
| **Export API** (`/api/export`) | Convert Markdown to HTML or create Google Doc | Next.js API route |
| **Video Resolver** | Extract downloadable/streamable URL from Loom/YT/GDrive links | Service module with provider-specific logic |
| **Transcription Service** | Submit audio to AssemblyAI, poll for completion, return transcript | Service module wrapping AssemblyAI SDK |
| **Article Generator** | Send transcript + template to Claude, receive structured article | Service module wrapping Anthropic SDK |
| **Usage Tracker** | Track guest article count (localStorage client-side for MVP) | Client-side utility |

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Main page (URL form + pipeline UI)
│   ├── layout.tsx              # Root layout
│   ├── globals.css             # Global styles
│   └── api/                    # API routes
│       ├── process/
│       │   └── route.ts        # Pipeline orchestrator (SSE)
│       ├── export/
│       │   └── route.ts        # Markdown -> HTML / Google Doc
│       └── status/
│           └── route.ts        # Fallback status polling
├── components/                 # React components
│   ├── url-form.tsx            # Video URL input + template selection
│   ├── progress-display.tsx    # Step-by-step progress indicator
│   ├── article-view.tsx        # Generated article display + editing
│   └── export-buttons.tsx      # Copy/export action buttons
├── lib/                        # Backend service modules
│   ├── pipeline.ts             # Orchestrator: chains resolve -> transcribe -> generate
│   ├── video-resolver.ts       # URL parsing + audio URL extraction per provider
│   ├── transcription.ts        # AssemblyAI integration
│   ├── article-generator.ts    # Claude API integration
│   ├── templates/              # Article templates
│   │   ├── how-to.ts
│   │   ├── feature-explainer.ts
│   │   ├── troubleshooting.ts
│   │   └── onboarding.ts
│   ├── export.ts               # Markdown -> HTML, Google Doc creation
│   └── usage.ts                # Usage tracking helpers
├── types/                      # TypeScript type definitions
│   └── index.ts                # Shared types (PipelineStatus, Article, Template, etc.)
└── utils/                      # Client-side utilities
    └── guest-tracking.ts       # localStorage-based usage counter
```

### Structure Rationale

- **`lib/`:** All backend logic lives here, cleanly separated from API routes. Each service module has a single responsibility and can be tested independently. The pipeline orchestrator in `lib/pipeline.ts` is the only module that knows about the full flow.
- **`app/api/`:** Thin API route handlers that call into `lib/` services. They handle HTTP concerns (request parsing, SSE streaming, error responses) but contain no business logic.
- **`components/`:** Each component maps to a distinct UI state in the single-page flow (input -> processing -> result).
- **`lib/templates/`:** Article templates as code (not config files) because they contain Claude prompt engineering that benefits from TypeScript typing and version control.

## Architectural Patterns

### Pattern 1: SSE Streaming for Pipeline Progress

**What:** The pipeline API route uses Server-Sent Events to stream progress updates to the client as each step completes. The client sees real-time status without polling.

**When to use:** When a request takes 1-3 minutes and the user needs feedback that the system is working.

**Trade-offs:** SSE is simpler than WebSockets (unidirectional, works over HTTP/1.1, no special server config). Downside: if the connection drops mid-pipeline, the client loses updates. Mitigate with a fallback status endpoint.

**Example:**

```typescript
// app/api/process/route.ts
export const maxDuration = 300; // 5 minutes

export async function POST(req: Request) {
  const { videoUrl, template } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (step: string, status: string) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify({ step, status })}\n\n`)
        );
      };

      try {
        send('resolve', 'in_progress');
        const audioUrl = await resolveVideoUrl(videoUrl);
        send('resolve', 'complete');

        send('transcribe', 'in_progress');
        const transcript = await transcribe(audioUrl);
        send('transcribe', 'complete');

        send('generate', 'in_progress');
        const article = await generateArticle(transcript, template);
        send('generate', 'complete');

        send('result', JSON.stringify({ article }));
      } catch (error) {
        send('error', error.message);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Pattern 2: Provider Strategy for Video URL Resolution

**What:** A strategy pattern that routes video URL handling to provider-specific resolvers (Loom, YouTube, Google Drive). Each provider knows how to extract an audio-accessible URL from its input format.

**When to use:** When supporting multiple video sources with different APIs and URL structures.

**Trade-offs:** Clean separation, easy to add providers later. Slight over-engineering for 3 providers, but the URL extraction logic per provider is genuinely different enough to warrant separation.

**Example:**

```typescript
// lib/video-resolver.ts
type Provider = 'loom' | 'youtube' | 'gdrive';

interface ResolvedVideo {
  provider: Provider;
  audioUrl: string;
  title?: string;
  duration?: number;
}

export async function resolveVideoUrl(url: string): Promise<ResolvedVideo> {
  const provider = detectProvider(url);
  switch (provider) {
    case 'loom': return resolveLoom(url);
    case 'youtube': return resolveYouTube(url);
    case 'gdrive': return resolveGoogleDrive(url);
    default: throw new Error(`Unsupported video source: ${url}`);
  }
}

function detectProvider(url: string): Provider {
  if (url.includes('loom.com')) return 'loom';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('drive.google.com')) return 'gdrive';
  throw new Error('Unrecognized video URL');
}
```

### Pattern 3: Template-as-Prompt Configuration

**What:** Each article template (How-to, Feature Explainer, Troubleshooting, Onboarding) is a TypeScript module exporting a system prompt, expected sections, and formatting rules. The article generator composes the final Claude prompt from template + transcript.

**When to use:** When the same AI pipeline needs to produce structurally different outputs based on user selection.

**Trade-offs:** Templates in code (vs. database) is simpler for MVP and gives full TypeScript support. Moving to DB-stored templates later is straightforward if needed for user-customizable templates (v2).

**Example:**

```typescript
// lib/templates/how-to.ts
export const howToTemplate = {
  name: 'How-to Guide',
  systemPrompt: `You are a technical writer creating a step-by-step how-to article
for a knowledge base. Structure the article with: Title, Overview (1-2 sentences),
Prerequisites (if any), numbered Steps with clear actions, and a Summary.`,
  sections: ['title', 'overview', 'prerequisites', 'steps', 'summary'],
  formatting: {
    stepsFormat: 'numbered',
    includeScreenshotPlaceholders: true,
    maxWords: 1500,
  },
};
```

## Data Flow

### Primary Pipeline Flow

```
User pastes URL + selects template
    |
    v
[Client] POST /api/process { videoUrl, template }
    |
    v
[Pipeline Orchestrator] ---- SSE events ----> [Client Progress UI]
    |
    v
[Video Resolver] ---- detects provider, extracts audio URL
    |                  Loom: API call to get download URL
    |                  YouTube: yt-dlp or similar to get audio stream URL
    |                  GDrive: direct download URL construction
    v
[Transcription Service] ---- POST to AssemblyAI /v2/transcript
    |                         Poll GET /v2/transcript/{id} until complete
    |                         Returns: timestamped transcript text
    v
[Article Generator] ---- POST to Claude API
    |                     System prompt = template config
    |                     User message = transcript + instructions
    |                     Returns: structured Markdown article
    v
[Pipeline Orchestrator] ---- final SSE event with article ----> [Client]
    |
    v
[Article View] displays article, enables editing
    |
    v
[Export] ---- Copy as Markdown (client-side, no API call)
         ---- Copy as HTML (client-side Markdown->HTML conversion)
         ---- Export as Google Doc (POST /api/export, server-side Google Docs API)
```

### Export Flow

```
User clicks "Export as Google Doc"
    |
    v
[Client] POST /api/export { markdown, format: 'gdoc' }
    |
    v
[Export Service] converts Markdown -> Google Docs API format
    |             Creates doc via Google Docs API (service account)
    |             Returns: Google Doc URL
    v
[Client] opens Google Doc URL in new tab
```

### Usage Tracking Flow (MVP)

```
[Client] checks localStorage('videotokb_count')
    |
    ├── count < 3 → allow processing
    └── count >= 3 → show upgrade prompt

After successful article generation:
    localStorage('videotokb_count') = count + 1
```

## Key Data Types

```typescript
// types/index.ts

type VideoProvider = 'loom' | 'youtube' | 'gdrive';
type TemplateType = 'how-to' | 'feature-explainer' | 'troubleshooting' | 'onboarding';
type PipelineStep = 'resolve' | 'transcribe' | 'generate';
type StepStatus = 'pending' | 'in_progress' | 'complete' | 'error';

interface PipelineRequest {
  videoUrl: string;
  template: TemplateType;
}

interface PipelineProgress {
  step: PipelineStep;
  status: StepStatus;
  error?: string;
}

interface PipelineResult {
  article: string;         // Markdown content
  title: string;
  videoProvider: VideoProvider;
  transcriptWordCount: number;
  articleWordCount: number;
}

interface ExportRequest {
  markdown: string;
  format: 'html' | 'gdoc';
  title: string;
}
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | Current architecture. Single Vercel function per request. No DB needed for MVP. |
| 100-1K users | Add Supabase for auth + usage tracking. Move from localStorage to server-side tracking. Add rate limiting per user. |
| 1K-10K users | Consider Vercel Pro for 13-min function timeout. Add request queuing if concurrent usage causes AssemblyAI rate limits. Cache transcripts (same video URL = same transcript). |
| 10K+ users | Move pipeline to dedicated compute (Railway, Fly.io, AWS Lambda with 15-min timeout). Vercel serves only the frontend + lightweight API proxy. Add job queue (BullMQ, Inngest). |

### Scaling Priorities

1. **First bottleneck: AssemblyAI rate limits.** Free tier has limited concurrent transcriptions. Solution: upgrade AssemblyAI plan, or queue requests.
2. **Second bottleneck: Claude API cost and rate limits.** At scale, article generation cost dominates. Solution: batch processing, caching, prompt optimization to reduce token usage.
3. **Third bottleneck: Vercel function concurrency.** Many simultaneous 3-minute functions consume significant function-hours. Solution: move to dedicated compute for the pipeline, keep Vercel for frontend.

## Anti-Patterns

### Anti-Pattern 1: Splitting the Pipeline into Multiple API Calls from the Client

**What people do:** Client calls `/api/resolve`, waits, then calls `/api/transcribe`, waits, then calls `/api/generate`. Each step is a separate HTTP request orchestrated by the client.

**Why it's wrong:** Exposes pipeline internals to the client. If the user closes the tab between steps, work is lost. Client becomes the orchestrator, adding complexity to frontend code. Intermediate data (transcript) must be sent back to client and then re-sent to server, wasting bandwidth.

**Do this instead:** Single `/api/process` endpoint that orchestrates all steps server-side and streams progress via SSE. The client only knows about progress events, not pipeline internals.

### Anti-Pattern 2: Storing Pipeline State in a Database for MVP

**What people do:** Create a jobs table, store status per step, poll from client every 2 seconds.

**Why it's wrong:** Massive over-engineering for MVP. Requires a database before you need one. Adds write latency to every step. Polling creates unnecessary API calls. The pipeline completes in 1-3 minutes -- SSE handles this elegantly without persistence.

**Do this instead:** Use SSE for real-time progress. Only add database-backed job tracking when you need it (async processing, retries, history).

### Anti-Pattern 3: Downloading Video Files to Vercel's /tmp

**What people do:** Download the full video file to `/tmp` on Vercel before sending it to transcription.

**Why it's wrong:** Vercel's `/tmp` is 500 MB max and shared across invocations. Video files can be large. Download time eats into the function timeout. AssemblyAI can accept URLs directly -- no need to download.

**Do this instead:** Pass the audio/video URL directly to AssemblyAI. AssemblyAI fetches the file itself. Your function never handles video file bytes.

### Anti-Pattern 4: Using WebSockets for Progress Updates

**What people do:** Set up a WebSocket server for real-time progress.

**Why it's wrong:** Vercel does not natively support persistent WebSocket connections. Would require a separate WebSocket service (Pusher, Ably, or a custom server), adding cost and complexity for a simple unidirectional data stream.

**Do this instead:** Use SSE (Server-Sent Events). They work over standard HTTP, are supported by Vercel's streaming response, and are perfect for server-to-client progress updates.

## Integration Points

### External Services

| Service | Integration Pattern | Key Considerations |
|---------|--------------------|--------------------|
| **AssemblyAI** | REST API. POST audio URL to `/v2/transcript`, poll `/v2/transcript/{id}` until `status: completed`. SDK available (`assemblyai` npm). | Async by nature. Polling interval: 3-5 seconds. Supports webhooks but polling is simpler for a single-function pipeline. |
| **Claude API** | REST API via Anthropic SDK (`@anthropic-ai/sdk`). Single `messages.create()` call with system prompt (template) + user message (transcript). | Use `claude-sonnet-4-5` as specified. Set `max_tokens` appropriately (~4000 for articles). Consider streaming the Claude response for perceived speed. |
| **Loom** | Loom has a developer API for fetching video metadata and download URLs. Requires API key. | Check if public videos can be accessed without auth. Private videos need Loom API access. |
| **YouTube** | No official download API. Options: `yt-dlp` (not viable on Vercel -- binary dependency), `youtube-transcript` npm package (for transcripts only), or third-party API. | **Critical decision point.** Consider: just use YouTube's auto-generated captions instead of downloading audio + re-transcribing. Saves cost and avoids download complexity. Falls back to AssemblyAI only when captions unavailable. |
| **Google Drive** | Google Drive API for file access. Need service account or OAuth. Can construct direct download URLs for publicly shared files. | Simpler for public files. Private files need OAuth flow (defer to post-MVP). |
| **Google Docs API** | Create doc via `googleapis` npm package. Insert Markdown-converted content. | Requires service account with Docs API enabled. Alternative: generate a `.docx` file client-side using a library like `docx` and skip Google API entirely for MVP. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client <-> Pipeline API | SSE stream (server to client), single POST (client to server) | Client sends request once, receives stream of events |
| Pipeline Orchestrator <-> Services | Direct function calls (same process) | No network boundary -- all in the same serverless function invocation |
| Client <-> Export API | Request/Response (standard REST) | Only called when user explicitly exports |

## Build Order (Dependencies)

The pipeline has clear sequential dependencies that inform which components to build first:

```
Phase 1: Core Pipeline (build bottom-up)
  1. Video Resolver (Loom first -- simplest API)
  2. Transcription Service (AssemblyAI integration)
  3. Article Generator (Claude API + one template)
  4. Pipeline Orchestrator (chains 1-2-3)
  5. Process API route (SSE streaming)

Phase 2: Frontend
  6. URL Form component
  7. Progress Display component
  8. Article View component (read-only first)

Phase 3: Polish
  9. Remaining templates (3 more)
  10. Copy as Markdown / HTML (client-side)
  11. Guest usage tracking (localStorage)

Phase 4: Exports + Additional Providers
  12. Google Doc export
  13. YouTube provider
  14. Google Drive provider
```

**Rationale:** Build the pipeline first because it is the core value and the riskiest part (external API integrations). Frontend is straightforward React. Export and additional providers are incremental additions that don't change the architecture.

## Sources

- Vercel Functions Duration Limits: https://vercel.com/docs/functions/configuring-functions/duration (verified 2026-03-12, HIGH confidence)
- Vercel Functions Runtimes (filesystem, streaming, constraints): https://vercel.com/docs/functions/runtimes (verified 2026-03-12, HIGH confidence)
- AssemblyAI transcription workflow: training data knowledge (MEDIUM confidence -- standard REST API pattern is well-established, but verify SDK specifics during implementation)
- Claude API / Anthropic SDK: training data knowledge (HIGH confidence -- well-established SDK pattern)
- SSE on Vercel: supported via `ReadableStream` responses in Next.js App Router (HIGH confidence -- documented pattern)

---
*Architecture research for: VideoToKB -- video-to-KB article pipeline*
*Researched: 2026-03-12*
