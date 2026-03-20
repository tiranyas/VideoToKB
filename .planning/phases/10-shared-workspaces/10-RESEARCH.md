# Phase 10: Shared Workspaces & Team Access - Research

**Researched:** 2026-03-20
**Domain:** Supabase multi-tenant team access, RLS policies, invite system
**Confidence:** HIGH

## Summary

KBPipe currently has a single-owner workspace model: each workspace has a `user_id` FK, and all RLS policies check `auth.uid() = user_id`. To enable team access, we need a `workspace_members` join table with roles, an `workspace_invites` table for email-based invitations, and updated RLS policies across ALL workspace-scoped tables (workspaces, articles, workspace_preferences) to check membership instead of ownership.

The current data model is well-structured for this evolution. Workspaces already scope articles and preferences. The main work is: (1) new tables for members and invites, (2) rewrite RLS policies to use membership checks, (3) update the `get_workspace_stats` and `get_user_usage` RPC functions, (4) add a "Team" tab to the settings UI, and (5) update the workspace context to load workspaces the user is a member of (not just owner).

**Primary recommendation:** Use a `workspace_members` table with `role` enum (owner/admin/member) as the single source of truth for workspace access. When creating a workspace, auto-insert the creator as `owner` in `workspace_members`. All RLS policies check membership via a `SECURITY DEFINER` helper function for performance.

## Current State Analysis

### Existing Workspace Schema

```sql
-- workspaces table
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL DEFAULT 'default',
  company_name text,
  company_description text,
  industry text,
  target_audience text,
  branding jsonb,
  onboarding_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- RLS: owner-only
CREATE POLICY "ws_all" ON workspaces
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Tables That Need RLS Updates

| Table | Current Access | Needed Access |
|-------|---------------|---------------|
| `workspaces` | `auth.uid() = user_id` | membership check |
| `articles` | `auth.uid() = user_id` | membership via workspace_id |
| `workspace_preferences` | join to workspaces.user_id | membership via workspace_id |
| `user_settings` | `auth.uid() = user_id` | No change (per-user) |

### Things That Are Already Team-Ready

- **Articles** already have `workspace_id` column -- articles are scoped to workspace, not user
- **workspace_preferences** already scoped to workspace_id
- **article_types** and **platform_profiles** are global (shared across all users) -- no change needed
- **Workspace switching** already exists in the UI and context

### Things That Need Changing

- `getWorkspaces()` queries filter by `user_id` -- needs to also return workspaces where user is a member
- `createWorkspace()` only sets `user_id` -- needs to also create workspace_members row
- `saveArticle()` still requires `userId` -- team members need to save articles to shared workspace
- Articles RLS checks `auth.uid() = user_id` -- needs membership check
- `getArticle()` and `deleteArticle()` filter by `user_id` -- needs workspace membership check
- `updateArticleTitle()` and `updateArticleHtml()` filter by `user_id` -- same
- `get_workspace_stats` RPC checks `workspaces.user_id = auth.uid()` -- needs membership check
- `get_user_usage` counts articles by `user_id` -- team quota should be per-workspace
- `checkQuota` is user-scoped -- team plans need workspace-scoped quota
- The `UNIQUE(user_id, slug)` constraint on workspaces needs reconsidering for shared workspaces

## Architecture Patterns

### Pattern 1: Workspace Members Table

The core join table for team access.

```sql
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_wm_user ON workspace_members(user_id);
CREATE INDEX idx_wm_workspace ON workspace_members(workspace_id);
```

### Pattern 2: Membership Check Helper Function

All RLS policies should use a single `SECURITY DEFINER` function to check membership. This avoids repeating subqueries and is faster because the function can use indexes directly.

```sql
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$;

-- Variant with role check
CREATE OR REPLACE FUNCTION has_workspace_role(ws_id uuid, required_role workspace_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
      AND role <= required_role  -- owner < admin < member (enum ordering)
  );
$$;
```

**Important:** Postgres enum ordering follows declaration order. If we declare `ENUM ('owner', 'admin', 'member')`, then `owner < admin < member`. So `role <= 'admin'` matches both owner and admin.

### Pattern 3: Invite System

```sql
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired');

CREATE TABLE workspace_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status invite_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, email)
);

CREATE INDEX idx_invites_token ON workspace_invites(token);
CREATE INDEX idx_invites_email ON workspace_invites(email);
```

### Pattern 4: Updated RLS Policies

```sql
-- Workspaces: members can read, owner/admin can update
DROP POLICY "ws_all" ON workspaces;

