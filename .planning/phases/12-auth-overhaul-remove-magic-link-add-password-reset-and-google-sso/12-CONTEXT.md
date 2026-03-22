# Phase 12: Auth Overhaul — Remove Magic Link, Add Password Reset and Google SSO - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Overhaul the authentication flow: remove magic link option (causing confusion for clients), add a working password reset flow, and implement Google SSO. The login page should be clean and easy for B2B clients signing up for the first time.

</domain>

<decisions>
## Implementation Decisions

### Magic Link Removal
- Remove the magic link toggle and all magic link code from the login page
- Remove the `handleMagicLink` function and magic link form
- Keep the auth callback's `token_hash` handling for now (password reset uses similar flow)
- Login page becomes: Google SSO button + email/password form (no mode toggle)

### Password Reset Flow
- "Forgot password?" link on the login page, below the sign-in button
- Clicking shows an inline email input to request a reset link (not a separate page)
- Reset email link brings user back to /login with a "set new password" form inline
- After successfully resetting, auto sign-in (Supabase session created, redirect to app)
- Keep current password requirement: 6 characters minimum

### Google SSO
- Auto-create account on first Google sign-in (no separate signup required)
- If same email exists with email/password, auto-link accounts (Supabase native merge)
- Plan must include a step-by-step guide for setting up Google OAuth in Google Cloud Console and configuring in Supabase dashboard
- Google SSO goes through the same onboarding flow as email/password signups

### Google Button Placement
- Claude's discretion on where to place the "Continue with Google" button relative to the email form

### Email Confirmation
- No email confirmation required — instant access after signup
- Confirmation email behavior is Claude's discretion (gentle reminder vs nothing)

### Signup UX
- Sign-in and sign-up stay on same page with toggle (current behavior, minus magic link)
- Signup form must have password confirmation field (type password twice)

### Claude's Discretion
- Google button placement (above or below email form)
- Unconfirmed email handling (gentle banner vs nothing)
- Loading states and error message styling
- Exact layout adjustments after removing magic link toggle

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/login/page.tsx`: Current login page with password + magic link modes — will be heavily modified
- `src/app/auth/callback/route.ts`: Already handles OAuth code exchange (`exchangeCodeForSession`) — ready for Google SSO
- `src/lib/supabase/client.ts`: Browser Supabase client factory — use for `signInWithOAuth`, `resetPasswordForEmail`
- `src/lib/supabase/server.ts`: Server Supabase client — used in callback route
- `src/middleware.ts`: Auth middleware — public route list needs updating if any new routes added

### Established Patterns
- Supabase auth via `@supabase/ssr` with cookie-based sessions
- Auth callback at `/auth/callback` handles code exchange
- Middleware redirects unauthenticated users to `/landing`
- Onboarding check via `kbpipe-onboarded` cookie in middleware

### Integration Points
- Login page (`src/app/login/page.tsx`) — main file to modify
- Auth callback (`src/app/auth/callback/route.ts`) — may need password reset token handling
- Middleware (`src/middleware.ts`) — add `/reset-password` or similar to public routes if needed
- Supabase Dashboard — Google OAuth provider configuration needed

</code_context>

<specifics>
## Specific Ideas

- Clients are already trying to sign up and having issues with magic link — this is urgent
- The auth callback already has OAuth code exchange logic, just needs Google provider wired in
- Password reset should use Supabase's `resetPasswordForEmail` API (sends email with link)
- The `type` parameter in auth callback can distinguish between password reset and other flows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-auth-overhaul-remove-magic-link-add-password-reset-and-google-sso*
*Context gathered: 2026-03-22*
