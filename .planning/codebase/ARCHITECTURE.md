# Architecture

**Analysis Date:** 2026-03-15

## Pattern Overview

**Overall:** Next.js App Router full-stack SaaS with a multi-agent AI pipeline

**Key Characteristics:**
- Server Components for layout/auth, Client Components for interactive UI
- All AI processing runs server-side via streaming SSE API routes
- Supabase handles auth, database (PostgreSQL), and RLS-enforced data isolation
- Two distinct API surfaces: browser-facing (`/api/process`) and programmatic public API (`/api/v1/generate`)
- A companion MCP server (`mcp-server/`) wraps the public API for AI assistant use (Claude, etc.)

---

## Layers

**Middleware (Auth Guard):**
- Purpose: Protect all routes, redirect unauthenticated users
- Location: `src/middleware.ts`
- Contains: Session cookie validation, route guards, magic-link code interception
- Depends on: `@supabase/ssr` server client
- Used by: Every incoming Next.js request

**UI Pages (App Router):**
- Purpose: Render user-facing pages
- Location: `src/app/` — each subdirectory is a route segment
- Contains: React Server Components and `'use client'` pages
- Depends on: Components, contexts, Supabase client queries
- Used by: Browser

**API Routes (Server Actions via Route Handlers):**
- Purpose: Handle form submissions, pipeline execution, account management
- Location: `src/app/api/`
- Contains:
  - `process/route.ts` — primary pipeline endpoint (SSE streaming)
  - `v1/generate/route.ts` — public REST API (API key auth, JSON response)
  - `api-keys/route.ts` — manage API keys
  - `account/delete/route.ts` — GDPR account deletion
  - `account/export/route.ts` — data export
  - `scrape-context/route.ts` — scrape company context from URL
  - `scrape-template/route.ts` — scrape HTML template from URL
  - `auth/callback/route.ts` — Supabase OAuth/magic-link callback
- Depends on: `src/lib/` services, Supabase server client

**Pipeline Library (Core Domain Logic):**
- Purpose: Orchestrate the multi-step video-to-article conversion
- Location: `src/lib/pipeline.ts`
- Contains: `runPhaseA` (resolve → transcribe → draft → structure) and `runPhaseB` (HTML generation)
- Depends on: Resolvers, transcription, article-generator
- Used by: `src/app/api/process/route.ts`, `src/app/api/v1/generate/route.ts`

**Video Resolvers:**
- Purpose: Extract a usable video/audio URL from a share URL
- Location: `src/lib/loom-resolver.ts`, `src/lib/gdrive-resolver.ts`, `src/lib/youtube-resolver.ts`
- Contains: URL parsing, HTTP scraping, YouTube InnerTube + Supadata API fallback
- Depends on: External video platforms
- Used by: `src/lib/pipeline.ts`

**Transcription Service:**
- Purpose: Transcribe audio to text paragraphs
- Location: `src/lib/transcription.ts`
- Contains: AssemblyAI integration, filler-word removal, timestamp formatting
- Depends on: `assemblyai` SDK
- Used by: `src/lib/pipeline.ts`

**Article Generator (AI Agents):**
- Purpose: Call Claude Sonnet (claude-sonnet-4-6) as three distinct agents
- Location: `src/lib/article-generator.ts`
- Contains:
  - `generateDraft` — Agent 2: transcript → rough draft
  - `generateStructured` — Agent 3: draft → formatted article
  - `generateHTML` — Agent 4: article → platform-specific HTML
- Depends on: `@anthropic-ai/sdk`
- Used by: `src/lib/pipeline.ts`

**Prompt Templates:**
- Purpose: Default system prompts for article types and HTML conversion
- Location: `src/lib/templates/`
- Contains: `agent2-draft.ts` (draft + structure prompts), `agent4-html.ts`, `how-to.ts`
- Used by: Legacy pipeline fallback; prompts are also stored in Supabase `article_types` and `platform_profiles` tables

