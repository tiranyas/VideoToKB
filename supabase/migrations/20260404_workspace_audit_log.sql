-- Audit log for workspace team activity tracking
-- Team/Enterprise plans feature: tracks who did what in a workspace

CREATE TABLE IF NOT EXISTS workspace_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'article_created', 'article_deleted', 'member_invited', 'member_removed', 'settings_updated', etc.
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index for efficient workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON workspace_audit_log (workspace_id, created_at DESC);

-- RLS: workspace members can read their workspace's audit log
ALTER TABLE workspace_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace audit log"
  ON workspace_audit_log
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid()
    )
  );

-- Only service role can insert (triggered from API routes)
CREATE POLICY "Service role can insert audit log"
  ON workspace_audit_log
  FOR INSERT
  WITH CHECK (true);
