-- VideoToKB Database Migration
-- Run this in Supabase SQL Editor

-- ── Tables ─────────────────────────────────────────────────

-- Company contexts (per-user)
CREATE TABLE IF NOT EXISTS public.company_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  industry text,
  target_audience text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Article types (shared)
CREATE TABLE IF NOT EXISTS public.article_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  draft_prompt text NOT NULL,
  structure_prompt text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Platform profiles (shared)
CREATE TABLE IF NOT EXISTS public.platform_profiles (
  id text PRIMARY KEY,
  name text NOT NULL,
  html_prompt text NOT NULL,
  html_template text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User preferences (per-user)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_article_type_id text REFERENCES public.article_types(id) ON DELETE SET NULL,
  selected_platform_id text REFERENCES public.platform_profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Updated-at trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_contexts_updated_at
  BEFORE UPDATE ON public.company_contexts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── RLS Policies ───────────────────────────────────────────

ALTER TABLE public.company_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Company contexts: users see only their own
CREATE POLICY "Users can manage own company context"
  ON public.company_contexts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Article types: all authenticated can read + create + update, can't delete defaults
CREATE POLICY "Authenticated users can read article types"
  ON public.article_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert article types"
  ON public.article_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update article types"
  ON public.article_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-default article types"
  ON public.article_types FOR DELETE
  TO authenticated
  USING (is_default = false);

-- Platform profiles: same pattern
CREATE POLICY "Authenticated users can read platform profiles"
  ON public.platform_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert platform profiles"
  ON public.platform_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update platform profiles"
  ON public.platform_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete non-default platform profiles"
  ON public.platform_profiles FOR DELETE
  TO authenticated
  USING (is_default = false);

-- User preferences: users see only their own
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Articles (per-user) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_url text,
  source_type text NOT NULL,
  article_type_id text REFERENCES public.article_types(id) ON DELETE SET NULL,
  platform_id text REFERENCES public.platform_profiles(id) ON DELETE SET NULL,
  markdown text NOT NULL,
  html text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own articles"
  ON public.articles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: Seed data is inserted separately via the seed script below
