-- RPC function to get workspace members with email from auth.users
-- Needed because auth.users is not accessible via PostgREST directly

CREATE OR REPLACE FUNCTION public.get_workspace_members_with_email(p_workspace_id uuid)
RETURNS TABLE (
  id uuid,
  workspace_id uuid,
  user_id uuid,
  role workspace_role,
  email text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow members of the workspace to call this
  IF NOT is_workspace_member(p_workspace_id) THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  RETURN QUERY
  SELECT
    wm.id,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    au.email::text,
    wm.created_at,
    wm.updated_at
  FROM workspace_members wm
  JOIN auth.users au ON au.id = wm.user_id
  WHERE wm.workspace_id = p_workspace_id
  ORDER BY wm.created_at ASC;
END;
$$;
