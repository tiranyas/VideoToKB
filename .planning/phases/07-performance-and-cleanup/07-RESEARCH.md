# Phase 7: Performance and Cleanup - Research

**Researched:** 2026-03-15
**Domain:** Supabase PostgreSQL aggregation, SSE stream parsing, Next.js refactoring
**Confidence:** HIGH

## Summary

This phase addresses two distinct cleanup/performance issues in KBify: (1) the dashboard page fetches ALL articles client-side to compute stats that should be DB-aggregated, and (2) SSE parsing logic is duplicated across three files with nearly identical implementations.

The dashboard problem (PERF-01) is straightforward -- the current `dashboard/page.tsx` calls `supabase.from('articles').select('id, title, source_type, created_at')` and then computes `totalArticles`, `thisWeek`, `thisMonth`, and `bySource` counts in JavaScript. This should be a single Supabase RPC function that returns pre-computed stats. The project already has a pattern for this via `get_user_usage` in the pricing migration.

The SSE duplication problem (PERF-02) involves three files containing near-identical stream parsing logic. The fix is extracting to `src/lib/sse.ts` and importing from all three locations.

**Primary recommendation:** Create a `get_workspace_stats` PostgreSQL function callable via `supabase.rpc()`, and extract SSE parsing into `src/lib/sse.ts`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PERF-01 | Dashboard stats via DB aggregation, not client-side JS | Supabase RPC function pattern already established in codebase (`get_user_usage`). New `get_workspace_stats` function returns counts in one query. |
| PERF-02 | SSE parsing extracted into shared utility | Three duplicate implementations identified. Extract to `src/lib/sse.ts` with `readSSEStream` function. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.99.1 | DB queries + RPC calls | Already in project |
| PostgreSQL (via Supabase) | 15+ | Aggregation functions | Native COUNT, date filtering |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | ^4.1.0 | Unit testing SSE utility | Test the extracted SSE parser |

## Architecture Patterns

### PERF-01: DB Aggregation via Supabase RPC

**Current problem (dashboard/page.tsx lines 36-68):**
```typescript
// CURRENT: Fetches ALL articles to client, computes in JS
const { data: articles } = await supabase
  .from('articles')
  .select('id, title, source_type, created_at')
  .eq('workspace_id', activeWorkspace.id)
  .order('created_at', { ascending: false });

const all = articles ?? [];
const thisWeek = all.filter(a => new Date(a.created_at) >= weekAgo).length;
// ...more client-side filtering
```

**Recommended: PostgreSQL function returning aggregated stats:**

```sql
CREATE OR REPLACE FUNCTION get_workspace_stats(p_workspace_id uuid)
RETURNS TABLE (
  total_articles bigint,
  this_week bigint,
  this_month bigint,
  youtube_count bigint,
  loom_count bigint,
  google_drive_count bigint,
  paste_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_articles,
    COUNT(*) FILTER (WHERE a.created_at >= now() - interval '7 days')::bigint AS this_week,
    COUNT(*) FILTER (WHERE a.created_at >= now() - interval '30 days')::bigint AS this_month,
    COUNT(*) FILTER (WHERE a.source_type = 'youtube')::bigint AS youtube_count,
    COUNT(*) FILTER (WHERE a.source_type = 'loom')::bigint AS loom_count,
    COUNT(*) FILTER (WHERE a.source_type = 'google-drive')::bigint AS google_drive_count,
    COUNT(*) FILTER (WHERE a.source_type = 'paste')::bigint AS paste_count
  FROM articles a
  WHERE a.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_workspace_stats(uuid) TO authenticated;
```

**Client-side call pattern (matches existing `getUserUsage` pattern):**
```typescript
export async function getWorkspaceStats(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceStats> {
  const { data, error } = await supabase
    .rpc('get_workspace_stats', { p_workspace_id: workspaceId });

  if (error) throw new Error(`Failed to get workspace stats: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  // ... map to WorkspaceStats interface
}
```

**Recent articles still need a separate query** -- but limited to 5 rows:
```typescript
const { data: recentArticles } = await supabase
  .from('articles')
  .select('id, title, source_type, created_at')
  .eq('workspace_id', workspaceId)
  .order('created_at', { ascending: false })
  .limit(5);
```

This means the dashboard makes 2 queries (stats RPC + recent 5) instead of 1 query fetching all rows. For a workspace with 1000 articles, this is dramatically faster.

### PERF-02: SSE Parsing Extraction

**Three duplicate locations identified:**

1. **`src/app/page.tsx` lines 422-454** -- `readSSEStream()` helper function at bottom of file
2. **`src/app/articles/[id]/page.tsx` lines 162-193** -- inline SSE parsing in `handleGenerateHtml` callback
3. **`src/components/progress-display.tsx`** -- This is NOT an SSE parser; it is purely a UI display component. The requirement description was misleading.

**Actual duplication is between `page.tsx` and `articles/[id]/page.tsx`.**

The `page.tsx` version is cleaner (extracted as a function), while `articles/[id]/page.tsx` has the same logic inlined.

**Recommended structure for `src/lib/sse.ts`:**

```typescript
import type { ProgressEvent } from '@/types';

