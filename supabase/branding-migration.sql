-- Branding Migration
-- Adds branding fields to workspaces table
-- Run this in Supabase SQL Editor

BEGIN;

-- Add branding JSONB column to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;

-- The branding JSON structure:
-- {
--   "primaryColor": "#6d28d9",
--   "secondaryColor": "#3b82f6",
--   "accentColor": "#f59e0b",
--   "logoUrl": "https://...",
--   "fontFamily": "Inter",
--   "customCss": ""
-- }

COMMENT ON COLUMN public.workspaces.branding IS 'Workspace branding: primaryColor, secondaryColor, accentColor, logoUrl, fontFamily, customCss';

COMMIT;
