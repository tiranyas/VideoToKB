# Pitfalls Research

**Domain:** Video-to-KB article pipeline (Loom/YouTube/Drive -> transcription -> LLM -> structured article)
**Researched:** 2026-03-12
**Confidence:** HIGH (Vercel limits verified via official docs; AssemblyAI, Claude API, Google Docs API based on training data -- MEDIUM confidence on those specifics)

## Critical Pitfalls

### Pitfall 1: Vercel Serverless Timeout Kills the Pipeline Mid-Processing

**What goes wrong:**
The entire video-to-article pipeline (download video -> transcribe -> generate article) takes 1-3+ minutes. Developers build this as a single API route that calls AssemblyAI, waits for transcription, then calls Claude. The Vercel function times out mid-execution and the user gets a 504 error with no result and no way to recover.

**Why it happens:**
Developers think of the pipeline as one logical operation and implement it as one HTTP request. With fluid compute enabled (Vercel default), Hobby tier maxes at 300s (5 minutes) and Pro at 800s (13 minutes). Without fluid compute, Hobby is 60s and Pro is 300s. The transcription step alone can take 30-120 seconds for a 15-minute video, and Claude generation adds another 10-30 seconds. A single synchronous route is fragile even when it technically fits within limits.

**How to avoid:**
Split the pipeline into discrete steps with separate API routes:
1. `/api/process/start` -- accepts URL, validates it, creates a job record, returns a job ID immediately
2. Use AssemblyAI webhooks to receive transcription completion (no polling inside a serverless function)
3. `/api/process/generate` -- triggered by webhook or polling, calls Claude with the transcript
4. `/api/process/status` -- client polls this for progress updates

Each step is a short-lived function. The client polls `/api/process/status` for the progress UI (Downloading -> Transcribing -> Writing -> Done).

**Warning signs:**
- API route has `await` chains longer than 3 steps
- `maxDuration` set to 300 in route config
- No job/task abstraction -- everything is inline
- Local dev works fine but Vercel preview deployments fail with 504s

**Phase to address:**
Phase 1 (Core Pipeline) -- this is foundational architecture. Getting this wrong means rewriting the entire backend later.

---

### Pitfall 2: AssemblyAI Webhook Configuration Complexity on Vercel

**What goes wrong:**
Developers choose webhooks over polling (correct instinct) but struggle with: (a) webhooks require a publicly accessible URL, which means you cannot test locally without a tunnel, (b) webhook payloads need verification to prevent spoofing, (c) webhook endpoints on Vercel can receive duplicate deliveries, (d) the webhook URL changes between preview and production deployments.

**Why it happens:**
AssemblyAI sends a POST to your webhook URL when transcription completes. In local dev, localhost is not reachable. On Vercel, each PR gets a unique preview URL, so hardcoded webhook URLs break. Developers often skip webhook auth validation because "it works without it."

**How to avoid:**
For MVP, use polling instead of webhooks. It is simpler and eliminates all webhook-related complexity:
- Submit transcription to AssemblyAI from one API route, store the transcript ID
- Client polls a status endpoint that checks `GET /v2/transcript/{id}` on AssemblyAI
- AssemblyAI polling is free and has no rate limit concerns at MVP scale

Move to webhooks only when you need to process videos in the background (post-MVP, when you have auth and a job queue). At that point, use `NEXT_PUBLIC_VERCEL_URL` environment variable to construct webhook URLs dynamically per deployment.

**Warning signs:**
- Spending more than a day on webhook setup in Phase 1
- Setting up ngrok/localtunnel for local development
- Hardcoded webhook URLs in code or env vars

**Phase to address:**
Phase 1 (Core Pipeline) -- decide polling vs webhook upfront. Polling for MVP, webhooks for v2.

---

### Pitfall 3: Claude API Token Limits and Cost Explosion on Long Transcripts

