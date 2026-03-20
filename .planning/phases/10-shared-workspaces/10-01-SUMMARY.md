---
phase: 10-shared-workspaces
plan: "01"
subsystem: database
tags: [team, rls, migration, workspace-members, invites]
dependency_graph:
  requires: []
  provides: [workspace_members, workspace_invites, workspace_role, is_workspace_member, has_workspace_role, accept_workspace_invite, get_workspace_usage]
  affects: [workspaces-rls, articles-rls, workspace-preferences-rls, get_workspace_stats]
tech_stack:
  added: []
  patterns: [security-definer-helpers, enum-role-hierarchy, token-based-invites]
key_files:
  created:
    - supabase/team-migration.sql
  modified:
    - src/types/index.ts
decisions:
  - Enum ordering owner < admin < member enables role <= comparisons
  - Workspace quota inherits owner subscription via get_workspace_usage
  - Invite acceptance verifies authenticated user email matches invite email
metrics:
  duration: ~10min
  completed: "2026-03-20T12:56:00Z"
---

# Phase 10 Plan 01: Database Migration & Types Summary

JWT-less team access foundation using workspace_members join table with SECURITY DEFINER helper functions for RLS, token-based invite system, and workspace-scoped quota via owner's subscription.

## What Was Built

### Task 1: Team Migration SQL (`supabase/team-migration.sql`)

Complete single-transaction migration with 11 sections:

1. **Enums**: `workspace_role` (owner/admin/member), `invite_status` (pending/accepted/expired)
2. **workspace_members table**: join table with role, unique(workspace_id, user_id), indexes, updated_at trigger
3. **workspace_invites table**: email + token + role + expiry, unique(workspace_id, email)
4. **Helper functions**: `is_workspace_member(uuid)` and `has_workspace_role(uuid, workspace_role)` -- both SECURITY DEFINER STABLE
5. **accept_workspace_invite(uuid)**: SECURITY DEFINER, validates token + email match, creates membership, returns jsonb
6. **Owner backfill**: INSERT INTO workspace_members FROM workspaces (BEFORE policy changes)
7. **Updated RLS on workspaces**: ws_select (member), ws_insert (creator), ws_update (admin+), ws_delete (owner)
8. **Updated RLS on articles**: membership-based select/insert/update, owner-or-admin delete
9. **Updated RLS on workspace_preferences**: member select, admin+ insert/update
10. **RLS on workspace_members**: member select, admin+ insert, admin+ delete (except owner), owner update
11. **RLS on workspace_invites**: member select, admin+ insert/delete
12. **Updated get_workspace_stats**: checks workspace_members instead of workspaces.user_id
13. **New get_workspace_usage**: workspace-scoped quota using owner's subscription
14. **GRANTs**: all 4 functions granted to authenticated role

### Task 2: TypeScript Types (`src/types/index.ts`)

Added after `Workspace` interface:
- `WorkspaceRole`: `'owner' | 'admin' | 'member'`
- `WorkspaceMember`: id, workspaceId, userId, role, email?, createdAt, updatedAt
- `InviteStatus`: `'pending' | 'accepted' | 'expired'`
- `WorkspaceInvite`: id, workspaceId, email, role, invitedBy, token, status, expiresAt, createdAt
- `WorkspaceUsage`: articlesThisPeriod, articleLimit, bonusCredits, articlesRemaining, planId, planName, periodStart, periodEnd

## Verification

- Migration SQL has BEGIN/COMMIT transaction wrapping
- Backfill occurs BEFORE old RLS policies are dropped (zero-downtime)
- TypeScript compiles: `npx tsc --noEmit src/types/index.ts` -- no errors
- All old policy names match existing migration files (ws_all, articles_select/insert/update/delete, wp_all)
- Enum idempotent via DO $$ BEGIN/EXCEPTION blocks

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

1. **Enum creation uses DO/EXCEPTION blocks** for idempotency -- safe to re-run migration
2. **Tables use IF NOT EXISTS** for idempotency
3. **Indexes use IF NOT EXISTS** for idempotency

## Self-Check: PENDING

Commits pending user approval of git commands. Files verified to exist on disk.
