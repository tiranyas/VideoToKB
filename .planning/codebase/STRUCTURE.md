# Codebase Structure

## Directory Layout

```
VideoToKB/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # Backend API endpoints
│   │   │   ├── account/        # Account management (delete, export)
│   │   │   ├── api-keys/       # API key CRUD
│   │   │   ├── process/        # Main video processing endpoint
│   │   │   ├── scrape-context/ # Context scraping
│   │   │   ├── scrape-template/# Template scraping
│   │   │   └── v1/generate/    # Public API v1 endpoint
│   │   ├── articles/           # Article pages
│   │   │   └── [id]/           # Dynamic article detail page
│   │   ├── auth/callback/      # Supabase auth callback
│   │   ├── dashboard/          # Workspace dashboard
│   │   ├── login/              # Login page
│   │   ├── privacy/            # Privacy policy
│   │   ├── settings/           # User settings
│   │   ├── terms/              # Terms of service
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing / home page
│   ├── components/             # Shared React components
│   │   ├── article-view.tsx    # Article display with inline editing
│   │   ├── cookie-consent.tsx  # Cookie consent banner
│   │   ├── onboarding-checklist.tsx
│   │   ├── progress-display.tsx # SSE progress streaming UI
│   │   ├── sidebar.tsx         # Navigation sidebar
│   │   ├── url-form.tsx        # URL input form
│   │   └── user-menu.tsx       # User dropdown menu
│   ├── contexts/               # React contexts
│   │   └── workspace-context.tsx # Multi-workspace state
│   ├── lib/                    # Core business logic
│   │   ├── __tests__/          # Unit tests (Vitest)
│   │   ├── supabase/           # Supabase client/server/queries
│   │   ├── templates/          # Article generation templates
│   │   ├── api-keys.ts         # API key management
│   │   ├── article-generator.ts # Claude-powered article generation
│   │   ├── gdrive-resolver.ts  # Google Drive URL resolver
│   │   ├── loom-resolver.ts    # Loom video resolver
│   │   ├── pipeline.ts         # Main processing pipeline
│   │   ├── rate-limit.ts       # In-memory rate limiter
│   │   ├── transcription.ts    # Audio transcription (Deepgram)
│   │   ├── word-export.ts      # Word document export
│   │   └── youtube-resolver.ts # YouTube transcript resolver
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # Central type exports
│   ├── utils/                  # Utility functions
│   │   └── cn.ts               # Tailwind class merging
│   └── middleware.ts           # Auth middleware
├── mcp-server/                 # MCP server (separate package)
│   └── src/index.ts            # MCP server entry
├── supabase/                   # Supabase config & migrations
├── public/                     # Static assets
├── vitest.config.ts            # Test configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
└── package.json                # Dependencies & scripts
```

## Key Locations

| Purpose | Location |
|---------|----------|
| API routes | `src/app/api/` |
| Pages | `src/app/*/page.tsx` |
| Business logic | `src/lib/` |
| DB queries | `src/lib/supabase/queries.ts` |
| Type definitions | `src/types/index.ts` |
| Tests | `src/lib/__tests__/` |
| Templates | `src/lib/templates/` |
| Components | `src/components/` |

## Naming Conventions

- **Files:** kebab-case (`article-generator.ts`, `url-form.tsx`)
- **Components:** PascalCase exports from kebab-case files
- **API routes:** `route.ts` in directory-based routing (`api/process/route.ts`)
- **Tests:** `[module].test.ts` in `__tests__/` directory
- **Types:** Centralized in `src/types/index.ts`

## Where to Add New Code

| Adding... | Put it in... |
|-----------|-------------|
| New API endpoint | `src/app/api/{name}/route.ts` |
| New page | `src/app/{name}/page.tsx` |
| New shared component | `src/components/{name}.tsx` |
| New business logic | `src/lib/{name}.ts` |
| New DB query | `src/lib/supabase/queries.ts` |
| New type | `src/types/index.ts` |
| New test | `src/lib/__tests__/{module}.test.ts` |
| New template | `src/lib/templates/{name}.ts` |
