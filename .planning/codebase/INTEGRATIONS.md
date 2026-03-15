# External Integrations

**Analysis Date:** 2026-03-15

## APIs & External Services

**AI / Article Generation:**
- Anthropic Claude API - Drives all article generation (draft, structure, HTML) and company website scraping
  - SDK/Client: `@anthropic-ai/sdk`
  - Auth: `ANTHROPIC_API_KEY`
  - Model: `claude-sonnet-4-6` (hardcoded in `src/lib/article-generator.ts`)
  - Usage: `src/lib/article-generator.ts`, `src/app/api/scrape-context/route.ts`
  - Max retries: 3 with exponential backoff on 5xx/overloaded errors

**Audio Transcription:**
- AssemblyAI - Transcribes audio from Loom and Google Drive video URLs
  - SDK/Client: `assemblyai` npm package
  - Auth: `ASSEMBLYAI_API_KEY`
  - Usage: `src/lib/transcription.ts`
  - Features used: `auto_chapters`, `language_detection`, paragraph segmentation

**YouTube Transcripts:**
- YouTube InnerTube API - Primary method for YouTube caption extraction (free, no key)
  - Auth: None (cookie-based consent bypass)
  - Usage: `src/lib/youtube-resolver.ts` (`tryDirectExtraction`)
  - Clients tried: `TV_EMBEDDED` client config first, then `WEB` client config fallback
- Supadata API - Fallback when InnerTube is blocked on server IPs
  - SDK/Client: `@supadata/js`
  - Auth: `SUPADATA_API_KEY` (optional — gracefully skipped if absent)
  - Usage: `src/lib/youtube-resolver.ts` (`trySupadata`)
  - YouTube oEmbed used for fetching video titles: `https://www.youtube.com/oembed`

**Video URL Resolution:**
- Loom - Resolves share URLs to CDN MP4 download links via HTML scraping
  - Auth: None (public share links only)
  - Usage: `src/lib/loom-resolver.ts`
  - Method: Fetches `loom.com/share/{id}`, extracts `cdn.loom.com` MP4 URL or Apollo state
- Google Drive - Resolves file share URLs to direct download links
  - Auth: None (public files only)
  - Usage: `src/lib/gdrive-resolver.ts`
  - Method: Tries `drive.usercontent.google.com/download` then legacy `drive.google.com/uc` patterns

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser/SSR client)
  - Admin connection: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS)
  - Client (browser): `src/lib/supabase/client.ts` using `createBrowserClient` from `@supabase/ssr`
  - Client (server/API routes): `src/lib/supabase/server.ts` using `createServerClient` from `@supabase/ssr`
  - Client (admin): Instantiated inline in `src/lib/api-keys.ts` and `src/app/api/v1/generate/route.ts`

**Tables used (inferred from queries in `src/lib/supabase/queries.ts`):**
- `workspaces` - User workspaces with company context
- `workspace_preferences` - Per-workspace selected article type and platform
- `user_settings` - Active workspace ID per user
- `article_types` - Shared article type definitions with draft/structure prompts
- `platform_profiles` - Shared platform output profiles with HTML prompts/templates
- `articles` - Generated KB articles (workspace-scoped)
- `subscriptions` - User subscription records with plan/quota data
- `plans` - Available pricing plans
- `api_keys` - Hashed API keys for programmatic access

**RPC functions:**
- `get_user_usage(p_user_id)` - Calculates current period article usage vs limit

**Migrations:**
- `supabase/migration.sql` - Base schema
- `supabase/rls-migration.sql` - Row Level Security policies
- `supabase/workspace-migration.sql` - Workspace tables
- `supabase/api-keys-migration.sql` - API keys table
- `supabase/pricing-migration.sql` - Plans/subscriptions tables

**File Storage:**
- Local filesystem only for exports (Word .docx generated in-browser via `docx` + `file-saver`)

**Caching:**
- None (rate limiting is in-memory via `src/lib/rate-limit.ts`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Handles all user authentication
  - Implementation: Session stored in cookies; refreshed by Next.js middleware (`src/middleware.ts`)
  - Login flows supported: Magic Link (email OTP) and OAuth code exchange
  - Auth callback route: `src/app/auth/callback/route.ts` — handles both `?code=` (OAuth) and `?token_hash=` (Magic Link)
  - Middleware: `src/middleware.ts` — protects all routes except `/login` and `/auth/callback`; auto-redirects unauthenticated users to `/login`

**API Key Auth (programmatic):**
- Custom implementation in `src/lib/api-keys.ts`
  - Keys prefixed `vtk_` followed by 48 hex chars (24 random bytes)
  - Only SHA-256 hashes stored in `api_keys` table (raw key shown once at creation)
  - Validated in `src/app/api/v1/generate/route.ts` via `Authorization: Bearer vtk_...` header

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- `console.error` used selectively in API routes for non-critical failures (e.g., quota check errors, failed saves)

## CI/CD & Deployment

**Hosting:**
- Vercel (`vercel.json` present; Next.js native integration)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- `ANTHROPIC_API_KEY` - Anthropic Claude API (server-only)
- `ASSEMBLYAI_API_KEY` - AssemblyAI transcription (server-only)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public, used in browser and server)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (public, used in browser and server)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only, bypasses RLS; not in `.env.local.example` but required for API key management and v1 endpoint)

**Optional env vars:**
- `SUPADATA_API_KEY` - Supadata YouTube transcript fallback (server-only; gracefully skipped if absent)

**Secrets location:**
- `.env.local` (gitignored); example template at `.env.local.example`

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/callback` at `src/app/auth/callback/route.ts` - Supabase Auth OAuth/Magic Link callback

**Outgoing:**
- None (no webhooks sent to external services)

## MCP Server

**Separate Package:** `mcp-server/` — standalone Node.js MCP server for Claude integrations
- Calls KBify's own `/api/v1/generate` endpoint via API key auth
- SDK: `@modelcontextprotocol/sdk` 1.12.1
- Built separately: `mcp-server/package.json`, outputs to `mcp-server/dist/`
- Not deployed as part of the Next.js app

---

*Integration audit: 2026-03-15*