**What goes wrong:**
A 15-minute video produces roughly 2,000-3,500 words of transcript (depending on speaking pace). With timestamps and speaker labels, this can be 4,000-6,000 tokens. The prompt template, system instructions, and output combined can push requests toward 10,000-15,000 tokens. This works fine -- Claude Sonnet has a 200K context window. The real pitfall is **cost at scale**: input + output tokens on claude-sonnet-4-5 cost roughly $3/M input + $15/M output tokens. A single article generation might cost $0.03-0.08 per call. But developers often send the entire raw transcript (with filler words, timestamps for every word, and repetition) instead of a cleaned/condensed version, doubling token usage and cost.

**Why it happens:**
AssemblyAI returns very detailed transcripts with per-word timestamps, filler words ("um", "uh"), and repeated phrases. Developers dump the raw JSON into Claude without preprocessing, wasting tokens on noise that actively hurts article quality.

**How to avoid:**
1. Pre-process the transcript before sending to Claude: strip filler words, collapse timestamps to paragraph-level, remove speaker label repetition
2. Use paragraph-level timestamps from AssemblyAI (request `auto_chapters` or paragraph endpoints) instead of word-level
3. Set `max_tokens` on the Claude API call to a reasonable limit (2,000-4,000 tokens for a KB article)
4. Log token usage per request from day one -- add to your status/progress response so you can monitor costs
5. The 15-minute video cap is good cost control -- enforce it strictly server-side, not just client-side

**Warning signs:**
- Token usage per article exceeds 15,000 input tokens
- Cost per article exceeds $0.10
- Generated articles contain filler words or transcript artifacts ("um", "[inaudible]")
- No token usage logging in place

**Phase to address:**
Phase 1 (Core Pipeline) -- build transcript preprocessing into the pipeline from the start, not as an optimization later.

---

### Pitfall 4: Video URL Access Fails Silently for Private/Restricted Videos

**What goes wrong:**
Users paste a Loom, YouTube, or Google Drive URL. The system tries to download or access the video and fails because: (a) Loom videos may be restricted to workspace members, (b) YouTube videos may be unlisted/private, (c) Google Drive videos require OAuth or share-link permissions, (d) some URLs require authentication cookies to access. The failure is often silent -- you get an HTML error page instead of video data, or a 403 that is not handled gracefully.

**Why it happens:**
During development, you test with your own public videos. Real users share videos that have access restrictions they do not think about. Each platform has different access patterns:
- **Loom:** Public share links work. Workspace-only links return a login page. Loom's Developer API requires OAuth and a paid plan.
- **YouTube:** Public and unlisted videos can be accessed via yt-dlp or the YouTube Data API. Private videos cannot. Age-restricted videos need auth.
- **Google Drive:** "Anyone with the link" works. "Restricted" does not. Direct download requires constructing the right URL format and the file must be shareable.

**How to avoid:**
1. Validate URL accessibility BEFORE starting the pipeline. Make a HEAD request or lightweight fetch to confirm the video is downloadable. Return a clear error message: "This video appears to be private. Please make it public or use a share link."
2. For Loom: Use the public share URL format (`https://www.loom.com/share/{id}`). Extract the video ID and fetch the video URL from Loom's oEmbed endpoint or page metadata.
3. For YouTube: Use yt-dlp server-side (but be aware this adds a binary dependency -- see Pitfall 7). Alternatively, use AssemblyAI's direct URL transcription if they support YouTube URLs natively.
4. For Google Drive: Construct download URL from share link ID (`https://drive.google.com/uc?export=download&id={FILE_ID}`). This only works for files shared as "Anyone with the link."
5. Always set timeouts on video download attempts (30 seconds max) and handle all HTTP error codes explicitly.

**Warning signs:**
- Testing only with your own public videos
- No error handling for 403/401 responses on video fetch
- Video download step has no timeout
- Users reporting "stuck on Downloading" with no error

**Phase to address:**
Phase 1 (Core Pipeline) -- URL validation and error handling must be built into the first working version. Each video source (Loom, YouTube, Drive) needs its own access strategy.

---

### Pitfall 5: localStorage Free Tier Tracking is Trivially Bypassed

