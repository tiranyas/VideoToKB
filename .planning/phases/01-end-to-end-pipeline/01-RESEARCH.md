# Phase 1: End-to-End Pipeline - Research

**Researched:** 2026-03-12
**Domain:** Video-to-KB pipeline (Loom URL -> transcription -> article generation) with SSE progress, deployed on Vercel
**Confidence:** HIGH

## Summary

Phase 1 proves the core pipeline end-to-end: a user pastes a Loom share URL, sees real-time progress (Resolving, Transcribing, Generating, Done), and views a generated KB article in an editable text area. The entire flow must work on a Vercel deployment, not just localhost.

The architecture is a single Next.js 16 application with App Router. The pipeline runs as a single long-running Vercel function (up to 300s on Hobby with Fluid Compute, which is enabled by default) that streams progress via Server-Sent Events. Loom video URL extraction requires parsing the Loom share page to obtain a CDN MP4 URL (no official download API exists). AssemblyAI transcribes from the CDN URL directly. Claude (claude-sonnet-4-5) generates the article from a preprocessed transcript. For Phase 1, only one template ("How-to Guide") needs to be functional, though the UI shows the template dropdown.

**Primary recommendation:** Build bottom-up -- Loom resolver first, then AssemblyAI transcription service, then Claude article generator, then the pipeline orchestrator with SSE, then the frontend components. Deploy to Vercel early and test each integration on a real deployment, not just localhost.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UILP-01 | Homepage is a single centered input field with template dropdown and "Create Article" button | Standard Next.js App Router page component with Tailwind CSS styling |
| UILP-02 | No login, no dashboard, no navigation -- the URL input IS the homepage | Single `app/page.tsx` serves as the entire UI; no layout navigation needed |
| VINP-01 | User can paste a Loom share URL and submit it for processing | Loom resolver extracts CDN MP4 URL by fetching share page and parsing embedded Apollo state or CDN URL patterns |
| TRNS-01 | System transcribes video audio via AssemblyAI with timestamps | AssemblyAI SDK `client.transcripts.transcribe({ audio: cdnUrl })` with `auto_chapters: true` |
| TRNS-02 | System preprocesses transcript (strips filler words, collapses to paragraph-level timestamps) | Use AssemblyAI paragraphs endpoint + custom filler word stripping before sending to Claude |
| GENR-02 | System generates structured KB article via Claude API (claude-sonnet-4-5) | Anthropic SDK `messages.create()` with template system prompt + cleaned transcript |
| PRUX-01 | User sees step-by-step progress during processing (Resolving -> Transcribing -> Generating -> Done) | SSE streaming from pipeline route handler to React client component |
| PRUX-02 | System streams progress via SSE so user gets real-time feedback | ReadableStream-based SSE in Next.js route handler with proper headers |
| PRUX-03 | System shows specific, actionable error messages at each pipeline stage | Per-step try/catch in pipeline orchestrator, error events sent via SSE |
| OUTP-01 | User can view generated article in an editable text area | React textarea component with controlled state holding Markdown content |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | ^16.1.6 | Full-stack framework (App Router + API routes) | Standard for React on Vercel. Route Handlers replace separate backend. Server Components reduce bundle size. |
| React | ^19.2.4 | UI library | Ships with Next.js 16. Minimal client state needed (URL input, progress, article text). |
| TypeScript | ^5.9.3 | Type safety | Pipeline data flows through multiple stages; types prevent silent corruption between steps. |
| Tailwind CSS | ^4.2.1 | Styling | Utility-first, zero unused styles. v4 uses CSS-first configuration. |

### External Services

| Service | Purpose | Why This One |
|---------|---------|--------------|
| AssemblyAI | Audio transcription from URL | Accepts remote URLs directly (no video download needed). SDK handles polling. `auto_chapters` provides paragraph-level segmentation. |
| Claude API (claude-sonnet-4-5) | Article generation from transcript | Strong instruction-following for structured KB articles. 200K context window handles long transcripts. |
| Vercel | Hosting + deployment | Zero-config for Next.js. Fluid Compute enabled by default gives 300s function timeout on Hobby. |