**Supabase Data Layer:**
- Purpose: All database read/write operations
- Location: `src/lib/supabase/queries.ts`
- Contains: Functions scoped to domain entities (workspaces, articles, article types, platform profiles, subscriptions, usage)
- Depends on: `@supabase/supabase-js` client
- Used by: API routes, client-side page components

**Supabase Client Factories:**
- Browser client: `src/lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`
- Server client: `src/lib/supabase/server.ts` — `createServerClient` from `@supabase/ssr`, cookie-based
- Admin client: Inline in `src/lib/api-keys.ts` and `src/app/api/v1/generate/route.ts` — service role key, bypasses RLS

**React Components:**
- Purpose: Reusable UI building blocks
- Location: `src/components/`
- Contains: `Sidebar`, `UrlForm`, `ProgressDisplay`, `ArticleView`, `OnboardingChecklist`, `UserMenu`, `CookieConsent`
- Depends on: Supabase browser client, workspace context

**Workspace Context:**
- Purpose: Global client-side state for multi-workspace switching
- Location: `src/contexts/workspace-context.tsx`
- Contains: `WorkspaceProvider`, `useWorkspace` hook
- State persisted in: `localStorage` (fast) + Supabase `user_settings.active_workspace_id` (persistent)
- Used by: All authenticated page components and `Sidebar`

**Cross-Cutting Utilities:**
- Rate limiter: `src/lib/rate-limit.ts` — in-memory sliding-window, per-user-ID
- API key management: `src/lib/api-keys.ts` — SHA-256 hashed, `vtk_` prefix
- Class name helper: `src/utils/cn.ts`
- Type definitions: `src/types/index.ts`

**MCP Server:**
- Purpose: Expose KBify to AI assistants via Model Context Protocol
- Location: `mcp-server/src/index.ts`
- Contains: `generate_article` and `list_articles` tools
- Depends on: KBify public REST API (`/api/v1/generate`), authenticated via `KBIFY_API_KEY`
- Transport: `stdio`

---

## Data Flow

**Primary Flow — Video to Article (Phase A, browser):**

1. User submits a video URL or transcript in `UrlForm` on `src/app/page.tsx`
2. Page POSTs to `/api/process` with `phase: 'generate'`
3. `src/app/api/process/route.ts` validates auth, rate-limits, checks quota, then opens an SSE stream
4. `runPhaseA` in `src/lib/pipeline.ts` is called; it detects the video provider
5. For Loom/GDrive: resolver fetches page HTML → extracts MP4 URL → AssemblyAI transcribes
6. For YouTube: `youtube-resolver.ts` tries InnerTube direct extraction, falls back to Supadata API
7. Cleaned transcript flows into `generateDraft` (Agent 2) → `generateStructured` (Agent 3)
8. Each stage emits `ProgressEvent` objects over the SSE stream
9. On `step: 'review'`, the client receives the markdown article and displays it for editing
10. Article is auto-saved to Supabase `articles` table via `saveArticle`

**Secondary Flow — HTML Generation (Phase B, browser):**

1. User clicks "Generate HTML" from the review screen
2. Page POSTs to `/api/process` with `phase: 'html'` and the markdown article
3. `runPhaseB` calls `generateHTML` (Agent 4) using the selected `PlatformProfile`'s prompt + template
4. HTML is streamed back; on `step: 'done'`, article HTML is updated in Supabase via `updateArticleHtml`

**Public API Flow (`/api/v1/generate`):**

1. Caller authenticates with `Authorization: Bearer vtk_...` header
2. Key is SHA-256 hashed and validated against `api_keys` table
3. Workspace is resolved from request body → `user_settings` → first workspace
4. `runPhaseA` and optionally `runPhaseB` run synchronously (no SSE)
5. Article is saved to Supabase and full JSON response is returned

**Authentication Flow:**

1. Unauthenticated request hits middleware; redirect to `/login`
2. User submits email → Supabase sends magic link
3. Browser hits `/auth/callback?code=...` or `/auth/callback?token_hash=...`
4. `route.ts` exchanges code/token for session → redirect to `/`

**State Management:**

