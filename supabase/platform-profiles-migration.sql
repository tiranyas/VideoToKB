-- Platform Profiles Migration: Add Generic, Notion, Confluence defaults
-- Run this in Supabase SQL Editor

-- 1. Insert new platform profiles (skip if already exist)
INSERT INTO public.platform_profiles (id, name, html_prompt, html_template, is_default)
VALUES ('generic-html', 'Generic Clean HTML', '', '', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_profiles (id, name, html_prompt, html_template, is_default)
VALUES ('notion', 'Notion', '', '', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_profiles (id, name, html_prompt, html_template, is_default)
VALUES ('confluence', 'Confluence', '', '', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Update workspace_preferences that pointed to old 'helpjuice' default
--    to use 'generic-html' instead (optional — uncomment if desired)
-- UPDATE public.workspace_preferences
--   SET selected_platform_id = 'generic-html'
--   WHERE selected_platform_id = 'helpjuice';
