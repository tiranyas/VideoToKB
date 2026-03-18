import type { WorkspaceBranding } from '@/types';

/**
 * Default branding values — neutral blue theme.
 * Used when no workspace branding is provided.
 */
export const BRANDING_DEFAULTS: Record<string, string> = {
  primaryColor: '#2563eb',
  secondaryColor: '#e5e7eb',
  accentColor: '#2563eb',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textColor: '#1f2937',
  mutedColor: '#6b7280',
};

/**
 * Replace {{placeholder}} variables in a template string with branding values.
 * - Known placeholders with provided branding values use those values.
 * - Known placeholders without branding values use BRANDING_DEFAULTS.
 * - Unknown placeholders are left as-is.
 */
export function replacePlaceholders(
  template: string,
  branding: WorkspaceBranding | undefined
): string {
  // Merge defaults with provided branding (non-empty values only)
  const values: Record<string, string> = { ...BRANDING_DEFAULTS };
  if (branding) {
    for (const [key, val] of Object.entries(branding)) {
      if (val && typeof val === 'string' && val.trim() !== '') {
        values[key] = val;
      }
    }
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
}
