# Technology Stack

**Analysis Date:** 2026-03-15

## Languages

**Primary:**
- TypeScript 5.x - All application code (`src/`) and MCP server (`mcp-server/src/`)

**Secondary:**
- SQL - Supabase migrations (`supabase/*.sql`)

## Runtime

**Environment:**
- Node.js >= 18 (required by mcp-server `engines` field; Next.js runtime on Vercel)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (root); `mcp-server/package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework; App Router used throughout `src/app/`
- React 19.2.3 - UI rendering; all components use React Server Components or Client Components

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS; configured via `postcss.config.mjs`
- `@tailwindcss/typography` 0.5.x - Prose/article rendering
- `tailwind-merge` 3.x - Conditional class merging utility at `src/utils/cn.ts`

**Testing:**
- Vitest 4.x - Test runner; config at `vitest.config.ts`
- `@vitejs/plugin-react` 6.x - React plugin for Vitest

**Build/Dev:**
- Next.js CLI (`next dev`, `next build`, `next start`) - Development and production build
- TypeScript compiler (`tsc`) - MCP server build only
- PostCSS - CSS processing via `postcss.config.mjs`

## Key Dependencies

**AI / LLM:**
- `@anthropic-ai/sdk` 0.78.0 - Anthropic Claude API client; used in `src/lib/article-generator.ts` and `src/app/api/scrape-context/route.ts`
- Model: `claude-sonnet-4-6` hardcoded in `src/lib/article-generator.ts`

**Transcription:**
- `assemblyai` 4.27.0 - Audio transcription for Loom and Google Drive videos; used in `src/lib/transcription.ts`
- Env var: `ASSEMBLYAI_API_KEY`

**YouTube Transcripts:**
- `@supadata/js` 1.4.0 - Fallback YouTube transcript API; used in `src/lib/youtube-resolver.ts`
- Env var: `SUPADATA_API_KEY`
- Primary method: Direct YouTube InnerTube API (free, no key required); Supadata is fallback

**Database / Auth:**
- `@supabase/supabase-js` 2.99.1 - Supabase JS client
- `@supabase/ssr` 0.9.0 - SSR-compatible Supabase client for Next.js middleware and server components

**Document Export:**
- `docx` 9.6.1 - Generate `.docx` Word files from Markdown; used in `src/lib/word-export.ts`
- `file-saver` 2.0.5 - Browser file download trigger

**UI Utilities:**
- `lucide-react` 0.577.0 - Icon library
- `sonner` 2.0.7 - Toast notifications
- `clsx` 2.1.1 - Conditional className utility
- `zod` 4.3.6 - Schema validation (used in both main app and MCP server)

**MCP Server:**
- `@modelcontextprotocol/sdk` 1.12.1 - MCP protocol implementation; separate package at `mcp-server/`

## Configuration

**Environment:**
- Configured via `.env.local` (gitignored); `.env.local.example` documents required vars
- Required vars: `ASSEMBLYAI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Additional server-only var used but not in example: `SUPABASE_SERVICE_ROLE_KEY` (used in `src/lib/api-keys.ts` and `src/app/api/v1/generate/route.ts`)
- Optional var: `SUPADATA_API_KEY` (fallback YouTube transcripts)

**Build:**
- `next.config.ts` - Minimal config, no special overrides
- `tsconfig.json` - Strict TypeScript; ES2017 target; path alias `@/*` → `src/*`
- `postcss.config.mjs` - PostCSS with Tailwind plugin
- `eslint.config.mjs` - ESLint with `eslint-config-next`
- `vitest.config.ts` - Vitest with React plugin; node environment; includes `src/**/*.test.ts`
- `vercel.json` - Minimal config; targets Vercel deployment

## Platform Requirements

**Development:**
- Node.js >= 18
- npm for package management

**Production:**
- Vercel (inferred from `vercel.json` presence and Next.js usage)
- Supabase project (database + auth)
- Max function duration: 300s for `/api/process` and `/api/v1/generate`; 60s for `/api/scrape-context`; 30s for `/api/scrape-template`

---

*Stack analysis: 2026-03-15*