CREATE POLICY "ws_select" ON workspaces
  FOR SELECT TO authenticated
  USING (is_workspace_member(id));

CREATE POLICY "ws_insert" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);  -- creator is always the initial owner

CREATE POLICY "ws_update" ON workspaces
  FOR UPDATE TO authenticated
  USING (has_workspace_role(id, 'admin'))
  WITH CHECK (has_workspace_role(id, 'admin'));

CREATE POLICY "ws_delete" ON workspaces
  FOR DELETE TO authenticated
  USING (has_workspace_role(id, 'owner'));  -- only owner can delete

-- Articles: members can read, members can insert, own articles update/delete
DROP POLICY "articles_select" ON articles;
DROP POLICY "articles_insert" ON articles;
DROP POLICY "articles_update" ON articles;
DROP POLICY "articles_delete" ON articles;

CREATE POLICY "articles_select" ON articles
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "articles_insert" ON articles
  FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "articles_update" ON articles
  FOR UPDATE TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "articles_delete" ON articles
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id  -- own articles
    OR has_workspace_role(workspace_id, 'admin')  -- admin/owner can delete any
  );

-- Workspace preferences: members can read, admin+ can write
DROP POLICY "wp_all" ON workspace_preferences;

CREATE POLICY "wp_select" ON workspace_preferences
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "wp_upsert" ON workspace_preferences
  FOR INSERT TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "wp_update" ON workspace_preferences
  FOR UPDATE TO authenticated
  USING (has_workspace_role(workspace_id, 'admin'));
```

### Pattern 5: Accept Invite Flow

A `SECURITY DEFINER` function that accepts an invite by token, creates the membership, and updates invite status. Must be SECURITY DEFINER because the invitee doesn't have workspace access yet.

```sql
CREATE OR REPLACE FUNCTION accept_workspace_invite(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite workspace_invites%ROWTYPE;
  v_user_id uuid := auth.uid();
BEGIN
  -- Find valid invite
  SELECT * INTO v_invite
  FROM workspace_invites
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid or expired invite');
  END IF;

  -- Verify email matches the authenticated user
  IF v_invite.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('error', 'Invite was sent to a different email');
  END IF;

  -- Create membership
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_invite.workspace_id, v_user_id, v_invite.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Mark invite as accepted
  UPDATE workspace_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'success', true,
    'workspace_id', v_invite.workspace_id
  );
END;
$$;
```

### Recommended Project Structure for New Code

```
src/
  lib/
    supabase/
      queries.ts           # Add: getWorkspaceMembers, inviteMember, removeMember, acceptInvite
  app/
    settings/
      page.tsx             # Add: 'team' tab
    invite/
      accept/
        page.tsx           # Accept invite landing page
  types/
    index.ts               # Add: WorkspaceMember, WorkspaceInvite, WorkspaceRole
supabase/
  team-migration.sql       # New tables + updated RLS
