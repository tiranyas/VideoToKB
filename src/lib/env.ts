/**
 * Environment variable validation.
 * Import this module in server-side code to fail fast on missing env vars.
 */

const REQUIRED_SERVER_VARS = [
  'ANTHROPIC_API_KEY',
  'ASSEMBLYAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing: string[] = [];

if (typeof window === 'undefined') {
  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    console.error(
      `[env] Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/** Returns list of missing env vars (empty if all present). */
export function getMissingEnvVars(): string[] {
  return missing;
}

/** Throws if any required env vars are missing. Call in critical API routes. */
export function assertEnvVars(): void {
  if (missing.length > 0) {
    throw new Error(
      `Server misconfigured: missing ${missing.join(', ')}`
    );
  }
}