/**
 * Reads an SSE stream from a fetch Response and calls onEvent for each parsed event.
 */
export async function readSSEStream(
  response: Response,
  onEvent: (event: ProgressEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      const lines = part.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: ProgressEvent = JSON.parse(line.slice(6));
            onEvent(event);
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }
}
```

**Then in `articles/[id]/page.tsx`, replace the inline parsing with:**
```typescript
import { readSSEStream } from '@/lib/sse';

// Inside handleGenerateHtml:
let resultHtml = '';
await readSSEStream(response, (event) => {
  if (event.step === 'done' && event.html) {
    resultHtml = event.html;
  } else if (event.step === 'error') {
    throw new Error(event.message ?? 'Generation failed');
  }
});
```

### Recommended Project Structure (changes only)

```
src/
  lib/
    sse.ts                    # NEW: shared SSE parsing utility
    supabase/
      queries.ts              # ADD: getWorkspaceStats function
  app/
    dashboard/
      page.tsx                # MODIFY: use RPC instead of client-side aggregation
    page.tsx                   # MODIFY: import readSSEStream from lib/sse
    articles/[id]/
      page.tsx                # MODIFY: import readSSEStream from lib/sse
supabase/
  stats-migration.sql         # NEW: get_workspace_stats function
```

### Anti-Patterns to Avoid
- **Don't create a Next.js API route for stats:** The Supabase RPC function is called directly from the client via the Supabase SDK. No need for an intermediary API route -- RLS handles security.
- **Don't over-abstract the SSE utility:** Keep it as a single function, not a class or EventEmitter wrapper. The current `readSSEStream(response, onEvent)` signature is exactly right.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Aggregation queries | Client-side COUNT/filter | PostgreSQL COUNT + FILTER | DB engine optimized for this; avoids transferring all rows |
| SSE parsing | Per-file implementations | Single shared utility | DRY principle; one place to fix bugs |

## Common Pitfalls

### Pitfall 1: RPC Security - SECURITY DEFINER vs INVOKER
**What goes wrong:** Using `SECURITY DEFINER` on the RPC function means it runs as the function owner (postgres), bypassing RLS. An attacker could query any workspace's stats.
**Why it happens:** The existing `get_user_usage` uses `SECURITY DEFINER` because it needs cross-table access across `subscriptions` and `articles`.
**How to avoid:** For `get_workspace_stats`, add an explicit check that the calling user owns the workspace, OR use `SECURITY INVOKER` if RLS on `articles` already filters by workspace membership. Since the current RLS on `articles` is `auth.uid() = user_id` (not workspace-based), using `SECURITY DEFINER` with an ownership check is safer:
```sql
-- Inside the function, verify ownership:
IF NOT EXISTS (
  SELECT 1 FROM workspaces w
  WHERE w.id = p_workspace_id AND w.user_id = auth.uid()
) THEN
  RETURN;
END IF;
```
**Warning signs:** Function returns data for workspaces the user doesn't own.

### Pitfall 2: SSE Error Handling Difference in articles/[id]/page.tsx
**What goes wrong:** The inline SSE parser in `articles/[id]/page.tsx` throws errors on `event.step === 'error'`, while the `page.tsx` version passes errors to a callback. This behavioral difference must be preserved.
**How to avoid:** The shared `readSSEStream` calls `onEvent` for all events including errors. Each consumer handles errors in its own callback. The `articles/[id]` consumer can throw from within its callback. This works because `readSSEStream` does not catch errors thrown by `onEvent`.
**Warning signs:** Error handling behaves differently after refactoring.

### Pitfall 3: Recent Articles Query Still Needed
**What goes wrong:** Developer removes the articles query entirely and forgets the dashboard needs the 5 most recent articles for display.
**How to avoid:** The RPC function returns stats only. A separate `.limit(5)` query fetches recent articles. Both run in parallel via `Promise.all`.

### Pitfall 4: BigInt Handling from PostgreSQL
**What goes wrong:** PostgreSQL `COUNT(*)` returns `bigint`. Supabase JS client may return these as strings or numbers depending on size.
**How to avoid:** Explicitly cast with `Number()` when mapping RPC results, same pattern as `getUserUsage` (line 263 in queries.ts: `articlesThisPeriod: Number(row.articles_this_period)`).

## Code Examples

### Migration SQL for get_workspace_stats

```sql
-- stats-migration.sql
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_workspace_stats(p_workspace_id uuid)
RETURNS TABLE (
  total_articles bigint,
  this_week bigint,
  this_month bigint,
  youtube_count bigint,
  loom_count bigint,
  google_drive_count bigint,
  paste_count bigint
) AS $$
BEGIN
  -- Verify caller owns this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = p_workspace_id AND w.user_id = auth.uid()
  ) THEN
    RETURN;  -- Return empty result set
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint,
    COUNT(*) FILTER (WHERE a.created_at >= now() - interval '7 days')::bigint,
    COUNT(*) FILTER (WHERE a.created_at >= now() - interval '30 days')::bigint,
    COUNT(*) FILTER (WHERE a.source_type = 'youtube')::bigint,
    COUNT(*) FILTER (WHERE a.source_type = 'loom')::bigint,
    COUNT(*) FILTER (WHERE a.source_type = 'google-drive')::bigint,
    COUNT(*) FILTER (WHERE a.source_type = 'paste')::bigint
  FROM articles a
  WHERE a.workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_workspace_stats(uuid) TO authenticated;
