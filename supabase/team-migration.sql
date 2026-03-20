-- Team Migration: Shared Workspaces & Team Access
-- Adds workspace_members, workspace_invites, helper functions, updated RLS
-- Run in Supabase SQL Editor as a single transaction

BEGIN;

-- ══════════════════════════════════════════════════════════
-- 1. Create enums
-- ══════════════════════════════════════════════════════════
-- Ordering matters: owner < admin < member for <= comparisons
DO $$ BEGIN
  CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════
-- 2. Create workspace_members table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wm_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wm_workspace ON workspace_members(workspace_id);

CREATE TRIGGER set_wm_updated_at
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- 3. Create workspace_invites table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS workspace_invites (
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

CREATE INDEX IF NOT EXISTS idx_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON workspace_invites(email);

ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- 4. Helper functions (SECURITY DEFINER)
-- ══════════════════════════════════════════════════════════

-- Check if current user is a member of the workspace
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

-- Check if current user has at least the required role
-- Enum ordering: owner(0) < admin(1) < member(2)
-- So role <= 'admin' matches owner and admin
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
      AND role <= required_role
  );
$$;

-- ══════════════════════════════════════════════════════════
-- 5. Accept invite function (SECURITY DEFINER)
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION accept_workspace_invite(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite workspace_invites%ROWTYPE;
  v_user_id uuid := auth.uid();
  v_user_email text;
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

  -- Get authenticated user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  -- Verify email matches the invite
  IF v_invite.email != v_user_email THEN
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

-- ══════════════════════════════════════════════════════════
-- 6. CRITICAL: Backfill existing owners
--    This MUST happen BEFORE dropping old RLS policies
-- ══════════════════════════════════════════════════════════

INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'owner'::workspace_role
FROM workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════
-- 7. Drop old RLS policies and create new membership-based ones
-- ══════════════════════════════════════════════════════════

-- -- Workspaces --

DROP POLICY IF EXISTS "ws_all" ON workspaces;

CREATE POLICY "ws_select" ON workspaces
  FOR SELECT TO authenticated
  USING (is_workspace_member(id));

CREATE POLICY "ws_insert" ON workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ws_update" ON workspaces
  FOR UPDATE TO authenticated
  USING (has_workspace_role(id, 'admin'))
  WITH CHECK (has_workspace_role(id, 'admin'));

CREATE POLICY "ws_delete" ON workspaces
  FOR DELETE TO authenticated
  USING (has_workspace_role(id, 'owner'));

-- -- Articles --

DROP POLICY IF EXISTS "articles_select" ON articles;
DROP POLICY IF EXISTS "articles_insert" ON articles;
DROP POLICY IF EXISTS "articles_update" ON articles;
DROP POLICY IF EXISTS "articles_delete" ON articles;

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
    auth.uid() = user_id
    OR has_workspace_role(workspace_id, 'admin')
  );

-- -- Workspace Preferences --

DROP POLICY IF EXISTS "wp_all" ON workspace_preferences;

CREATE POLICY "wp_select" ON workspace_preferences
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "wp_upsert" ON workspace_preferences
  FOR INSERT TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "wp_update" ON workspace_preferences
  FOR UPDATE TO authenticated
  USING (has_workspace_role(workspace_id, 'admin'));

-- ══════════════════════════════════════════════════════════
-- 8. RLS on new tables
-- ══════════════════════════════════════════════════════════

-- -- workspace_members --

CREATE POLICY "wm_select" ON workspace_members
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "wm_insert" ON workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "wm_delete" ON workspace_members
  FOR DELETE TO authenticated
  USING (
    has_workspace_role(workspace_id, 'admin')
    AND user_id != (
      SELECT wm.user_id FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.role = 'owner'
      LIMIT 1
    )
  );

CREATE POLICY "wm_update" ON workspace_members
  FOR UPDATE TO authenticated
  USING (has_workspace_role(workspace_id, 'owner'));

-- -- workspace_invites --

CREATE POLICY "wi_select" ON workspace_invites
  FOR SELECT TO authenticated
  USING (is_workspace_member(workspace_id));

CREATE POLICY "wi_insert" ON workspace_invites
  FOR INSERT TO authenticated
  WITH CHECK (has_workspace_role(workspace_id, 'admin'));

CREATE POLICY "wi_delete" ON workspace_invites
  FOR DELETE TO authenticated
  USING (has_workspace_role(workspace_id, 'admin'));

-- ══════════════════════════════════════════════════════════
-- 9. Update get_workspace_stats to use membership check
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_workspace_stats(p_workspace_id uuid)
RETURNS TABLE (
  total_articles bigint,
  this_week bigint,
  this_month bigint,
  youtube_count bigint,
  loom_count bigint,
  google_drive_count bigint,
  paste_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN QUERY SELECT
      0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)                                                          AS total_articles,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')   AS this_week,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')  AS this_month,
    COUNT(*) FILTER (WHERE source_type = 'youtube')                   AS youtube_count,
    COUNT(*) FILTER (WHERE source_type = 'loom')                      AS loom_count,
    COUNT(*) FILTER (WHERE source_type = 'google-drive')              AS google_drive_count,
    COUNT(*) FILTER (WHERE source_type = 'paste')                     AS paste_count
  FROM articles
  WHERE workspace_id = p_workspace_id;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 10. Create get_workspace_usage function
-- ══════════════════════════════════════════════════════════

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
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Get workspace owner
  SELECT wm.user_id INTO v_owner_id
  FROM workspace_members wm
  WHERE wm.workspace_id = p_workspace_id AND wm.role = 'owner'
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
$$;

-- ══════════════════════════════════════════════════════════
-- 11. Grant execute permissions
-- ══════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION is_workspace_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_workspace_role(uuid, workspace_role) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_workspace_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workspace_usage(uuid) TO authenticated;

COMMIT;