```

### Anti-Patterns to Avoid

- **Checking user_id directly in app code instead of RLS:** Always let RLS enforce access. Don't add `.eq('user_id', userId)` filters for team-accessible resources -- rely on workspace membership RLS.
- **Separate RLS subqueries per table:** Use a shared `is_workspace_member()` SECURITY DEFINER function. Duplicating the membership check as inline subqueries in every policy is error-prone and slower.
- **Allowing members to modify workspace settings:** Only owner and admin should change company context, branding, article types, platform profiles. Members should only read and create articles.
- **Email-only invite without token:** Always use a unique token for invite acceptance. Email matching alone is insufficient because multiple Supabase accounts could share an email domain.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Invite tokens | Custom random strings | `gen_random_uuid()` in Postgres | Cryptographically secure, no app-layer generation needed |
| Access check in app code | Manual role checks in every API route | RLS policies + `is_workspace_member()` | Database-level enforcement, can't be bypassed |
| Email delivery for invites | Custom SMTP integration | Supabase Auth `signInWithOtp` or `inviteUserByEmail` for new users; simple mailto link for existing users | Phase 1: use invite link (no email service needed). Phase 2: integrate Supabase edge function for email |
| Role hierarchy checks | if/else chains in TypeScript | Postgres enum ordering with `<=` comparison | Single source of truth, enforced at DB level |

**Key insight:** For an MVP team feature, you do NOT need a transactional email service. Generate an invite link with a token, and let the workspace owner share it manually (copy to clipboard). This removes the entire email infrastructure dependency. Email notifications can be added later.

## Common Pitfalls

### Pitfall 1: Forgetting to Migrate Existing Owners
**What goes wrong:** After adding `workspace_members`, existing workspace owners have no membership row, so RLS blocks them from their own workspaces.
**Why it happens:** The migration adds new RLS policies but doesn't backfill the `workspace_members` table.
**How to avoid:** Migration MUST insert an `owner` row in `workspace_members` for every existing workspace based on `workspaces.user_id`.
**Warning signs:** Existing users see empty workspace list after deployment.

### Pitfall 2: Breaking the Unique Constraint on Workspaces
**What goes wrong:** `UNIQUE(user_id, slug)` on workspaces prevents two users from having a workspace with the same slug.
**Why it happens:** The constraint was designed for single-owner model. With teams, the `user_id` column becomes "created_by" rather than "sole owner".
**How to avoid:** Keep `user_id` as `created_by` (don't remove it -- existing code and articles reference it). The unique constraint is actually fine because it's per-creator, not per-member. New slugs are generated at creation time only.

### Pitfall 3: Quota Double-Counting for Teams
**What goes wrong:** If quota is per-user and a team member generates an article, it counts against the member's personal quota, not the workspace quota.
**Why it happens:** `get_user_usage` counts articles by `user_id`, not by workspace.
**How to avoid:** Add a workspace-level quota system. The `subscriptions` table should reference workspace_id (for team plans) or user_id (for individual plans). For the MVP, the simplest approach: team workspaces inherit the owner's subscription plan.
**Warning signs:** Team members on free plan can't generate articles even though the workspace owner has a pro plan.

### Pitfall 4: RLS Policy Ordering with Enum Roles
**What goes wrong:** Using `role <= 'admin'` for permission checks but getting the enum order wrong.
**Why it happens:** Postgres enum ordering is by declaration order. If declared as `('owner', 'admin', 'member')`, then `owner` (0) < `admin` (1) < `member` (2).
**How to avoid:** Document the enum ordering clearly. `has_workspace_role(ws_id, 'admin')` means "owner OR admin" because owner < admin.

### Pitfall 5: Invite Token Leaking Workspace Access
**What goes wrong:** An invite token URL shared publicly gives anyone who has the link access to the workspace.
**Why it happens:** Token-based invites without email verification.
**How to avoid:** The `accept_workspace_invite` function checks that the authenticated user's email matches the invite email. This prevents token sharing. Also, invites expire after 7 days.

### Pitfall 6: getArticle/deleteArticle Still Filter by user_id
**What goes wrong:** Team member can see articles in the list (RLS allows via workspace membership) but can't view individual articles because `getArticle()` adds `.eq('user_id', userId)`.
**Why it happens:** Application-level query filters are stricter than RLS. Code was written for single-user model.
**How to avoid:** Update `getArticle` to filter by workspace_id (or just by article_id with RLS doing the access check). Update `deleteArticle` similarly. Update `updateArticleTitle` and `updateArticleHtml` to remove the `user_id` filter and let RLS handle access.

## Code Examples

### Updated getWorkspaces Query (Member-Aware)

```typescript
export async function getWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<Workspace[]> {
  // Get workspaces where user is a member (includes owned workspaces)
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true, referencedTable: 'workspaces' });

  if (error) throw new Error(`Failed to load workspaces: ${error.message}`);

  return (data ?? [])
    .map((row) => row.workspace)
    .filter(Boolean)
    .map(mapWorkspaceRow);
}
```

### New Types

```typescript
export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email?: string;    // joined from auth.users for display
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}
```

### New Query Functions

```typescript
export async function getWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load members: ${error.message}`);
  return (data ?? []).map(mapMemberRow);
}

export async function removeWorkspaceMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to remove member: ${error.message}`);
}

export async function createWorkspaceInvite(
  supabase: SupabaseClient,
  workspaceId: string,
  email: string,
  role: WorkspaceRole = 'member'
): Promise<{ token: string }> {
  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({
      workspace_id: workspaceId,
      email: email.toLowerCase(),
      role,
    })
    .select('token')
    .single();

  if (error) throw new Error(`Failed to create invite: ${error.message}`);
  return { token: data.token };
}

