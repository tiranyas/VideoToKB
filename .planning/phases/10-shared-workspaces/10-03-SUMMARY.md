---
phase: 10-shared-workspaces
plan: "03"
subsystem: invite-system
tags: [team, invites, api-route, accept-page, queries]
dependency_graph:
  requires: [workspace_members, workspace_invites, accept_workspace_invite, getUserWorkspaceRole]
  provides: [createWorkspaceInvite, getWorkspaceInvites, revokeInvite, acceptInvite, POST /api/invite, /invite/accept]
  affects: [middleware, workspace-context]
tech_stack:
  added: []
  patterns: [copy-link-invite, rpc-accept-flow, suspense-boundary]
key_files:
  created:
    - src/app/api/invite/route.ts
    - src/app/invite/accept/page.tsx
  modified:
    - src/lib/supabase/queries.ts
    - src/middleware.ts
    - src/app/articles/[id]/page.tsx
    - src/app/articles/page.tsx
    - src/app/page.tsx
decisions:
  - Copy-link invite approach with no email infrastructure dependency
  - Middleware bypass for /invite/ paths to allow un-onboarded users to accept invites
  - Duplicate invite detection via Postgres 23505 unique violation error code
metrics:
  duration: ~8min
  completed: "2026-03-20T15:20:00Z"
---

# Phase 10 Plan 03: Invite System Summary

Copy-link invite system with query functions for create/list/revoke/accept, POST /api/invite route with role-based auth, and /invite/accept page with RPC-based acceptance flow.

## What Was Built

### Task 1: Invite Query Functions (`src/lib/supabase/queries.ts`)

Added 5 functions to the query layer:

1. **`mapInviteRow`** - Maps snake_case DB rows to camelCase `WorkspaceInvite` type
2. **`createWorkspaceInvite`** - Inserts invite with email normalization, handles 23505 duplicate constraint
3. **`getWorkspaceInvites`** - Lists all invites for a workspace, ordered by created_at desc
4. **`revokeInvite`** - Deletes invite by ID
5. **`acceptInvite`** - Calls `accept_workspace_invite` RPC, returns workspaceId or error

### Task 2: API Route and Accept Page

**`src/app/api/invite/route.ts`** - POST endpoint:
- Validates auth (401), required fields (400), email format (400)
- Checks caller has admin+ role via `getUserWorkspaceRole` (403)
- Creates invite, returns `{ token, inviteUrl }` (201)
- Handles duplicate invite (409) and server errors (500)
- Invite URL derived from `req.url` origin (no hardcoded URLs)

**`src/app/invite/accept/page.tsx`** - Client component:
- Reads `token` from URL search params
- Three states: loading (spinner), success (checkmark + redirect), error (alert + message)
- Calls `acceptInvite` RPC on mount
- On success: `refreshWorkspaces()` + `switchWorkspace()` + redirect to `/` after 1.5s
- Wrapped in `<Suspense>` boundary (required by Next.js for `useSearchParams`)

**`src/middleware.ts`** - Added `/invite/` to onboarding bypass list

## Verification

- `npx tsc --noEmit` passes with zero errors
- `npx vitest run` -- all 182 existing tests pass
- No hardcoded URLs -- invite URL derived from request origin
- Invite creation validates email format and caller role
- Accept flow handles: success redirect, expired token, wrong email, missing token

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing caller mismatches from Plan 10-02**
- **Found during:** Task 1 verification
- **Issue:** Plan 10-02 changed function signatures (removed userId params from getArticle, deleteArticle, updateArticleTitle, updateArticleHtml) but callers in articles/[id]/page.tsx, articles/page.tsx, and page.tsx were not updated
- **Fix:** Removed extra userId arguments from all callers
- **Files modified:** src/app/articles/[id]/page.tsx, src/app/articles/page.tsx, src/app/page.tsx

**2. [Rule 2 - Missing Critical] Added /invite/ to middleware onboarding bypass**
- **Found during:** Task 2 implementation
- **Issue:** Users accepting an invite might not have completed onboarding; middleware would redirect them away from /invite/accept
- **Fix:** Added `!request.nextUrl.pathname.startsWith('/invite/')` to onboarding check
- **Files modified:** src/middleware.ts

## Decisions Made

1. **Copy-link approach** - No email infrastructure needed; owner copies invite URL
2. **Middleware bypass** - /invite/ paths skip onboarding redirect for new team members
3. **23505 error code** - Used Postgres unique violation code to detect duplicate invites