```

### Query function in queries.ts

```typescript
export interface WorkspaceStats {
  totalArticles: number;
  thisWeek: number;
  thisMonth: number;
  bySource: {
    youtube: number;
    loom: number;
    'google-drive': number;
    paste: number;
  };
}

export async function getWorkspaceStats(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceStats> {
  const { data, error } = await supabase
    .rpc('get_workspace_stats', { p_workspace_id: workspaceId });

  if (error) throw new Error(`Failed to get workspace stats: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return {
      totalArticles: 0, thisWeek: 0, thisMonth: 0,
      bySource: { youtube: 0, loom: 0, 'google-drive': 0, paste: 0 },
    };
  }

  return {
    totalArticles: Number(row.total_articles),
    thisWeek: Number(row.this_week),
    thisMonth: Number(row.this_month),
    bySource: {
      youtube: Number(row.youtube_count),
      loom: Number(row.loom_count),
      'google-drive': Number(row.google_drive_count),
      paste: Number(row.paste_count),
    },
  };
}
```

### Dashboard page refactored data fetch

```typescript
// In dashboard/page.tsx useEffect:
const [stats, recentArticles] = await Promise.all([
  getWorkspaceStats(supabase, activeWorkspace.id),
  supabase
    .from('articles')
    .select('id, title, source_type, created_at')
    .eq('workspace_id', activeWorkspace.id)
    .order('created_at', { ascending: false })
    .limit(5)
    .then(({ data }) => data ?? []),
]);

const hasCompanyContext = !!(activeWorkspace.companyName || activeWorkspace.companyDescription);

setStats({
  ...stats,
  recentArticles,
  hasCompanyContext,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side aggregation | DB-side aggregation via RPC | PostgreSQL has always supported this | O(1) vs O(n) data transfer |
| Inline SSE parsing | Shared utility module | Standard refactoring practice | Single source of truth |

## Open Questions

1. **Index on `articles.created_at`**
   - What we know: There is an index on `workspace_id` (`idx_articles_workspace`). The stats query filters on both `workspace_id` and `created_at`.
   - What's unclear: Whether a composite index `(workspace_id, created_at)` would meaningfully help at realistic scale.
   - Recommendation: Skip for now. The `workspace_id` index alone is sufficient for workspaces with < 10K articles. Add composite index later if needed.

2. **`hasCompanyContext` in stats**
   - What we know: Currently derived from `activeWorkspace` object which is already loaded in the workspace context.
   - What's unclear: Nothing -- this should stay client-side since `activeWorkspace` is already available.
   - Recommendation: Keep deriving from `activeWorkspace`, do not add to the RPC.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `getWorkspaceStats` returns correct shape from RPC result | unit | `npx vitest run src/lib/__tests__/workspace-stats.test.ts -x` | No -- Wave 0 |
| PERF-02 | `readSSEStream` parses SSE events correctly | unit | `npx vitest run src/lib/__tests__/sse.test.ts -x` | No -- Wave 0 |
| PERF-02 | `readSSEStream` handles malformed JSON gracefully | unit | `npx vitest run src/lib/__tests__/sse.test.ts -x` | No -- Wave 0 |
| PERF-02 | `readSSEStream` handles empty/partial chunks | unit | `npx vitest run src/lib/__tests__/sse.test.ts -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/sse.test.ts` -- covers PERF-02 (SSE parsing utility tests)
- [ ] `src/lib/__tests__/workspace-stats.test.ts` -- covers PERF-01 (stats query mapping tests)

## Sources

### Primary (HIGH confidence)
- Project source code: `src/app/dashboard/page.tsx`, `src/app/page.tsx`, `src/app/articles/[id]/page.tsx`
- Project migrations: `supabase/pricing-migration.sql` (established RPC pattern with `get_user_usage`)
- Project queries: `src/lib/supabase/queries.ts` (established `supabase.rpc()` call pattern)

### Secondary (MEDIUM confidence)
- PostgreSQL `COUNT(*) FILTER (WHERE ...)` syntax -- standard SQL:2003 feature, widely supported in PostgreSQL 9.4+

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing project dependencies
- Architecture: HIGH - follows established patterns already in the codebase (RPC functions, query wrappers)
- Pitfalls: HIGH - identified from direct code analysis of the three SSE implementations and existing RPC security patterns

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (stable patterns, no external dependency changes)