**What goes wrong:**
The 3-free-articles limit tracked via localStorage is cleared by: incognito mode, clearing browser data, switching browsers, switching devices, or a single line in the browser console (`localStorage.clear()`). This is a known limitation accepted for MVP, but the pitfall is **not planning for the migration path** to server-side tracking, leading to a messy transition later.

**Why it happens:**
localStorage is the right choice for MVP (no backend auth needed). The mistake is treating it as a permanent solution or not designing the data model to be easily migrated. Developers build localStorage-specific logic throughout the app instead of abstracting the usage tracking behind an interface.

**How to avoid:**
1. Abstract usage tracking behind a service interface from day one:
   ```typescript
   interface UsageTracker {
     getUsageCount(): Promise<number>;
     incrementUsage(): Promise<void>;
     canGenerate(): Promise<boolean>;
   }
   ```
2. Implement `LocalStorageUsageTracker` for MVP
3. When auth ships (Week 3 per PROJECT.md), swap in `SupabaseUsageTracker` with zero changes to consuming code
4. Store a structured object in localStorage, not just a counter: `{ count: 2, articles: [{id, date, videoUrl}] }` -- this data can be migrated to the database when users create accounts
5. Accept the bypass risk for MVP -- it is fine. The goal is validation, not revenue protection.

**Warning signs:**
- `localStorage.getItem('articleCount')` scattered across multiple components
- No abstraction layer for usage tracking
- No plan documented for migrating to server-side tracking

**Phase to address:**
Phase 1 (Core Pipeline) for the abstraction. Phase 2 (Auth) for the server-side implementation.

---

### Pitfall 6: Google Docs API Export is Far More Complex Than Expected

**What goes wrong:**
Developers estimate Google Doc export as a 1-2 day feature. In reality, the Google Docs API requires: (a) OAuth 2.0 with specific scopes (`https://www.googleapis.com/auth/documents`, `https://www.googleapis.com/auth/drive.file`), (b) creating a Google Cloud project with consent screen configuration, (c) handling token refresh, (d) the Docs API uses a complex structural format (not HTML/Markdown -- you insert content using `batchUpdate` with `InsertTextRequest`, `UpdateParagraphStyleRequest`, etc.), (e) formatting (headers, bold, lists) requires multiple sequential API calls. This is easily a 1-2 week feature.

**Why it happens:**
The Google Sheets/Docs API surface area is deceptively large. Developers assume they can "just create a doc and paste content." The API does not accept HTML or Markdown -- you must construct documents programmatically using the API's own structural format, which is very different from how you think about documents.

**How to avoid:**
Two options:

**Option A (recommended for MVP):** Skip the Docs API entirely. Generate the article as HTML, upload it as an HTML file to Google Drive using the Drive API (simpler than Docs API), and let Google Drive auto-convert it to a Google Doc. This preserves formatting and requires only the Drive API scope.

**Option B:** Use a library like `docs-markdown` or convert Markdown to the Google Docs API JSON format. But this still requires OAuth setup and consent screen.

**For MVP, consider deferring Google Doc export entirely.** "Copy as Markdown" and "Copy as HTML" cover 80% of the use case. Users can paste HTML into Google Docs manually. Ship Google Doc export in Phase 2 or later.

**Warning signs:**
- Estimating Google Doc export as a "simple API call"
- Not accounting for OAuth consent screen review time (Google may require verification for sensitive scopes)
- Building Google Docs formatting logic before the core pipeline works

**Phase to address:**
Phase 2 or Phase 3 -- do NOT include in Phase 1. Copy as Markdown/HTML is sufficient for MVP validation.

---

### Pitfall 7: yt-dlp/ffmpeg Binary Dependencies on Vercel Serverless

**What goes wrong:**
To download videos from YouTube (and sometimes Loom), developers reach for yt-dlp (a Python tool) or ffmpeg. These are native binaries that do not run in Vercel's serverless environment without custom Lambda layers or Docker-based deployments. Developers discover this after building the entire download pipeline locally.

**Why it happens:**
yt-dlp works perfectly in local development. It is the standard tool for downloading YouTube videos. But Vercel serverless functions run in a constrained Node.js environment without arbitrary binary execution.