### Service SDKs

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| assemblyai | ^4.26.1 | AssemblyAI Node.js SDK | Official SDK. `transcribe()` handles submission + polling. Typed responses. `paragraphs()` method for paragraph-level text. |
| @anthropic-ai/sdk | ^0.78.0 | Claude API SDK | Official SDK. Supports streaming. Typed message construction. |

### UI Libraries

| Library | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| zod | ^4.3.6 | Runtime validation | Validate Loom URLs, API responses. Essential for pipeline reliability. |
| clsx | ^2.1.1 | Conditional CSS classes | Tiny utility for Tailwind className strings. |
| tailwind-merge | ^3.5.0 | Merge Tailwind classes | Resolves conflicting Tailwind classes. Used with clsx as `cn()` utility. |
| sonner | ^2.0.7 | Toast notifications | For error messages, "Copied!" feedback. |
| lucide-react | ^0.577.0 | Icons | Lightweight, tree-shakeable. For progress step indicators, buttons. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single pipeline function | Multi-step API routes with client polling | Adds complexity for no benefit -- pipeline fits in 300s timeout |
| SSE streaming | WebSockets | Vercel does not support persistent WebSockets natively. SSE works over standard HTTP. |
| Parsing Loom share page | Loom Developer API | Loom's official API is a Record SDK, not a download API. No official way to get video download URL. |
| Custom Loom parsing | loom-downloader npm package | The package is a CLI tool, not a library. Extracting the logic is better than adding a CLI dependency. |

**Installation:**
```bash
# Create project
npx create-next-app@latest videotokb --typescript --tailwind --eslint --app --src-dir

# Service SDKs
npm install assemblyai @anthropic-ai/sdk

# UI + validation
npm install zod clsx tailwind-merge sonner lucide-react

# Dev dependencies
npm install -D @tailwindcss/typography
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Homepage: URL form + progress + result (single page)
│   ├── layout.tsx              # Root layout (minimal)
│   ├── globals.css             # Tailwind imports
│   └── api/
│       └── process/
│           └── route.ts        # Pipeline orchestrator (SSE streaming)
├── components/                 # React components
│   ├── url-form.tsx            # Video URL input + template dropdown + submit
│   ├── progress-display.tsx    # Step-by-step progress indicator
│   └── article-view.tsx        # Generated article in editable textarea
├── lib/                        # Backend service modules (server-only)
│   ├── pipeline.ts             # Orchestrator: chains resolve -> transcribe -> generate
│   ├── loom-resolver.ts        # Loom share URL -> CDN video URL extraction
│   ├── transcription.ts        # AssemblyAI integration + transcript preprocessing
│   ├── article-generator.ts    # Claude API integration + template prompt
│   └── templates/
│       └── how-to.ts           # How-to Guide template (only one for Phase 1)
├── types/
│   └── index.ts                # Shared types (PipelineStep, StepStatus, PipelineResult, etc.)
└── utils/
    └── cn.ts                   # clsx + tailwind-merge utility
```

### Pattern 1: SSE Streaming Pipeline with Immediate Response

**What:** The pipeline API route uses Server-Sent Events to stream progress. The critical pattern is returning the Response immediately and streaming asynchronously to avoid Next.js buffering.

**When to use:** Long-running server process (1-3 min) needing real-time client feedback.

**Example:**
```typescript
// app/api/process/route.ts
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { videoUrl, template } = await req.json();

  const stream = new ReadableStream({
    start(controller) {
      // Non-awaited async IIFE -- returns immediately so Response is sent
      (async () => {
        const send = (event: object) => {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        };

        try {
          send({ step: 'resolve', status: 'in_progress' });
          const videoInfo = await resolveLoomUrl(videoUrl);
          send({ step: 'resolve', status: 'complete' });

          send({ step: 'transcribe', status: 'in_progress' });
          const transcript = await transcribe(videoInfo.audioUrl);
          send({ step: 'transcribe', status: 'complete' });

          send({ step: 'generate', status: 'in_progress' });
          const article = await generateArticle(transcript, template);
          send({ step: 'generate', status: 'complete' });

          send({ step: 'done', status: 'complete', article });
        } catch (error) {
          send({ step: 'error', status: 'error', message: error.message });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
```

