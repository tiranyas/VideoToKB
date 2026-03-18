# Phase 8: Generic Templates & Onboarding - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

New users go through a guided onboarding wizard that captures their brand, company context, KB platform, and optional article style reference before generating their first article. Default templates across all platforms use neutral colors (blue-600 `#2563eb`) instead of FinBot branding. Workspace branding colors flow into generated HTML at generation time. All currently supported platforms PLUS Zendesk and Intercom are available in the platform picker with production-ready templates.

</domain>

<decisions>
## Implementation Decisions

### Onboarding Flow UX
- Full-page wizard at `/onboarding` route — dedicated, focused, not a modal
- Triggers after first signup/login if workspace has no branding colors set (catches existing users too)
- 4 steps: (1) Name workspace, (2) Paste company website URL, (3) Pick KB platform, (4) Optional: paste existing article URL for style scraping
- "Skip setup" button always visible. Each step also has "Skip this step" to advance without filling it
- Step dot indicators (1 2 3 4) at the top
- Unique welcome feel: subtle gradient background (soft violet-to-white) with small SVG illustrations per step
- After completion, land on main page (article generator)
- Returning users who skipped see the existing OnboardingChecklist widget on homepage + "Complete setup" link in Settings
- Re-run wizard accessible from Settings page ("Setup Wizard" button), pre-fills existing values
- Fully responsive: works on mobile with adapted layouts

### Brand Extraction (Step 2)
- One URL paste extracts everything: company context (name, description, industry, audience via Claude) AND brand colors (parse CSS for top 3-5 non-white/black colors) AND logo (meta tags/favicon)
- Show editable preview after extraction: user can tweak name, description, colors, logo before saving
- User presented color palette from CSS, picks which ones to assign as primary/accent
- If scrape fails: show friendly message + manual entry form (company name, description, color picker)
- After scrape, if company name differs from workspace name in step 1, offer to update: "We found your company is called X — update workspace name?"

### Template Neutralization
- Default primary color: `#2563eb` (blue-600) replaces `#6d28d9` (FinBot purple)
- Neutralize ALL built-in templates: Generic HTML, Helpjuice, Confluence, Notion — audit every one for `#6d28d9` or FinBot-specific values
- Branding colors injected at generation time via template variable replacement using `{{variableName}}` mustache-style placeholders
- If no branding set, neutral defaults are used
- Font family: if user sets fontFamily in workspace branding, inject into `--kb-font`. Otherwise keep system-ui default
- Scraped custom template wins by default, but platform profile has a toggle: "Apply workspace brand colors to this template" (default ON for built-in, OFF for scraped)
- Auto-replace FinBot purple in built-in templates only (code-level). User custom platform profiles left untouched

