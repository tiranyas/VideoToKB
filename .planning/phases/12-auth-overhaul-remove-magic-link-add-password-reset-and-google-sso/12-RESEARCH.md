# Phase 12: Auth Overhaul - Remove Magic Link, Add Password Reset and Google SSO - Research

**Researched:** 2026-03-22
**Domain:** Supabase Auth (OAuth, password reset, identity linking)
**Confidence:** HIGH

## Summary

This phase overhauls the login page by removing magic link authentication, adding a password reset flow, and implementing Google SSO. All three changes use existing Supabase Auth APIs already included in the project's `@supabase/ssr` (v0.9.0) and `@supabase/supabase-js` (v2.99.1) packages -- no new dependencies are needed.

The password reset flow uses `resetPasswordForEmail` to send an email, then the user clicks a link that redirects through `/auth/confirm` with a `token_hash` + `type=recovery` + `next` parameter. A new `/auth/confirm` route is needed to verify the OTP and redirect to the login page where the user enters a new password. Google SSO uses `signInWithOAuth({ provider: 'google' })` and the existing `/auth/callback` route already handles the code exchange. Supabase's automatic identity linking (enabled by default) merges Google and email/password accounts sharing the same email.

**Primary recommendation:** No new packages needed. The work is entirely UI refactoring of `login/page.tsx`, one new route handler (`/auth/confirm`), a Supabase email template edit, and Google Cloud Console + Supabase Dashboard configuration.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Remove magic link toggle and all magic link code from the login page
- Remove the `handleMagicLink` function and magic link form
- Keep the auth callback's `token_hash` handling for now (password reset uses similar flow)
- Login page becomes: Google SSO button + email/password form (no mode toggle)
- "Forgot password?" link on the login page, below the sign-in button
- Clicking shows an inline email input to request a reset link (not a separate page)
- Reset email link brings user back to /login with a "set new password" form inline
- After successfully resetting, auto sign-in (Supabase session created, redirect to app)
- Keep current password requirement: 6 characters minimum
- Auto-create account on first Google sign-in (no separate signup required)
- If same email exists with email/password, auto-link accounts (Supabase native merge)
- Plan must include a step-by-step guide for setting up Google OAuth in Google Cloud Console and configuring in Supabase dashboard
- Google SSO goes through the same onboarding flow as email/password signups
- No email confirmation required -- instant access after signup
- Sign-in and sign-up stay on same page with toggle (current behavior, minus magic link)
- Signup form must have password confirmation field (type password twice)