**How to avoid:**
1. **Do not download videos server-side at all.** AssemblyAI accepts video/audio URLs directly for transcription. For YouTube, you can pass the URL to AssemblyAI -- check if they support direct YouTube URL transcription. If they do, the entire download step is eliminated.
2. If you must extract audio: use a Node.js-native approach like `ytdl-core` (or its maintained fork `@distube/ytdl-core`) for YouTube, which runs in Node.js without native dependencies.
3. For Loom: extract the video CDN URL from the Loom share page metadata (no download needed if AssemblyAI can fetch from CDN URL).
4. For Google Drive: construct a direct download URL and pass it to AssemblyAI.
5. If you absolutely need ffmpeg on Vercel, use `@ffmpeg/ffmpeg` (WebAssembly version), but this is slow and memory-intensive in serverless.

**Warning signs:**
- `pip install yt-dlp` or `brew install ffmpeg` in setup docs
- Subprocess calls to command-line tools in API routes
- "Works locally but fails on Vercel" reports

**Phase to address:**
Phase 1 (Core Pipeline) -- decide the video access strategy before writing any code. Test on Vercel preview deployments early.

---

### Pitfall 8: No Error Recovery -- Users Lose 3 Minutes of Waiting

**What goes wrong:**
The pipeline takes 1-3 minutes. If any step fails (video download, transcription, generation), the user has waited minutes with a progress indicator only to get a generic error. There is no way to retry from the failed step -- they must start over. This destroys trust in the product.

**Why it happens:**
Developers focus on the happy path. Each pipeline step is fire-and-forget. No intermediate results are stored, so a failure at the Claude generation step means the transcription (which took 90 seconds) is lost.

**How to avoid:**
1. Store intermediate results: save the transcript after AssemblyAI completes, save the generated article after Claude completes
2. If generation fails, offer "Retry generation" without re-transcribing
3. Show specific error messages: "Video could not be downloaded (check if it's public)" vs. "Transcription failed" vs. "Article generation failed"
4. For the progress UI, show which step failed and offer step-specific retry
5. Even without a database (MVP), store intermediate results in memory or a simple key-value store per job

**Warning signs:**
- Single try/catch around the entire pipeline
- Generic "Something went wrong" error messages
- No intermediate state storage
- Users reporting "it just says error"

