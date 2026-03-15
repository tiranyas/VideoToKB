# Coding Conventions

**Analysis Date:** 2026-03-15

## Naming Patterns

**Files:**
- React page components: `page.tsx` (Next.js App Router convention), e.g. `src/app/dashboard/page.tsx`
- React UI components: `kebab-case.tsx`, e.g. `src/components/url-form.tsx`, `src/components/article-view.tsx`
- API routes: `route.ts` inside `src/app/api/[path]/`
- Library modules: `kebab-case.ts`, e.g. `src/lib/article-generator.ts`, `src/lib/rate-limit.ts`
- Test files: `kebab-case.test.ts` inside `src/lib/__tests__/`
- Type files: `src/types/index.ts` (single barrel file for all domain types)
- Utility functions: `src/utils/cn.ts`

**Functions:**
- camelCase for all functions: `runPipeline`, `generateArticle`, `checkQuota`, `detectProvider`
- React components: PascalCase named exports, e.g. `export function UrlForm`, `export function ArticleView`
- Inline icons as local PascalCase functions: `function YouTubeIcon`, `function LoomIcon`
- Setup helpers in tests: descriptive camelCase, e.g. `setupSuccessfulPipeline()`

**Variables:**
- camelCase throughout: `cleanedTranscript`, `videoUrl`, `articleTypeId`
- Constants in SCREAMING_SNAKE_CASE at module scope: `const MODEL = 'claude-sonnet-4-6'`, `const MAX_RETRIES = 3`, `const PRUNE_INTERVAL = 60_000`
- Numeric literals use underscore separators: `60_000`, `4_000`

**Types and Interfaces:**
- PascalCase for all types and interfaces: `ProgressEvent`, `VideoInfo`, `ArticleType`, `WorkspacePreferences`
- `interface` for object shapes: `interface RequestBody { ... }`
- `type` for unions/aliases: `type PipelineStep = 'resolve' | 'transcribe' | ...`
- Exported from `src/types/index.ts` as a single source of truth
- `@deprecated` JSDoc tag on old type aliases: `/** @deprecated Use VideoInfo instead */ export type LoomVideoInfo = VideoInfo;`

**Database fields:**
- DB columns use `snake_case` (e.g. `user_id`, `article_type_id`)
- TypeScript properties use `camelCase` (e.g. `userId`, `articleTypeId`)
- Explicit mapping functions (`mapWorkspaceRow`) translate between the two conventions

## Code Style

**Formatting:**
- No Prettier config detected — formatting enforced through ESLint only
- Single quotes for strings in TypeScript: `import { cn } from '@/utils/cn'`
- Trailing semicolons present throughout
- Arrow functions for inline callbacks, `function` declarations for named top-level functions

**Linting:**
- ESLint 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config at `eslint.config.mjs`
- Run via: `npm run lint` (maps to `eslint`)
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Import Organization

**Order (observed):**
1. Framework/third-party imports: `import Anthropic from '@anthropic-ai/sdk'`
2. Internal path-alias imports: `import { runPipeline } from '@/lib/pipeline'`
3. Type-only imports last within groups: `import type { ProgressEvent } from '@/types'`

**Path Aliases:**
- `@/` maps to `src/` (configured in both `vitest.config.ts` and Next.js)
- Used consistently throughout: `@/lib/...`, `@/types`, `@/utils/cn`, `@/components/...`

**`'use client'` directive:**
- Present at top of all interactive React components: `src/components/url-form.tsx`, `src/components/sidebar.tsx`
- Absent from server components and API routes

## Error Handling

**API routes:** Consistent pattern — validate input, return JSON error with appropriate HTTP status:
```typescript
if (!user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

**Library functions:** Throw `Error` objects with descriptive messages. Pattern: check Supabase `error` object and throw immediately:
```typescript
if (error) throw new Error(`Failed to load workspaces: ${error.message}`);
```

**Pipeline/async operations:** Errors are caught and converted to `ProgressEvent` objects with `step: 'error'` and `status: 'error'` rather than thrown:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  onProgress({ step: 'error', status: 'error', message: `...${message}` });
}
```

**Error type narrowing:** Always narrow unknown errors before use:
```typescript
const message = error instanceof Error ? error.message : String(error);
```

**Retry logic:** In `src/lib/article-generator.ts`, server errors (5xx, overloaded) trigger retry with exponential backoff (`attempt * 2000` ms), up to `MAX_RETRIES = 3`.

**Soft failures:** Non-critical operations (quota check, DB save) catch errors and allow requests through rather than failing hard:
```typescript
} catch {
  // Don't block on quota check errors — let the request through
  console.error('Quota check failed, allowing request');
}
```

## Logging

**Framework:** `console.error` for error logging (no structured logging library)

**Patterns:**
- Used only for non-fatal soft failures in API routes: `console.error('Quota check failed, allowing request')`
- No `console.log` debug logging in production code
- User-facing feedback delivered via `sonner` toast library in React components: `toast.error('...')`

## Comments

**When to Comment:**
- JSDoc on public library functions explaining purpose and parameters: `src/lib/article-generator.ts`, `src/lib/rate-limit.ts`
- Inline section dividers using Unicode box-drawing: `// ── Phase A: Generate structured article ─────────────────`
- Short inline explanations for non-obvious logic: `// Wait before retrying: 2s, 4s`
- `@deprecated` JSDoc tags for backward-compat types

**JSDoc/TSDoc:**
- Used on exported library functions and complex interfaces
- Example from `src/lib/rate-limit.ts`:
  ```typescript
  /**
   * Simple in-memory sliding-window rate limiter.
   *
   * Usage in an API route:
   *   const limiter = rateLimit({ tokens: 10, interval: 60_000 });
   */
  ```

## Function Design

**Size:** Functions are kept focused — large pipeline orchestration split into `runPhaseA` / `runPhaseB` in `src/lib/pipeline.ts`

**Parameters:**
- Complex multi-parameter functions use a single input object: `runPhaseA(input: PhaseAInput, onProgress: callback)`
- Supabase queries consistently accept `supabase: SupabaseClient` as first parameter, matching a service-layer pattern
- Optional fields typed with `?` and defaulted with `??`

**Return Values:**
- Async functions return typed Promises: `Promise<Workspace[]>`, `Promise<string>`, `Promise<void>`
- `null` returned for "not found" queries (not thrown): `getWorkspace` returns `Workspace | null`
- DB query functions throw on error; return null on empty result

## Module Design

**Exports:**
- Named exports throughout — no default exports from library/utility modules
- Default export used only for Next.js conventions (pages, layout) and config files
- Components exported as named: `export function UrlForm(...)`

**Barrel Files:**
- `src/types/index.ts` is the single barrel for all domain types — import all types from `@/types`
- No barrel `index.ts` files in `src/lib/` — import specific files directly: `@/lib/pipeline`, `@/lib/supabase/queries`

**DB mapping pattern:**
- Each query module contains private `mapXxxRow` helpers to convert snake_case DB rows to camelCase TypeScript objects
- Explicit field-by-field mapping (never spread `...row`) for type safety: `src/lib/supabase/queries.ts`

---

*Convention analysis: 2026-03-15*
