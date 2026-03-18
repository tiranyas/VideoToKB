-- Add onboarding_state JSONB column to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS onboarding_state JSONB
DEFAULT '{"completed": false, "steps": {"workspace": false, "brand": false, "platform": false, "template": false}}'::jsonb;

-- Add apply_branding toggle to platform_profiles
-- Default true for built-in templates (brand colors override template colors)
-- Scraped/custom templates should be saved with apply_branding=false
ALTER TABLE platform_profiles
ADD COLUMN IF NOT EXISTS apply_branding BOOLEAN DEFAULT true;

-- Neutralize FinBot purple in existing default platform profiles
UPDATE platform_profiles
SET html_template = REPLACE(html_template, '#6d28d9', '#2563eb'),
    html_prompt = REPLACE(html_prompt, '#6d28d9', '#2563eb')
WHERE is_default = true;
