-- API Keys Migration: Per-user API keys for programmatic access
-- Run this in Supabase SQL Editor after the initial migration

-- ══════════════════════════════════════════════════════════
-- API Keys table
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own keys
CREATE POLICY "ak_select" ON public.api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ak_insert" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ak_delete" ON public.api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
