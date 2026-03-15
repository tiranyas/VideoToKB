-- Migration: Add get_workspace_stats RPC function
-- Purpose: O(1) dashboard stats aggregation instead of fetching all articles client-side

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
  -- Verify the caller owns this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id AND user_id = auth.uid()
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

-- Grant execute to authenticated users (RLS + ownership check above handles authorization)
GRANT EXECUTE ON FUNCTION get_workspace_stats(uuid) TO authenticated;
