-- Workspace Migration
-- Run this in Supabase SQL Editor as a single transaction

BEGIN;

-- ── 1. Create workspaces table (replaces company_contexts) ──────

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL DEFAULT 'default',
  company_name text,
  company_description text,
  industry text,
  target_audience text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user ON public.workspaces(user_id);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ws_all" ON public.workspaces
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 2. Create user_settings table (tracks active workspace) ─────

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "us_all" ON public.user_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 3. Create workspace_preferences table ───────────────────────

CREATE TABLE IF NOT EXISTS public.workspace_preferences (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  selected_article_type_id text REFERENCES public.article_types(id) ON DELETE SET NULL,
  selected_platform_id text REFERENCES public.platform_profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wp_all" ON public.workspace_preferences
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = workspace_id AND w.user_id = auth.uid()
  ));

CREATE TRIGGER trg_workspace_preferences_updated_at
  BEFORE UPDATE ON public.workspace_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── 4. Add workspace_id to articles ─────────────────────────────

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ── 5. Migrate existing data ────────────────────────────────────

-- 5a. Create workspace for each company_context
INSERT INTO public.workspaces (user_id, name, slug, company_name, company_description, industry, target_audience, created_at, updated_at)
SELECT
  cc.user_id,
  COALESCE(cc.name, 'Default'),
  'default',
  cc.name,
  cc.description,
  cc.industry,
  cc.target_audience,
  cc.created_at,
  cc.updated_at
FROM public.company_contexts cc
ON CONFLICT (user_id, slug) DO NOTHING;

-- 5b. Create empty workspace for users who have articles but no company_context
INSERT INTO public.workspaces (user_id, name, slug)
SELECT DISTINCT a.user_id, 'Default', 'default'
FROM public.articles a
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.user_id = a.user_id
)
ON CONFLICT (user_id, slug) DO NOTHING;

-- 5c. Create empty workspace for users who have preferences but no workspace yet
INSERT INTO public.workspaces (user_id, name, slug)
SELECT up.user_id, 'Default', 'default'
FROM public.user_preferences up
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspaces w WHERE w.user_id = up.user_id
)
ON CONFLICT (user_id, slug) DO NOTHING;

-- 5d. Assign articles to their user's workspace
UPDATE public.articles a
SET workspace_id = (
  SELECT w.id FROM public.workspaces w WHERE w.user_id = a.user_id LIMIT 1
)
WHERE a.workspace_id IS NULL;

-- 5e. Make workspace_id NOT NULL now that all rows have values
ALTER TABLE public.articles ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_workspace ON public.articles(workspace_id);

-- 5f. Migrate user_preferences into workspace_preferences
INSERT INTO public.workspace_preferences (workspace_id, selected_article_type_id, selected_platform_id)
SELECT
  w.id,
  up.selected_article_type_id,
  up.selected_platform_id
FROM public.user_preferences up
JOIN public.workspaces w ON w.user_id = up.user_id
ON CONFLICT (workspace_id) DO NOTHING;

-- 5g. Set active workspace for each user
INSERT INTO public.user_settings (user_id, active_workspace_id)
SELECT w.user_id, w.id
FROM public.workspaces w
ON CONFLICT (user_id) DO NOTHING;

-- NOTE: Old tables (company_contexts, user_preferences) are kept for safety.
-- Drop them in a follow-up migration once the new code is confirmed working.

COMMIT;