**Phase to address:**
Phase 1 (Core Pipeline) -- error recovery is not a nice-to-have for a 3-minute process. Build it into the pipeline architecture from the start.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| localStorage for usage tracking | No auth needed, ships faster | Trivially bypassed, no analytics | MVP only -- migrate at auth phase |
| Polling AssemblyAI instead of webhooks | Simpler architecture, works locally | Client must keep page open, slightly more API calls | MVP and early growth -- switch to webhooks when background processing is needed |
| Raw transcript to Claude (no preprocessing) | Faster initial build | 2x token cost, worse article quality | Never -- preprocessing is simple and high-impact |
| Hardcoded templates in code | Quick iteration | Cannot add templates without deploy | MVP only -- move to DB/CMS when adding template customization |
| No job persistence (in-memory only) | No database dependency | Lost work on function cold starts, no retry | MVP only -- add Supabase job table when auth ships |
| Skipping Google Doc export | Eliminates OAuth complexity | Users must manually paste into Docs | Acceptable for MVP validation -- add in Phase 2+ |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| AssemblyAI | Sending a video URL that requires auth -- AssemblyAI cannot access private URLs | Validate URL accessibility from your server first, then pass a publicly accessible URL or upload the audio directly via AssemblyAI's upload endpoint |
| AssemblyAI | Not requesting useful features like `auto_chapters`, `speaker_labels`, `auto_highlights` | Enable `auto_chapters` for paragraph-level segmentation -- it dramatically improves article structure |
| Claude API | Sending raw transcript with word-level timestamps | Send paragraph-level text with chapter boundaries. Include the template structure in the system prompt, not the user message |
| Claude API | Not setting `max_tokens` -- response can be unexpectedly long or short | Set `max_tokens` to 3000-4000 for KB articles. Test with various transcript lengths |
| Loom | Using the page URL directly as video source | Extract video CDN URL from Loom's oEmbed endpoint (`https://www.loom.com/v1/oembed?url={share_url}`) or page metadata |
| YouTube | Using YouTube Data API (quota-limited, complex OAuth) for simple video access | Use `@distube/ytdl-core` or check if AssemblyAI accepts YouTube URLs directly |
| Google Drive | Assuming any share link allows download | Only "Anyone with the link" permissions allow programmatic download. Must handle the "virus scan" interstitial for large files |
| Google Docs API | Trying to insert formatted content in one API call | Docs API requires multiple `batchUpdate` requests for formatting. Use Drive API HTML upload instead |
| Vercel | Not setting `maxDuration` on pipeline API routes | Set `export const maxDuration = 300` (Hobby) or higher (Pro) on all pipeline routes. Without fluid compute, Hobby default is only 10 seconds |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling AssemblyAI too frequently from client | Excessive API calls, potential rate limiting | Poll every 3-5 seconds, not every 500ms. Use exponential backoff or fixed 5s interval | At 50+ concurrent users polling simultaneously |
| No request deduplication | Same video processed multiple times (user clicks submit twice) | Debounce submit button, check for in-flight jobs with same URL | Immediately -- users double-click |
| Large transcript in React state | Browser tab becomes sluggish, especially with rich text editor | Keep transcript in ref, not state. Only put the generated article in state | With transcripts > 5000 words |
| Video download buffering entire file into memory | Serverless function runs out of memory (1024MB default on Vercel) | Stream video to AssemblyAI upload endpoint or pass URL directly -- never buffer entire video | Videos > 5 minutes / > 100MB |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API keys (AssemblyAI, Claude, Google) in client-side code | Keys exposed in browser, stolen, used for abuse | All API calls through Next.js API routes. Keys only in `.env.local`, never prefixed with `NEXT_PUBLIC_` |
| No rate limiting on API routes | Attacker automates hundreds of requests, runs up API costs | Add rate limiting middleware (e.g., `next-rate-limit` or Vercel's built-in Edge Middleware rate limiting). Minimum: IP-based, 10 requests/hour for guest users |
| localStorage counter as security boundary | Users bypass free tier by clearing storage | Accept for MVP. Do not treat localStorage as a security mechanism. Plan server-side enforcement for paid tier |
| No input validation on video URLs | SSRF attacks -- attacker submits internal URLs to scan your network | Validate URLs against allowlist of domains (loom.com, youtube.com, youtu.be, drive.google.com). Reject all others |
| Storing user-submitted video content | Liability for copyrighted/inappropriate content | Do not store videos. Process in-flight and discard. Only store transcripts and generated articles |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No progress indicator during 1-3 min processing | User thinks app is broken, refreshes, loses progress | Show step-by-step progress: "Downloading video... Transcribing audio... Generating article..." with estimated time remaining |
| Generic error messages | User cannot fix the problem and gives up | Specific messages: "This video is private -- please make it public and try again" or "Video is too long (18 min) -- maximum is 15 minutes" |
| Article displayed in plain textarea | User cannot see formatting, thinks quality is low | Use a rich preview (rendered Markdown) with a toggle to see raw Markdown/HTML source |
| No way to adjust output after generation | User must re-run entire pipeline to tweak tone or structure | Add a "Regenerate with changes" option that re-sends transcript to Claude with modified instructions (costs ~$0.05 per retry, worth it for UX) |
| Copy button with no feedback | User unsure if copy worked | Show "Copied!" toast notification. Verify clipboard API is available, provide fallback for older browsers |
| Template selection with no preview | User does not know what "How-to" vs "Feature Explainer" produces | Show a brief description and example snippet for each template |

## "Looks Done But Isn't" Checklist

- [ ] **Video URL validation:** Often missing domain allowlist check -- verify it rejects non-video URLs and SSRF attempts
- [ ] **Transcript preprocessing:** Often missing filler word removal and timestamp cleanup -- verify cleaned transcript is sent to Claude
- [ ] **Error handling per pipeline step:** Often missing specific error types -- verify each step (download, transcribe, generate) has its own error handling and user-facing message
- [ ] **Rate limiting:** Often missing entirely in MVP -- verify at minimum IP-based rate limiting exists on `/api/process/start`
- [ ] **maxDuration config:** Often missing from API routes -- verify pipeline routes have `export const maxDuration = 300` (or appropriate value)
- [ ] **Mobile responsiveness:** Often forgotten for developer tools -- verify the progress UI and article preview work on mobile (users share links from mobile)
- [ ] **Clipboard API fallback:** Often missing -- verify copy buttons work in Safari and Firefox, not just Chrome
- [ ] **Video length validation:** Often only client-side -- verify server-side enforcement of 15-minute limit before starting transcription

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Vercel timeout killing pipeline | HIGH | Requires re-architecting to multi-step pipeline with job state. Cannot be fixed with config alone |
| Raw transcript causing bad articles | LOW | Add preprocessing function between AssemblyAI response and Claude request. No architecture change |
| No error recovery for users | MEDIUM | Add intermediate state storage and retry logic. Requires adding state management to pipeline |
| Google Doc export scope creep | LOW | Defer to later phase. Ship "Copy as HTML" which users can paste into Google Docs manually |
| localStorage bypassed | LOW | Accept for MVP. Migration to Supabase is straightforward when auth ships |
| yt-dlp binary dependency discovered on Vercel | HIGH | Must switch to Node.js-native solution or URL passthrough. May require rethinking video access for all sources |
| API key exposure in client code | HIGH | Audit all `NEXT_PUBLIC_` env vars. Move all API calls server-side. Rotate compromised keys immediately |
| Cost explosion from unoptimized prompts | MEDIUM | Add token usage logging, optimize prompts, add spending alerts on API provider dashboards |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Vercel timeout / pipeline architecture | Phase 1: Core Pipeline | API routes are short-lived (< 30s each). Job state exists. Client polls for status |
| AssemblyAI webhook vs polling | Phase 1: Core Pipeline | Polling works reliably. No webhook configuration needed for MVP |
| Claude token costs | Phase 1: Core Pipeline | Transcript preprocessing exists. Token usage logged per request. Cost per article < $0.10 |
| Video URL access failures | Phase 1: Core Pipeline | All three sources (Loom, YouTube, Drive) tested with public and private URLs. Clear error messages for each failure mode |
| localStorage bypass | Phase 1: MVP, Phase 2: Auth migration | Usage tracking abstracted behind interface. Supabase swap documented |
| Google Doc export complexity | Phase 2+: Post-MVP | Deferred from Phase 1. Copy as Markdown/HTML ships first |
| Binary dependencies on Vercel | Phase 1: Core Pipeline | All video access works on Vercel preview deployment. No native binaries |
| No error recovery | Phase 1: Core Pipeline | Each pipeline step has specific error handling. Failed generation can be retried without re-transcription |
| Rate limiting / abuse | Phase 1: Core Pipeline | IP-based rate limiting active. API keys server-side only |
| Input validation / SSRF | Phase 1: Core Pipeline | URL domain allowlist enforced server-side |

## Sources

- Vercel Functions Duration Docs (verified via official docs fetch): https://vercel.com/docs/functions/configuring-functions/duration -- Hobby: 300s max with fluid compute (60s without), Pro: 800s max with fluid compute (300s without)
- AssemblyAI API documentation (training data, MEDIUM confidence): webhook vs polling patterns, `auto_chapters` feature, URL transcription
- Anthropic Claude API documentation (training data, MEDIUM confidence): claude-sonnet-4-5 context window ~200K tokens, pricing ~$3/$15 per M tokens input/output
- Google Docs API documentation (training data, MEDIUM confidence): `batchUpdate` structural format, OAuth scope requirements
- Loom Developer API (training data, LOW confidence): oEmbed endpoint, video CDN URL extraction -- verify current availability
- Community patterns: yt-dlp limitations on serverless, `@distube/ytdl-core` as Node.js alternative

---
*Pitfalls research for: Video-to-KB article pipeline*
*Researched: 2026-03-12*
