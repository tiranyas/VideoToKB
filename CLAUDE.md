# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run lint         # ESLint

# Tests (Vitest)
npx vitest run                          # Run all tests once
npx vitest run src/lib/__tests__/pipeline.test.ts  # Run a single test file
npx vitest run --coverage               # Coverage report
npx vitest                              # Watch mode

# E2E Tests (Playwright)
npm run test:e2e                         # Run Playwright E2E tests

# MCP Server (separate package in mcp-server/)
cd mcp-server && npm run build          # Compile TypeScript → dist/
cd mcp-server && npm start              # Run compiled MCP server
```

## Architecture

KBPipe is a Next.js App Router SaaS that converts video URLs into KB articles using a multi-agent Claude pipeline.

### Core pipeline (`src/lib/pipeline.ts`)

Two phases shared by both the browser endpoint and the public API:

- **Phase A** (`runPhaseA`): resolve video URL → transcribe audio (AssemblyAI) → Agent 2 generates draft → Agent 3 structures article
- **Phase B** (`runPhaseB`): Agent 4 converts structured article → platform-specific HTML

All pipeline functions accept `onProgress: (event: ProgressEvent) => void`. The browser endpoint (`/api/process`) streams these as SSE; the public API (`/api/v1/generate`) collects them synchronously.

### AI agents (`src/lib/article-generator.ts`)

Three Claude calls using `claude-sonnet-4-6`:
- `generateDraft` — transcript → rough draft (uses `ArticleType` prompts)
- `generateStructured` — draft → formatted markdown article
- `generateHTML` — article → platform-specific HTML (uses `PlatformProfile` prompt + template)

Retries up to 3× on 5xx/overloaded errors with exponential backoff.

### Video resolvers

- `loom-resolver.ts` — scrapes Loom share page for CDN MP4 URL
- `gdrive-resolver.ts` — constructs direct download URL from Google Drive share URL
- `youtube-resolver.ts` — tries YouTube InnerTube API first (free), falls back to Supadata API

### Middleware & onboarding (`src/middleware.ts`)

- Protects all routes except public whitelist: `/login`, `/landing`, `/auth/*`, `/privacy`, `/terms`, `/security`, `/dpa`, `/docs`
- Checks `kbpipe-onboarded` cookie — redirects new users to `/onboarding`
- Forwards magic-link `?code=` params to `/auth/callback`

### Client-side state

- `WorkspaceContext` (`src/contexts/workspace-context.tsx`) — `useWorkspace()` hook, persists active workspace in localStorage + `user_settings` table
- No global state library — all client state via React Context or `useState`

### Auth & data

- **Browser sessions**: Cookie-based via `@supabase/ssr`; middleware at `src/middleware.ts` protects all routes except `/login` and `/auth/callback`
- **API key auth**: `vtk_`-prefixed keys, SHA-256 hashed in Supabase `api_keys` table, validated in `/api/v1/generate`
- **Admin client**: Service role key (bypasses RLS) used only in `src/lib/api-keys.ts` and `src/app/api/v1/generate/route.ts`
- **Supabase client factories**: `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (SSR/API routes)
- **All DB queries**: `src/lib/supabase/queries.ts` — functions accept `supabase: SupabaseClient` as first param

### Key domain types (`src/types/index.ts`)

- `ArticleType` — configures Agents 2+3 prompts; stored in `article_types` table
- `PlatformProfile` — configures Agent 4 with HTML prompt + reference template; stored in `platform_profiles`
- `Workspace` — scopes all articles and preferences per user; `workspace_preferences` table stores selected article type and platform
- `ProgressEvent` — uniform SSE message shape: `{ step, status, message?, article?, html? }`

### MCP server (`mcp-server/`)

Standalone Node.js package that exposes `generate_article` and `list_articles` tools to AI assistants via stdio transport. Calls KBPipe's own `/api/v1/generate` endpoint. Built and versioned separately from the Next.js app.

### Integrations & templates

- **HelpJuice**: OAuth + article publishing at `src/lib/integrations/helpjuice.ts`
- **Resend**: Transactional emails at `src/lib/email.ts`
- **Prompt templates**: `src/lib/templates/` — agent system prompts per article type and platform (modify here to change AI behavior)

## Conventions

- **Path alias**: `@/` → `src/` throughout
- **Errors in pipeline**: Caught and emitted as `{ step: 'error', status: 'error', message }` — never rethrown
- **Errors in API routes**: Return `new Response(JSON.stringify({ error: '...' }), { status: NNN })`
- **DB rows**: snake_case columns mapped to camelCase TypeScript via explicit `mapXxxRow` helpers — never spread `...row`
- **Types**: All domain types exported from `src/types/index.ts`; no barrel files in `src/lib/`
- **Soft failures**: Quota checks and article saves are non-blocking — caught with `console.error` and request allowed through
- **Rate limiting**: In-memory sliding-window (`src/lib/rate-limit.ts`) — 10 req/min for `/api/process`, 5 req/min for `/api/v1/generate`

## Environment Variables

Required in `.env.local` (see `.env.local.example`):
- `ANTHROPIC_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, not in example file — needed for API key management and v1 endpoint)

Optional:
- `SUPADATA_API_KEY` — YouTube transcript fallback (gracefully skipped if absent)