export async function acceptInvite(
  supabase: SupabaseClient,
  token: string
): Promise<{ workspaceId: string } | { error: string }> {
  const { data, error } = await supabase
    .rpc('accept_workspace_invite', { p_token: token });

  if (error) throw new Error(`Failed to accept invite: ${error.message}`);
  if (data?.error) return { error: data.error };
  return { workspaceId: data.workspace_id };
}
```

### Invite Accept Page

```typescript
// src/app/invite/accept/page.tsx
// URL: /invite/accept?token=<uuid>
// Flow:
// 1. User clicks invite link
// 2. If not logged in: middleware redirects to /login, after login returns here
// 3. Page calls acceptInvite RPC
// 4. On success: switch active workspace and redirect to /
// 5. On error: show message (expired, wrong email, etc.)
```

## Quota Strategy for Teams

### Current Model (Per-User)

- `subscriptions` has `UNIQUE(user_id)` -- one subscription per user
- `get_user_usage` counts articles by `a.user_id = p_user_id`
- quota enforced in `checkQuota(supabase, userId)`

### Recommended Team Model (MVP)

For MVP, keep it simple: **workspace inherits owner's plan**.

- Add `subscription_id` column to `workspaces` table (nullable, for team plans later)
- For now: when checking quota for a workspace, look up the owner's subscription
- Team members generating articles count against the workspace's (owner's) quota
- The `get_user_usage` function should be supplemented with a `get_workspace_usage` function

```sql
CREATE OR REPLACE FUNCTION get_workspace_usage(p_workspace_id uuid)
RETURNS TABLE (
  articles_this_period bigint,
  article_limit integer,
  bonus_credits integer,
  articles_remaining integer,
  plan_id text,
  plan_name text,
  period_start timestamptz,
  period_end timestamptz
) AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Get workspace owner
  SELECT user_id INTO v_owner_id
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND role = 'owner'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  -- Use owner's subscription but count workspace articles
  RETURN QUERY
  SELECT
    COALESCE(
      (SELECT COUNT(*)::bigint FROM articles a
       WHERE a.workspace_id = p_workspace_id
         AND a.created_at >= s.current_period_start
         AND a.created_at < s.current_period_end),
      0
    ),
    p.article_limit,
    s.bonus_credits,
    GREATEST(
      (p.article_limit + s.bonus_credits) -
      COALESCE(
        (SELECT COUNT(*)::integer FROM articles a
         WHERE a.workspace_id = p_workspace_id
           AND a.created_at >= s.current_period_start
           AND a.created_at < s.current_period_end),
        0
      ),
      0
    ),
    s.plan_id,
    p.name,
    s.current_period_start,
    s.current_period_end
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  WHERE s.user_id = v_owner_id
    AND s.status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Future Model (Per-Workspace Subscription)

When Stripe is connected, subscriptions would attach to workspaces rather than users for team plans. This is out of scope for Phase 10 but the schema should not block it.

## Role Permissions Matrix

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| View articles | Yes | Yes | Yes |
| Create articles | Yes | Yes | Yes |
| Edit own articles | Yes | Yes | Yes |
| Delete own articles | Yes | Yes | Yes |
| Delete any article | Yes | Yes | No |
| Edit workspace settings | Yes | Yes | No |
| Edit branding | Yes | Yes | No |
| Manage article types | Yes | Yes | No |
| Manage platform profiles | Yes | Yes | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes (not owner) | No |
| Change member roles | Yes | No | No |
| Delete workspace | Yes | No | No |
| Transfer ownership | Yes | No | No |

## UI Changes Needed

### Settings Page - New "Team" Tab

Add a `team` tab to the existing settings page (`type Tab` union):

- **Member list**: Table showing email, role, joined date, with remove button
- **Invite form**: Email input + role dropdown + "Send Invite" button
- **Pending invites**: List of pending invites with copy-link and revoke buttons
- **Only visible to owner/admin** (hide tab for members)

### Workspace Switcher

The existing workspace switcher in the header needs minor updates:
- Show workspaces where user is a member (not just owner)
- Optionally show the user's role badge next to shared workspaces

### Invite Accept Page

New page at `/invite/accept?token=<uuid>`:
- If authenticated: call `accept_workspace_invite` RPC, redirect to workspace
- If not authenticated: redirect to login, then back to accept page

## Migration Plan

The migration must be executed as a single transaction:

1. Create `workspace_role` enum
2. Create `invite_status` enum
3. Create `workspace_members` table
4. Create `workspace_invites` table
5. Create `is_workspace_member()` and `has_workspace_role()` functions
6. Create `accept_workspace_invite()` function
7. **Backfill**: Insert owner membership for all existing workspaces
8. Drop old RLS policies on workspaces, articles, workspace_preferences
9. Create new membership-based RLS policies
10. Update `get_workspace_stats` to check membership instead of ownership
11. Create `get_workspace_usage` function
12. Add RLS policies on new tables (workspace_members, workspace_invites)