### Claude's Discretion
- Google button placement (above or below email form)
- Unconfirmed email handling (gentle banner vs nothing)
- Loading states and error message styling
- Exact layout adjustments after removing magic link toggle

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core (already installed -- no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.99.1 | Auth client (`signInWithOAuth`, `resetPasswordForEmail`, `updateUser`) | Already in project |
| `@supabase/ssr` | ^0.9.0 | Server-side cookie-based session management | Already in project |
| Next.js | 16.1.6 | App Router, route handlers, middleware | Already in project |

### Supporting
None needed -- all auth functionality is built into the existing Supabase packages.

### Alternatives Considered
None -- all decisions are locked to Supabase Auth native features.

**Installation:**
```bash
# No installation needed -- all packages already present
```

## Architecture Patterns

### Recommended Changes to Project Structure
```
src/
├── app/
│   ├── login/
│   │   └── page.tsx          # MODIFY: Remove magic link, add Google SSO, add password reset inline forms
│   ├── auth/
│   │   ├── callback/
│   │   │   └── route.ts      # MODIFY: Clean up magic link comments, keep code exchange
│   │   └── confirm/
│   │       └── route.ts      # NEW: Handle token_hash verification for password reset emails
│   └── ...
├── middleware.ts              # MODIFY: Add /auth/confirm to public routes
└── ...
```

### Pattern 1: Google SSO via signInWithOAuth (Client-Side)
**What:** Initiate Google OAuth from the browser; Supabase handles the redirect dance.
**When to use:** When the user clicks "Continue with Google".
**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`,
  },
});
```
The browser automatically redirects to Google's consent screen. After consent, Google redirects to Supabase's hosted callback (`https://<project>.supabase.co/auth/v1/callback`), which then redirects to your app's `/auth/callback` with a `code` parameter. The existing `exchangeCodeForSession(code)` in `/auth/callback/route.ts` handles the rest.

### Pattern 2: Password Reset Flow (3-Step PKCE)
**What:** Send reset email, verify token on click, update password.
**When to use:** User clicks "Forgot password?" on login page.

**Step 1 -- Send reset email (client-side):**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/confirm`,
});
```

**Step 2 -- Verify token (new server route `/auth/confirm/route.ts`):**
```typescript
// Source: https://github.com/orgs/supabase/discussions/30402
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email',
    });
    if (!error) {
      // For recovery, redirect to login page with reset mode
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/login?mode=reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_token`);
}
```

**Step 3 -- Update password (client-side, user now has session from verifyOtp):**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

### Pattern 3: Login Page State Machine
**What:** The login page manages multiple inline views without separate routes.
**States:**
- `sign-in` -- email + password form + "Continue with Google" + "Forgot password?" link
- `sign-up` -- email + password + confirm password form + "Continue with Google"
- `forgot-password` -- email input + "Send reset link" button
- `reset-password` -- new password + confirm password form (entered via `?mode=reset-password` URL param, user has active session from token verification)

### Anti-Patterns to Avoid
- **Creating separate pages for forgot/reset password:** User decision explicitly says inline on login page.
- **Using `exchangeCodeForSession` for token_hash:** The token_hash from reset emails must use `verifyOtp`, not `exchangeCodeForSession`. This is a known gotcha with PKCE flow.
- **Redirecting to `/` after password reset token verification:** Must redirect to login page with `?mode=reset-password` so the user can enter their new password while the session from `verifyOtp` is still active.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow | Custom OAuth redirect handling | `supabase.auth.signInWithOAuth()` | Handles PKCE, state params, redirect dance |
| Password reset email | Custom email sending | `supabase.auth.resetPasswordForEmail()` | Uses Supabase's email infrastructure |
| Token verification | Manual JWT/token parsing | `supabase.auth.verifyOtp()` | Handles token_hash securely |
| Account linking | Custom merge logic | Supabase automatic identity linking | Enabled by default, handles edge cases |
| Password update | Direct DB update | `supabase.auth.updateUser()` | Validates session, hashes password |

**Key insight:** Every auth operation has a corresponding Supabase method. Zero custom auth logic is needed.

## Common Pitfalls

### Pitfall 1: PKCE Code Verifier Mismatch on Password Reset
**What goes wrong:** Using `exchangeCodeForSession` for password reset tokens causes "both auth code and code verifier should be non-empty" error.
**Why it happens:** Password reset emails use `token_hash`, not OAuth `code`. The PKCE code verifier is stored in the browser that initiated the OAuth flow, not available on the server for reset tokens.
**How to avoid:** Use `verifyOtp({ token_hash, type: 'recovery' })` for password reset callbacks. Only use `exchangeCodeForSession` for OAuth code exchange.
**Warning signs:** "code verifier" errors in auth callback.

### Pitfall 2: Supabase Email Template Not Updated
**What goes wrong:** Default Supabase "Reset Password" email template uses `{{ .ConfirmationURL }}` which redirects through Supabase's hosted confirm endpoint, not your app's `/auth/confirm`.
**Why it happens:** The default template doesn't include `token_hash` and `type` parameters for your custom endpoint.
**How to avoid:** Update the email template in Supabase Dashboard > Authentication > Email Templates > "Reset Password" to use:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/login?mode=reset-password">Reset Password</a>
```
**Warning signs:** Reset link redirects to Supabase's hosted page instead of your app.

### Pitfall 3: Google OAuth Redirect URI Mismatch
**What goes wrong:** Google OAuth fails with "redirect_uri_mismatch" error.
**Why it happens:** The authorized redirect URI in Google Cloud Console doesn't match Supabase's callback URL.
**How to avoid:** Add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud Console. For local dev, add `http://127.0.0.1:54321/auth/v1/callback`.
**Warning signs:** Error from Google's consent screen, not from your app.

### Pitfall 4: Password Reset Session Expiry
**What goes wrong:** User clicks reset link, gets redirected, but session from `verifyOtp` expires before they enter new password.
**Why it happens:** The session created by `verifyOtp` has a standard expiry but the user might be slow.
**How to avoid:** Redirect immediately to the new-password form (inline on login page). Keep the form simple -- just two password fields and a submit button.
**Warning signs:** "Auth session missing" error when calling `updateUser`.

### Pitfall 5: Middleware Blocking Auth Confirm Route
**What goes wrong:** Password reset link clicks get redirected to `/landing` because `/auth/confirm` isn't in the public routes list.
**Why it happens:** Middleware checks auth before the confirm route can create a session.
**How to avoid:** The middleware already includes `/auth/callback` in `isPublicRoute`. It uses `startsWith('/auth/callback')` -- change this to `startsWith('/auth/')` to cover both `/auth/callback` and `/auth/confirm`.
**Warning signs:** Infinite redirect loop when clicking reset link.

