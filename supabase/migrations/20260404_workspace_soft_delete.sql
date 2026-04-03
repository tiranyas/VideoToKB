-- Soft delete for workspaces: add deleted_at column
-- Workspaces with deleted_at set are hidden from queries but recoverable for 30 days

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for efficient filtering of non-deleted workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_deleted_at ON workspaces (deleted_at) WHERE deleted_at IS NULL;