**Critical gotcha:** The async IIFE inside `start()` must NOT be awaited. If you `await` it, Next.js buffers the entire response. The Response must be returned immediately while the stream fills asynchronously in the background.

### Pattern 2: Loom URL Resolution via Page Parsing

**What:** Extract the CDN video URL from a Loom share page by fetching the HTML and parsing embedded data.

**When to use:** Resolving Loom share URLs to get an audio/video URL that AssemblyAI can fetch.

**Example:**
```typescript
// lib/loom-resolver.ts
interface LoomVideoInfo {
  videoUrl: string;
  title: string;
}

export async function resolveLoomUrl(shareUrl: string): Promise<LoomVideoInfo> {
  // Extract video ID from URL: https://www.loom.com/share/{32-char-hex-id}
  const match = shareUrl.match(/loom\.com\/share\/([a-f0-9]{32})/);
  if (!match) throw new Error('Invalid Loom URL format. Expected: https://www.loom.com/share/...');

  const videoId = match[1];

  // Fetch the share page and extract CDN URL from embedded data
  const response = await fetch(`https://www.loom.com/share/${videoId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error('Loom video not found. Check the URL.');
    if (response.status === 403) throw new Error('This Loom video is private. Make it public or use a share link.');
    throw new Error(`Could not access Loom video (HTTP ${response.status})`);
  }

  const html = await response.text();

  // Try CDN MP4 pattern first
  const cdnMatch = html.match(/https:\/\/cdn\.loom\.com\/sessions\/[^"'\s\\]+\.mp4/);
  if (cdnMatch) {
    return { videoUrl: cdnMatch[0], title: extractTitle(html) };
  }

  // Fallback: parse Apollo state for M3U8/transcoded URL
  const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s);
  if (apolloMatch) {
    const apolloData = JSON.parse(apolloMatch[1]);
    // Search for transcoded URL in Apollo data
    for (const key of Object.keys(apolloData)) {
      const val = apolloData[key];
      if (val?.url && typeof val.url === 'string' && val.url.includes('cdn.loom.com')) {
        return { videoUrl: val.url, title: extractTitle(html) };
      }
    }
  }

  throw new Error('Could not extract video URL from Loom. The video may be private or the page structure may have changed.');
}
```

**Important:** This approach parses Loom's page structure, which can change. Build the resolver to fail clearly (not silently) when parsing fails, so errors are immediately visible. This is a known fragility -- the PITFALLS research flagged this.

### Pattern 3: Transcript Preprocessing

**What:** Clean the raw AssemblyAI transcript before sending to Claude to reduce token usage and improve article quality.

**When to use:** Always -- between transcription and article generation.

**Example:**
```typescript
// lib/transcription.ts
const FILLER_WORDS = /\b(um|uh|like|you know|I mean|basically|actually|literally|right)\b/gi;