- Server state: Supabase (PostgreSQL with RLS)
- Client workspace state: `WorkspaceContext` (React Context + localStorage)
- In-flight pipeline state: `useState` in `src/app/page.tsx` (`phase`, `stepsA`, `stepsB`, `structuredArticle`, `finalHTML`)
- No global client state library (no Redux/Zustand)

---

## Key Abstractions

**ProgressEvent:**
- Purpose: Uniform SSE message shape throughout the pipeline
- Definition: `src/types/index.ts` — `{ step, status, message?, article?, html? }`
- Pattern: All pipeline functions accept `onProgress: (event: ProgressEvent) => void`

**PhaseAInput / PhaseBInput:**
- Purpose: Typed contracts for pipeline phase entry points
- Definition: `src/lib/pipeline.ts`
- Pattern: Callers build these objects; both browser and public API routes share the same pipeline

**ArticleType:**
- Purpose: Configures Agents 2+3 with custom system prompts
- Definition: `src/types/index.ts`
- Storage: Supabase `article_types` table (global shared, editable by all authenticated users)

**PlatformProfile:**
- Purpose: Configures Agent 4 with platform-specific HTML prompt and reference template
- Definition: `src/types/index.ts`
- Storage: Supabase `platform_profiles` table

**Workspace:**
- Purpose: Scopes articles, preferences, and company context per user/team
- Definition: `src/types/index.ts`
- Storage: Supabase `workspaces` table, with `workspace_preferences` for per-workspace settings

---

## Entry Points

**Root page (article generation):**
- Location: `src/app/page.tsx`
- Triggers: Direct navigation to `/`
- Responsibilities: Full Phase A + Phase B UI state machine

**Root layout:**
- Location: `src/app/layout.tsx`
- Triggers: All page renders
- Responsibilities: Auth check, conditional `WorkspaceProvider` + `Sidebar`, toast notifications

**Middleware:**
- Location: `src/middleware.ts`
- Triggers: Every HTTP request (except static assets)
- Responsibilities: Session validation, route protection, magic-link forwarding

**Primary API endpoint:**
- Location: `src/app/api/process/route.ts`
- Triggers: `POST /api/process`
- Responsibilities: Auth, rate limit, quota check, SSE stream wrapping pipeline phases

**Public REST API:**
- Location: `src/app/api/v1/generate/route.ts`
- Triggers: `POST /api/v1/generate` with `Bearer vtk_...`
- Responsibilities: API key auth, workspace resolution, sync pipeline, JSON response

**Auth callback:**
- Location: `src/app/auth/callback/route.ts`
- Triggers: `GET /auth/callback` (from Supabase email links)
- Responsibilities: Session exchange, redirect to app

---

## Error Handling

**Strategy:** Errors are surfaced as `ProgressEvent` objects with `step: 'error'` over SSE. API routes return JSON error objects with appropriate HTTP status codes.

**Patterns:**
- Pipeline errors emit `{ step: 'error', status: 'error', message }` and stop processing (early return)
- YouTube blocking is a specific error code (`youtube_blocked`) the client intercepts to show manual instructions
- Claude API errors are retried up to 3 times for 5xx/overload errors in `src/lib/article-generator.ts`
- Quota check errors are non-blocking by design (`console.error` + request allowed)
- Article save failures are non-blocking in the browser flow (`.catch(() => {})`)
- All async errors in API routes are wrapped in try/catch; unhandled throws produce a 500 JSON response

---

## Cross-Cutting Concerns

**Logging:** `console.error` for non-critical failures; no structured logging framework
**Validation:** Inline input validation in API route handlers before calling pipeline
**Authentication:** Two paths — cookie-based session (browser) via `src/lib/supabase/server.ts`; API key (programmatic) via `src/lib/api-keys.ts`
**Rate Limiting:** In-memory sliding-window limiter (`src/lib/rate-limit.ts`) — 10 req/min for `/api/process`, 5 req/min for `/api/v1/generate`
**Quota enforcement:** Supabase `get_user_usage` RPC + subscription table, checked per `generate` request only (not HTML)
**Multi-tenancy:** All data is workspace-scoped; RLS policies enforce `user_id` ownership at the database level

---

*Architecture analysis: 2026-03-15*
