import { type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Auth helper for E2E tests.
 *
 * Creates a test user via Supabase Admin API and injects session cookies
 * into the Playwright browser context so tests can access authenticated routes.
 *
 * Required env vars:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional env vars:
 *   - E2E_TEST_EMAIL (default: e2e-test@kbpipe.local)
 *   - E2E_TEST_PASSWORD (default: e2e-test-password-123!)
 */

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test@kbpipe.local';
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e-test-password-123!';

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set');
  // Extract subdomain: https://abcdefg.supabase.co -> abcdefg
  const match = url.match(/https?:\/\/([^.]+)\./);
  if (!match) throw new Error(`Cannot extract project ref from ${url}`);
  return match[1];
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'E2E auth requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Injects Supabase auth cookies + kbpipe-onboarded cookie into a Playwright
 * browser context so the middleware treats subsequent requests as authenticated.
 */
export async function loginAsTestUser(context: BrowserContext): Promise<void> {
  const supabase = getAdminClient();
  const ref = getProjectRef();

  // Ensure test user exists (idempotent — ignores "already registered" errors)
  await supabase.auth.admin.createUser({
    email: E2E_TEST_EMAIL,
    password: E2E_TEST_PASSWORD,
    email_confirm: true,
  });

  // Sign in to get a valid session
  const { data, error } = await supabase.auth.signInWithPassword({
    email: E2E_TEST_EMAIL,
    password: E2E_TEST_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`E2E login failed: ${error?.message || 'no session returned'}`);
  }

  const { access_token, refresh_token, expires_in, expires_at, token_type } = data.session;

  // Supabase SSR stores auth in a cookie named sb-{ref}-auth-token
  // The value is a base64-encoded JSON array (chunked cookie format used by @supabase/ssr)
  const cookieValue = JSON.stringify([
    `base64-${btoa(JSON.stringify({
      access_token,
      refresh_token,
      expires_in,
      expires_at,
      token_type,
      user: data.session.user,
    }))}`,
  ]);

  await context.addCookies([
    {
      name: `sb-${ref}-auth-token`,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'kbpipe-onboarded',
      value: 'true',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}