export function preprocessTranscript(paragraphs: { text: string; start: number; end: number }[]): string {
  return paragraphs
    .map(p => {
      const cleaned = p.text
        .replace(FILLER_WORDS, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      const timestamp = formatTimestamp(p.start);
      return `[${timestamp}] ${cleaned}`;
    })
    .filter(p => p.length > 10) // Remove near-empty paragraphs
    .join('\n\n');
}

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
```

### Anti-Patterns to Avoid

- **Awaiting the async IIFE in SSE `start()`:** This causes Next.js to buffer the entire response. The IIFE must be fire-and-forget inside `start()`.
- **Downloading video files to Vercel /tmp:** Vercel has a 500MB /tmp limit. Pass the CDN URL directly to AssemblyAI -- never handle video bytes.
- **Sending raw transcript to Claude:** Raw AssemblyAI output includes word-level timestamps, filler words, and noise. This doubles token usage and hurts article quality.
- **Splitting the pipeline into multiple client-orchestrated API calls:** Exposes pipeline internals to the client. If user closes tab between steps, work is lost. Use a single server-side orchestrator.
- **Using WebSockets for progress:** Vercel does not support persistent WebSocket connections. Use SSE.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio transcription | Custom Whisper/speech-to-text | AssemblyAI SDK | Accuracy, managed infrastructure, URL-based input, auto_chapters |
| Article generation | Custom NLP pipeline | Claude API (claude-sonnet-4-5) | 200K context, structured output, template instruction following |
| CSS utility composition | Custom `classNames` helper | clsx + tailwind-merge (`cn()`) | Standard pattern, handles Tailwind class conflicts correctly |
| Toast notifications | Custom notification system | sonner | Accessible, animated, well-tested |
| URL validation patterns | Regex from scratch | zod with custom refinements | Composable, reusable, good error messages |

**Key insight:** The pipeline's value is in orchestration and prompt engineering, not in transcription or generation technology. Use SDKs for all external services; hand-roll only the Loom resolver (no official SDK for this) and the pipeline orchestrator.

## Common Pitfalls

### Pitfall 1: SSE Buffering on Vercel/Next.js
**What goes wrong:** Progress events are buffered and all arrive at once when the function completes, instead of streaming in real time.
**Why it happens:** The async work inside `ReadableStream.start()` is awaited, causing Next.js to wait for the function to complete before sending the Response.
**How to avoid:** Use an un-awaited async IIFE inside `start()`. Return the Response immediately. Add `'X-Accel-Buffering': 'no'` header and `export const dynamic = 'force-dynamic'`.
**Warning signs:** All progress steps appear simultaneously after a long wait. Works in dev but not on Vercel.

### Pitfall 2: Loom URL Resolution Fragility
**What goes wrong:** Loom changes their page structure or CDN URL format, breaking the resolver silently.
**Why it happens:** There is no official Loom API for getting download URLs. The resolver parses page HTML, which is an unofficial integration.
**How to avoid:** Build multiple fallback extraction methods (CDN pattern match, Apollo state parsing). Fail loudly with a clear error message when all methods fail. Log the failure details for debugging. Test with real Loom URLs frequently.
**Warning signs:** "Could not extract video URL" errors appearing in production. Tests pass with cached HTML but fail with live URLs.

### Pitfall 3: AssemblyAI Polling Inside Serverless Function
**What goes wrong:** The `transcribe()` method polls AssemblyAI until completion, consuming serverless function execution time.
**Why it happens:** AssemblyAI transcription is async -- it takes 30-90 seconds for a 15-min video. The SDK's `transcribe()` method handles polling internally.
**How to avoid:** This is acceptable for Phase 1 because the total pipeline time (1-3 min) fits within the 300s Hobby plan limit with Fluid Compute. Monitor total execution time. If it approaches 4+ minutes, consider splitting into submit + poll architecture.
**Warning signs:** 504 timeout errors on Vercel. Function duration approaching 250s.

### Pitfall 4: Client SSE Connection Management
**What goes wrong:** User navigates away or connection drops, but the server function keeps running. Or the EventSource reconnects and gets no data because the function already completed.
**Why it happens:** SSE connections can drop due to network issues, mobile sleep, or user navigation. EventSource auto-reconnects by default, but the server function is a one-shot -- there is no state to resume from.
**How to avoid:** On the client, use `fetch()` with a ReadableStream reader instead of `EventSource` (since this is a POST request, not GET). Handle connection errors gracefully -- show a "Connection lost, please try again" message. Do NOT use `EventSource` for POST requests.
**Warning signs:** Using `EventSource` with a POST endpoint (EventSource only supports GET). No error handling for stream interruptions.

### Pitfall 5: API Keys in Client-Side Code
**What goes wrong:** AssemblyAI or Anthropic API keys exposed in browser, stolen, used for abuse.
**Why it happens:** Developer accidentally uses `NEXT_PUBLIC_` prefix on API key environment variables or imports server-side modules in client components.
**How to avoid:** All API calls go through Next.js API routes. Keys only in `.env.local`, never prefixed with `NEXT_PUBLIC_`. Use `server-only` package to prevent accidental client imports of lib/ modules.
**Warning signs:** `NEXT_PUBLIC_ASSEMBLYAI_API_KEY` in `.env.local`. Import of `lib/transcription.ts` in a client component.

## Code Examples

### AssemblyAI Transcription with auto_chapters and paragraphs

```typescript
// lib/transcription.ts
// Source: AssemblyAI Node.js SDK docs (https://github.com/AssemblyAI/assemblyai-node-sdk)
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export async function transcribeVideo(audioUrl: string) {
  const transcript = await client.transcripts.transcribe({
    audio: audioUrl,
    auto_chapters: true,
  });

  if (transcript.status === 'error') {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  // Get paragraph-level text for cleaner preprocessing
  const paragraphsResponse = await client.transcripts.paragraphs(transcript.id);

  return {
    text: transcript.text,
    chapters: transcript.chapters,
    paragraphs: paragraphsResponse.paragraphs,
    wordCount: transcript.words?.length ?? 0,
  };
}
```

### Claude Article Generation

```typescript
// lib/article-generator.ts
// Source: Anthropic SDK docs (https://docs.anthropic.com/en/api)
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function generateArticle(
  cleanedTranscript: string,
  templatePrompt: string,
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4000,
    system: templatePrompt,
    messages: [
      {
        role: 'user',
        content: `Generate a KB article from the following video transcript:\n\n${cleanedTranscript}`,
      },
    ],
  });

  const textBlock = message.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Article generation returned no text content');
  }

  return textBlock.text;
}
```

### Client-Side SSE Consumption (POST-based, not EventSource)

```typescript
// components/url-form.tsx (client component)
// Source: Web Streams API + SSE pattern for POST requests
async function processVideo(videoUrl: string, template: string) {
  const response = await fetch('/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoUrl, template }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Failed to start processing');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const event = JSON.parse(line.slice(6));
        // Update progress state based on event
        handleProgressEvent(event);
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel 10s Hobby timeout | 300s with Fluid Compute (default) | April 2025 | Single pipeline function is now viable on Hobby plan |
| ytdl-core for YouTube | @distube/ytdl-core fork | 2023+ | Original is broken; fork is actively maintained (not needed for Phase 1, Loom only) |
| tailwind.config.js | CSS-first config (Tailwind v4) | Late 2024 | No JS config file; use `@import "tailwindcss"` in CSS |
| Next.js pages router | App Router (stable since Next.js 13.4) | 2023 | Route Handlers, Server Components, streaming responses |
| EventSource for SSE | fetch() + ReadableStream | Always for POST | EventSource only supports GET; pipeline requires POST |

**Deprecated/outdated:**
- `ytdl-core` (original): Chronically broken, use `@distube/ytdl-core` if YouTube support needed later
- `tailwind.config.js`: Tailwind v4 uses CSS-first configuration
- Vercel 10s default timeout: No longer applies with Fluid Compute enabled

## Open Questions

1. **Loom CDN URL signed credentials**
   - What we know: CDN URLs may include CloudFront signed parameters (Policy, Signature, Key-Pair-Id) that expire
   - What's unclear: Whether AssemblyAI can fetch from these signed URLs before they expire, and how long the signatures are valid
   - Recommendation: Test with a real Loom video early. If signed URLs expire before AssemblyAI completes download, may need to use AssemblyAI's upload endpoint instead

2. **AssemblyAI rate limits on free/starter tier**
   - What we know: Free tier exists; concurrent transcription limits apply
   - What's unclear: Exact concurrent transcription limit on the tier the project will use
   - Recommendation: Test with the actual API key. At MVP scale (< 10 concurrent users), unlikely to hit limits

3. **Claude model ID format**
   - What we know: Requirements specify "claude-sonnet-4-5". Anthropic SDK requires the full model ID with date suffix.
   - What's unclear: The exact model ID string to use (e.g., `claude-sonnet-4-5-20250514` or similar)
   - Recommendation: Check Anthropic docs at implementation time for the current model ID. Use a constant so it is easy to update.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (latest, compatible with Next.js 16) |
| Config file | None -- Wave 0 must create `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| VINP-01 | Loom URL parsing + CDN URL extraction | unit | `npx vitest run src/lib/__tests__/loom-resolver.test.ts -t "loom"` | No -- Wave 0 |
| TRNS-01 | AssemblyAI transcription integration | integration | `npx vitest run src/lib/__tests__/transcription.test.ts` | No -- Wave 0 |
| TRNS-02 | Transcript preprocessing (filler removal, paragraph collapse) | unit | `npx vitest run src/lib/__tests__/transcription.test.ts -t "preprocess"` | No -- Wave 0 |
| GENR-02 | Claude article generation | integration | `npx vitest run src/lib/__tests__/article-generator.test.ts` | No -- Wave 0 |
| PRUX-01 | SSE progress events emitted in correct order | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts -t "progress"` | No -- Wave 0 |
| PRUX-03 | Error messages are specific per pipeline stage | unit | `npx vitest run src/lib/__tests__/pipeline.test.ts -t "error"` | No -- Wave 0 |
| PRUX-02 | SSE stream works end-to-end | e2e/manual | Manual test on Vercel deployment | N/A |
| UILP-01 | Homepage has URL input, template dropdown, submit button | manual | Visual inspection | N/A |
| UILP-02 | No navigation, no login, no dashboard | manual | Visual inspection | N/A |
| OUTP-01 | Article displayed in editable textarea | manual | Visual inspection | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (quick, unit tests only)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green + manual Vercel deployment test

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- Vitest configuration for Next.js project
- [ ] `src/lib/__tests__/loom-resolver.test.ts` -- Loom URL parsing and CDN URL extraction tests
- [ ] `src/lib/__tests__/transcription.test.ts` -- Transcript preprocessing tests (unit) + AssemblyAI integration (mocked)
- [ ] `src/lib/__tests__/article-generator.test.ts` -- Claude API integration tests (mocked)
- [ ] `src/lib/__tests__/pipeline.test.ts` -- Pipeline orchestrator tests (progress events, error handling)
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react`

## Sources

### Primary (HIGH confidence)
- [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute) -- Hobby plan 300s max duration with Fluid Compute (enabled by default since April 2025)
- [Vercel Functions Duration](https://vercel.com/docs/functions/configuring-functions/duration) -- `maxDuration` configuration, plan limits
- [AssemblyAI Node.js SDK](https://github.com/AssemblyAI/assemblyai-node-sdk) -- `transcribe()`, `paragraphs()`, `auto_chapters` usage
- [AssemblyAI Auto Chapters docs](https://www.assemblyai.com/docs/speech-understanding/auto-chapters) -- paragraph-level segmentation, chapter summaries

### Secondary (MEDIUM confidence)
- [Next.js SSE streaming patterns](https://upstash.com/blog/sse-streaming-llm-responses) -- ReadableStream SSE in App Router route handlers
- [SSE buffering fix](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) -- Non-awaited async IIFE pattern for immediate Response return
- [Loom video URL extraction](https://github.com/EcomGraduates/loom-downloader) -- Apollo state parsing, CDN URL patterns, fallback methods
- [yt-dlp Loom extractor](https://github.com/yt-dlp/yt-dlp/commit/36b29bb3532e008a2aaf3d36d1c6fc3944137930) -- Updated December 2025 for m3u8 and mp4 formats

### Tertiary (LOW confidence)
- Loom CDN URL signing/expiration behavior -- inferred from community tools, not officially documented
- Claude model ID exact format (claude-sonnet-4-5-*) -- verify at implementation time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- versions verified via npm registry, stack matches prior project research
- Architecture (SSE pipeline): HIGH -- verified Vercel Fluid Compute limits, SSE streaming pattern documented
- Loom resolution: MEDIUM -- no official API, relies on page parsing (fragile but well-understood)
- Pitfalls: HIGH -- verified Vercel timeout limits, SSE buffering issue documented by multiple sources
- Test infrastructure: HIGH -- greenfield project, all test files are Wave 0 gaps

**Research date:** 2026-03-12
**Valid until:** 2026-04-12 (30 days -- stack is stable; Loom parsing may need earlier re-verification)