```sql
-- Backfill existing owners
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'::workspace_role
FROM workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| user_id on every table | workspace_members join table | Standard pattern | Single source of truth for access |
| Inline RLS subqueries | SECURITY DEFINER helper functions | Performance best practice | Faster policy evaluation, less duplication |
| Email-based invite delivery | Token-based invite links (no email infra needed) | MVP pattern | Removes dependency on email service |
| Per-user subscriptions only | Workspace-scoped quota (owner's plan) | Team feature | Enables shared quota pool |

## Open Questions

1. **Should `article_types` and `platform_profiles` become workspace-scoped?**
   - What we know: Currently global (shared across all users). Any authenticated user can CRUD non-default ones.
   - What's unclear: Should team workspaces have their own custom article types? Or is global fine?
   - Recommendation: Keep global for now. Workspace-scoping these tables is a separate feature and adds significant complexity. Teams will share the same global pool.

2. **Should we notify invitees by email?**
   - What we know: Supabase has `auth.admin.inviteUserByEmail()` for new users and Edge Functions for custom emails.
   - What's unclear: Whether to invest in email infrastructure for MVP.
   - Recommendation: MVP uses copy-to-clipboard invite links. Owner manually shares the link. Email notifications can be Phase 10.5 or later.

3. **What happens when a workspace owner deletes their account?**
   - What we know: `workspaces.user_id` has `ON DELETE CASCADE`, which would delete the workspace and all its articles.
   - What's unclear: Should ownership transfer before account deletion?
   - Recommendation: For MVP, cascade delete is acceptable. Add a "transfer ownership" feature as a follow-up.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/lib/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEAM-01 | Owner can invite members by email | integration | `npx vitest run src/lib/__tests__/team-invites.test.ts -x` | No - Wave 0 |
| TEAM-02 | Invite acceptance creates membership | integration | `npx vitest run src/lib/__tests__/team-invites.test.ts -x` | No - Wave 0 |
| TEAM-03 | Members see shared articles | integration | `npx vitest run src/lib/__tests__/team-access.test.ts -x` | No - Wave 0 |
| TEAM-04 | Owner can remove members | integration | `npx vitest run src/lib/__tests__/team-invites.test.ts -x` | No - Wave 0 |
| TEAM-05 | Role permissions enforced | unit | `npx vitest run src/lib/__tests__/team-roles.test.ts -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/team-*.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/team-invites.test.ts` -- covers TEAM-01, TEAM-02, TEAM-04
- [ ] `src/lib/__tests__/team-access.test.ts` -- covers TEAM-03
- [ ] `src/lib/__tests__/team-roles.test.ts` -- covers TEAM-05
- [ ] `supabase/team-migration.sql` -- migration file with all schema changes

Note: Most critical testing for RLS policies requires a real Supabase instance. Unit tests should mock Supabase client calls and verify the correct queries are constructed. RLS policy correctness should be verified manually against a Supabase project or via Supabase local dev.

## Sources

### Primary (HIGH confidence)
- Project codebase: `supabase/workspace-migration.sql`, `supabase/rls-migration.sql`, `supabase/pricing-migration.sql` -- full schema analysis
- Project codebase: `src/lib/supabase/queries.ts`, `src/types/index.ts`, `src/contexts/workspace-context.tsx` -- current implementation patterns
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- official RLS patterns

### Secondary (MEDIUM confidence)
- [BoardShape: RLS for Team Invite System](https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase) -- practical implementation guide
- [MakerKit: Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- production patterns for multi-tenant apps
- [MakerKit: RBAC in Next.js Supabase](https://makerkit.dev/docs/next-supabase-turbo/development/permissions-and-roles) -- role-based access patterns
- [Supabase Discussion #6727: RLS and Groups](https://github.com/orgs/supabase/discussions/6727) -- community patterns for group-based access

### Tertiary (LOW confidence)
- Enum ordering for role hierarchy -- verified against PostgreSQL documentation but needs testing in specific Supabase version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Supabase/Next.js stack, no new libraries needed
- Architecture: HIGH - Based on direct codebase analysis and established Supabase multi-tenant patterns
- Pitfalls: HIGH - Identified from actual code review (getArticle user_id filter, RLS policy gaps, migration backfill)
- Quota strategy: MEDIUM - MVP approach (owner's plan) is straightforward but per-workspace subscriptions need more design when Stripe connects

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (stable domain, no fast-moving dependencies)
