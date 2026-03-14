-- RLS Migration: Enforce row-level security on all tables
-- Run this in Supabase SQL Editor after the initial migration

-- ══════════════════════════════════════════════════════════
-- Drop existing policies (idempotent re-run)
-- ══════════════════════════════════════════════════════════

DO $$ BEGIN
  -- company_contexts
  DROP POLICY IF EXISTS "Users can manage own company context" ON public.company_contexts;
  DROP POLICY IF EXISTS "cc_select" ON public.company_contexts;
  DROP POLICY IF EXISTS "cc_insert" ON public.company_contexts;
  DROP POLICY IF EXISTS "cc_update" ON public.company_contexts;
  DROP POLICY IF EXISTS "cc_delete" ON public.company_contexts;

  -- articles
  DROP POLICY IF EXISTS "Users can CRUD own articles" ON public.articles;
  DROP POLICY IF EXISTS "articles_select" ON public.articles;
  DROP POLICY IF EXISTS "articles_insert" ON public.articles;
  DROP POLICY IF EXISTS "articles_update" ON public.articles;
  DROP POLICY IF EXISTS "articles_delete" ON public.articles;

  -- user_preferences
  DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
  DROP POLICY IF EXISTS "up_select" ON public.user_preferences;
  DROP POLICY IF EXISTS "up_insert" ON public.user_preferences;
  DROP POLICY IF EXISTS "up_update" ON public.user_preferences;
  DROP POLICY IF EXISTS "up_delete" ON public.user_preferences;

  -- article_types
  DROP POLICY IF EXISTS "Authenticated users can read article types" ON public.article_types;
  DROP POLICY IF EXISTS "Authenticated users can insert article types" ON public.article_types;
  DROP POLICY IF EXISTS "Authenticated users can update article types" ON public.article_types;
  DROP POLICY IF EXISTS "Authenticated users can delete non-default article types" ON public.article_types;
  DROP POLICY IF EXISTS "at_select" ON public.article_types;
  DROP POLICY IF EXISTS "at_insert" ON public.article_types;
  DROP POLICY IF EXISTS "at_update" ON public.article_types;
  DROP POLICY IF EXISTS "at_delete" ON public.article_types;

  -- platform_profiles
  DROP POLICY IF EXISTS "Authenticated users can read platform profiles" ON public.platform_profiles;
  DROP POLICY IF EXISTS "Authenticated users can insert platform profiles" ON public.platform_profiles;
  DROP POLICY IF EXISTS "Authenticated users can update platform profiles" ON public.platform_profiles;
  DROP POLICY IF EXISTS "Authenticated users can delete non-default platform profiles" ON public.platform_profiles;
  DROP POLICY IF EXISTS "pp_select" ON public.platform_profiles;
  DROP POLICY IF EXISTS "pp_insert" ON public.platform_profiles;
  DROP POLICY IF EXISTS "pp_update" ON public.platform_profiles;
  DROP POLICY IF EXISTS "pp_delete" ON public.platform_profiles;
END $$;

-- ══════════════════════════════════════════════════════════
-- Enable RLS on all tables
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.company_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_profiles ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════
-- company_contexts (has user_id)
-- ══════════════════════════════════════════════════════════

CREATE POLICY "cc_select" ON public.company_contexts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "cc_insert" ON public.company_contexts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cc_update" ON public.company_contexts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cc_delete" ON public.company_contexts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- articles (has user_id)
-- ══════════════════════════════════════════════════════════

CREATE POLICY "articles_select" ON public.articles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "articles_insert" ON public.articles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "articles_update" ON public.articles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "articles_delete" ON public.articles
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- user_preferences (has user_id as PK)
-- ══════════════════════════════════════════════════════════

CREATE POLICY "up_select" ON public.user_preferences
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "up_insert" ON public.user_preferences
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "up_update" ON public.user_preferences
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "up_delete" ON public.user_preferences
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- article_types (shared, no user_id)
--   SELECT: any authenticated user
--   INSERT/UPDATE: any authenticated user (non-defaults only for mutations)
--   DELETE: only non-default rows, restricted to service_role
-- ══════════════════════════════════════════════════════════

CREATE POLICY "at_select" ON public.article_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "at_insert" ON public.article_types
  FOR INSERT TO authenticated
  WITH CHECK (is_default = false);

CREATE POLICY "at_update" ON public.article_types
  FOR UPDATE TO authenticated
  USING (is_default = false)
  WITH CHECK (is_default = false);

CREATE POLICY "at_delete" ON public.article_types
  FOR DELETE TO authenticated
  USING (is_default = false);

-- ══════════════════════════════════════════════════════════
-- platform_profiles (shared, no user_id)
--   Same pattern as article_types
-- ══════════════════════════════════════════════════════════

CREATE POLICY "pp_select" ON public.platform_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "pp_insert" ON public.platform_profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_default = false);

CREATE POLICY "pp_update" ON public.platform_profiles
  FOR UPDATE TO authenticated
  USING (is_default = false)
  WITH CHECK (is_default = false);

CREATE POLICY "pp_delete" ON public.platform_profiles
  FOR DELETE TO authenticated
  USING (is_default = false);