### Pitfall 6: Logged-In User Blocked from Login Page Reset Flow
**What goes wrong:** User clicks password reset link, gets session from `verifyOtp`, then middleware redirects them away from `/login` because they're now authenticated.
**Why it happens:** Middleware line: `if (user && pathname === '/login') redirect to /`.
**How to avoid:** Add an exception: if the URL has `?mode=reset-password`, allow authenticated users to stay on `/login`. Alternatively, check for `mode` search param in the middleware redirect logic.
**Warning signs:** User clicks reset link but gets sent to dashboard instead of password form.

## Code Examples

### Google SSO Button Handler
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-signinwithoauth
async function handleGoogleSignIn() {
  setLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) {
    setError(error.message);
    setLoading(false);
  }
  // Browser redirects automatically -- no need to handle success
}
```

### Password Reset Request
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
async function handleForgotPassword(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError('');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/confirm`,
  });

  setLoading(false);
  if (error) {
    setError(error.message);
  } else {
    setSent(true); // Show "check your email" message
  }
}
```

### Password Update After Reset
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-updateuser
async function handlePasswordUpdate(e: React.FormEvent) {
  e.preventDefault();
  if (newPassword !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  setLoading(true);
  setError('');

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  setLoading(false);
  if (error) {
    setError(error.message);
  } else {
    router.push('/');
    router.refresh();
  }
}
```

### Auth Confirm Route (New)
```typescript
// Source: https://github.com/orgs/supabase/discussions/30402
// src/app/auth/confirm/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email',
    });
    if (!error) {
      // Recovery flow: redirect to login with reset-password mode
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/login?mode=reset-password`);
      }
      // Other types (email confirmation): redirect to next
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_token`);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Magic link (OTP) login | Password + OAuth | Current phase | Removes client confusion |
| `{{ .ConfirmationURL }}` in email template | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` | Supabase PKCE adoption | Required for SSR apps |
| Manual identity merging | Automatic identity linking (default) | Supabase Auth v2 | Zero code needed for Google+email merge |

## Open Questions

1. **Supabase Email Template Access**
   - What we know: The "Reset Password" email template must be customized in Supabase Dashboard > Authentication > Email Templates
   - What's unclear: Whether the project's current email templates have been customized already
   - Recommendation: Include explicit template content in the plan as a manual configuration step

2. **Google Cloud Console Project**
   - What we know: Need OAuth client ID + secret from Google Cloud Console
   - What's unclear: Whether Tiran already has a Google Cloud project for KBPipe
   - Recommendation: Plan includes full Google Cloud Console setup steps (create project, configure consent screen, create credentials)

3. **Supabase Redirect URLs Configuration**
   - What we know: Both `redirectTo` URLs (for OAuth and password reset) must be allowlisted in Supabase Dashboard > Authentication > URL Configuration
   - What's unclear: What URLs are currently in the allow list
   - Recommendation: Plan includes adding production and localhost URLs to the redirect allow list

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via project config) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/app/auth/__tests__/confirm.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Auth confirm route verifies recovery token_hash and redirects to login?mode=reset-password | unit | `npx vitest run src/app/auth/__tests__/confirm.test.ts -x` | -- Wave 0 |
| AUTH-02 | Auth confirm route returns error redirect on invalid token | unit | `npx vitest run src/app/auth/__tests__/confirm.test.ts -x` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/app/auth/__tests__/confirm.test.ts` -- covers auth confirm route handler
- [ ] The login page is a React component with client-side Supabase calls -- UI testing requires E2E (Playwright), not unit tests. Functional correctness verified by manual smoke test.

## Sources

### Primary (HIGH confidence)
- [Supabase signInWithOAuth docs](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) - OAuth API signature and options
- [Supabase resetPasswordForEmail docs](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) - Password reset API and flow
- [Supabase Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google) - Google Cloud Console setup steps
- [Supabase Identity Linking docs](https://supabase.com/docs/guides/auth/auth-identity-linking) - Automatic linking behavior (enabled by default)
- [Supabase Email Templates docs](https://supabase.com/docs/guides/auth/auth-email-templates) - Template customization

### Secondary (MEDIUM confidence)
- [GitHub Discussion #30402](https://github.com/orgs/supabase/discussions/30402) - Password reset email URL structure with token_hash + type=recovery + next params
- [GitHub Discussion #28655](https://github.com/orgs/supabase/discussions/28655) - PKCE password reset: use verifyOtp instead of exchangeCodeForSession
- [Supabase PKCE flow docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) - PKCE flow overview

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Supabase packages already in project, verified APIs via official docs
- Architecture: HIGH - Patterns verified against official docs and community discussions; existing codebase patterns well understood
- Pitfalls: HIGH - Multiple community reports confirm PKCE/token_hash gotcha and middleware blocking issues

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable -- Supabase Auth APIs are mature)