### Platform Selection (Step 3)
- Card grid with platform logos + preview thumbnail snippet (title, callout, paragraph showing platform's visual style)
- Preview thumbnails: static images generated programmatically from actual templates with sample content
- Platforms available: Helpjuice, Confluence, Notion, Zendesk, Intercom, Generic HTML, Markdown — all 7
- Zendesk and Intercom templates: production-ready using research findings (Zendesk: CSS classes; Intercom: stripped HTML)
- Markdown included as a platform option (for GitHub wikis, GitBook, etc.)
- Selecting a platform immediately sets it as workspace default
- Responsive: 2-column grid on mobile, 3-4 columns on desktop

### Article URL Scraping (Step 4)
- Reuse existing `/api/scrape-template` endpoint as-is, call from onboarding
- After scraping, show live preview in sandboxed iframe: "This is the style we'll match"
- Auto-detect platform from scraped HTML classes — suggest platform change if detected platform differs from selection
- If scrape fails: retry once, then offer paste-HTML-directly fallback
- Step is optional — clearly visible skip button

### Workspace Naming & Defaults
- Step 1: text input with placeholder "e.g. Acme Corp", validate not empty, max 50 chars, auto-generate slug
- New workspaces start with "Standard" article type + "Generic HTML" platform as defaults (safe if onboarding is skipped)
- Step 1 name comes first; step 2 may offer to update if scraped company name differs

### Existing User Migration
- Show onboarding to existing users if workspace has no branding colors set
- Auto-replace FinBot purple only in code-level built-in templates, NOT in user-created DB records

### Onboarding Completion Tracking
- `onboarding_state` JSONB column on workspace table: `{ completed: boolean, steps: { workspace: bool, brand: bool, platform: bool, template: bool }, skipped_at?: timestamp }`
- Partial completion persists: if user closes browser mid-flow, resume from first incomplete step on next visit
- Basic step completion analytics: log when each step is completed/skipped in the onboarding_state

### Branding in HTML Prompt
- Template variable replacement with `{{primaryColor}}`, `{{accentColor}}`, `{{fontFamily}}` etc.
- At generation time, fill placeholders with workspace branding or neutral defaults
- Company context (name, description, industry) always injected from workspace fields into Agent 2/3 prompts (already works, just ensure onboarding populates these)

### Mobile Responsiveness
- Wizard fully responsive
- Platform card grid: 2 columns on mobile, 3-4 on desktop
- All form inputs, color pickers, and previews work on mobile

### Claude's Discretion
- Exact gradient colors and SVG illustrations for onboarding welcome feel
- Loading states and animations during scraping
- Color extraction algorithm details (which CSS properties to parse)
- Logo extraction fallback chain (meta og:image → favicon → apple-touch-icon)
- Error message copy and tone
- Exact onboarding_state schema details beyond what's specified
- How to generate static platform preview images (Playwright script, etc.)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OnboardingChecklist` component (`src/components/onboarding-checklist.tsx`): 3-item checklist with progress bar. Will be updated to link to /onboarding for incomplete items
- `/api/scrape-context` endpoint: fetches company website → Claude summarizes name, description, industry, audience. Reuse for step 2
- `/api/scrape-template` endpoint: scrapes article URL → extracts HTML structure. Reuse for step 4
- `WorkspaceBranding` type: already has primaryColor, secondaryColor, accentColor, logoUrl, fontFamily, customCss fields
- `Workspace` type: has companyName, companyDescription, industry, targetAudience fields
- `agent4-html.ts`: template system with GENERIC_PROMPT, GENERIC_TEMPLATE, and per-platform configs. Needs {{placeholder}} injection added
- Settings page: already has Company Context, Branding, Platforms tabs. Re-run wizard button will link here

### Established Patterns
- Supabase client factories: `client.ts` (browser), `server.ts` (SSR/API routes)
- All DB queries in `src/lib/supabase/queries.ts` — accept `supabase: SupabaseClient` as first param
- snake_case DB → camelCase TypeScript via explicit `mapXxxRow` helpers
- Rate limiting on API endpoints: in-memory sliding window
- `useWorkspace()` context hook for active workspace access

### Integration Points
- `src/middleware.ts`: add redirect to /onboarding if workspace.onboarding_state.completed is false
- `src/app/page.tsx`: currently shows OnboardingChecklist — update to link to /onboarding
- `src/lib/article-generator.ts`: where branding colors need to be injected into Agent 4 calls
- `src/lib/templates/agent4-html.ts`: where template strings need {{placeholder}} conversion
- Supabase migration: add `onboarding_state` JSONB column to workspaces table

</code_context>

<specifics>
## Specific Ideas

- Platform cards should feel polished — logos + preview snippet make it visual and easy to choose
- The wizard should feel like a premium first impression — "unique welcome feel" with subtle gradient, not just a plain form
- Article URL scraping preview in sandboxed iframe so user sees "This is how your articles will look"
- Color palette extracted from CSS should be visual — show color swatches, not hex codes
- Scraped template is the default for custom styling, but toggle exists to override with brand colors

</specifics>

<deferred>
## Deferred Ideas

- Team/shared workspaces — Phase 10
- Additional platforms (beyond the 7 in this phase) — future backlog
- Retention strategy (UserStory → release notes → KB articles pipeline) — future milestone
- Azure DevOps / Jira integration for seeing what work got done — future milestone
- Onboarding A/B testing or conversion optimization — future

</deferred>

---

*Phase: 08-generic-templates-onboarding*
*Context gathered: 2026-03-18*
