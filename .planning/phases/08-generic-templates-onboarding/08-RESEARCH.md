# Phase 8: Generic Templates & Onboarding - Research

**Researched:** 2026-03-18
**Domain:** Multi-step onboarding wizard, template neutralization, brand extraction, platform templates
**Confidence:** HIGH

## Summary

Phase 8 combines two tightly related features: (1) a full-page onboarding wizard that captures workspace name, company brand, KB platform selection, and optional article style scraping, and (2) neutralizing all built-in templates from FinBot-specific colors to a universal blue default. The codebase is well-prepared for this work -- `WorkspaceBranding` type already exists with all needed fields, `runPhaseB` in `pipeline.ts` already accepts and injects branding via prompt text, and both `/api/scrape-context` and `/api/scrape-template` endpoints are production-ready for reuse.

The main technical work is: (a) building the `/onboarding` wizard route with 4 steps and state persistence, (b) adding `onboarding_state` JSONB column to workspaces, (c) replacing all `#6d28d9` references in `agent4-html.ts` with `#2563eb`, (d) adding `{{placeholder}}` variable replacement in `buildHtmlPrompt`, (e) creating Zendesk and Intercom platform templates, and (f) wiring middleware to redirect un-onboarded users.

**Primary recommendation:** Build the wizard as a standard Next.js App Router page at `src/app/onboarding/page.tsx` using a client-side step state machine. Use the existing `updateWorkspace` query for all persistence. Template neutralization is a straightforward find-and-replace in `agent4-html.ts`. Zendesk and Intercom templates follow the patterns documented in platform-templates-research.md.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Full-page wizard at `/onboarding` route -- dedicated, focused, not a modal
- Triggers after first signup/login if workspace has no branding colors set (catches existing users too)
- 4 steps: (1) Name workspace, (2) Paste company website URL, (3) Pick KB platform, (4) Optional: paste existing article URL for style scraping
- "Skip setup" button always visible. Each step also has "Skip this step" to advance without filling it
- Step dot indicators (1 2 3 4) at the top
- Unique welcome feel: subtle gradient background (soft violet-to-white) with small SVG illustrations per step
- After completion, land on main page (article generator)
- Returning users who skipped see the existing OnboardingChecklist widget on homepage + "Complete setup" link in Settings
- Re-run wizard accessible from Settings page ("Setup Wizard" button), pre-fills existing values
- Fully responsive: works on mobile with adapted layouts
- Brand extraction: One URL paste extracts everything (company context + brand colors + logo) via existing `/api/scrape-context`
- Show editable preview after extraction: user can tweak name, description, colors, logo before saving
- Color palette from CSS, user picks which ones to assign as primary/accent
- If scrape fails: friendly message + manual entry form
- Template neutralization: `#2563eb` (blue-600) replaces `#6d28d9` (FinBot purple) in ALL built-in templates
- Branding colors injected at generation time via `{{variableName}}` mustache-style placeholders
- If no branding set, neutral defaults used
- Font family: if user sets fontFamily, inject into `--kb-font`. Otherwise keep system-ui default
- Scraped custom template wins by default; platform profile has toggle "Apply workspace brand colors to this template" (default ON for built-in, OFF for scraped)
- Auto-replace FinBot purple in built-in templates only (code-level). User custom platform profiles left untouched
- Platform card grid with logos + preview thumbnail snippet
- Platforms available: Helpjuice, Confluence, Notion, Zendesk, Intercom, Generic HTML, Markdown -- all 7
- Zendesk: CSS classes approach; Intercom: stripped HTML approach (per research)
- Markdown included as platform option
- Selecting platform immediately sets workspace default
- Article URL scraping (Step 4): reuse existing `/api/scrape-template`, show live preview in sandboxed iframe, auto-detect platform from HTML classes
- `onboarding_state` JSONB column on workspace table: `{ completed: boolean, steps: { workspace: bool, brand: bool, platform: bool, template: bool }, skipped_at?: timestamp }`
- Partial completion persists -- resume from first incomplete step on next visit
- Template variable replacement with `{{primaryColor}}`, `{{accentColor}}`, `{{fontFamily}}` etc.
- New workspaces start with "Standard" article type + "Generic HTML" platform as defaults

### Claude's Discretion
- Exact gradient colors and SVG illustrations for onboarding welcome feel
- Loading states and animations during scraping
- Color extraction algorithm details (which CSS properties to parse)
- Logo extraction fallback chain (meta og:image -> favicon -> apple-touch-icon)
- Error message copy and tone
- Exact onboarding_state schema details beyond what's specified
- How to generate static platform preview images (Playwright script, etc.)

### Deferred Ideas (OUT OF SCOPE)
- Team/shared workspaces -- Phase 10
- Additional platforms beyond the 7 in this phase -- future backlog
- Retention strategy (UserStory -> release notes -> KB articles pipeline) -- future milestone
- Azure DevOps / Jira integration -- future milestone
- Onboarding A/B testing or conversion optimization -- future
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Page routing, `src/app/onboarding/page.tsx` | Already in use, App Router pattern established |
| React | 19.2.3 | UI components, state management | Already in use |
| Tailwind CSS | v4 | Styling wizard, gradient backgrounds, responsive grid | Already in use with `@tailwindcss/postcss` |
| Supabase JS | 2.99.1 | DB queries, auth check | Already in use via `@supabase/ssr` |
| Lucide React | 0.577.0 | Icons for steps, platforms, UI elements | Already in use |
| Sonner | 2.0.7 | Toast notifications for scrape results | Already in use |
| Zod | 4.3.6 | Input validation for workspace name, URL fields | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `clsx` + `tailwind-merge` (via `cn()`) | installed | Conditional class merging | All component styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom step machine | react-hook-form multi-step | Overkill for 4 simple steps; custom state is cleaner |
| Mustache.js for `{{placeholder}}` | Simple string `.replace()` | No need for a template engine; 5-6 variables max |
| Framer Motion for step transitions | CSS transitions | Already no Framer in project; CSS `transition` is sufficient |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    onboarding/
      page.tsx              # Main wizard page (client component)
  components/
    onboarding/
      wizard-shell.tsx      # Gradient background, step dots, skip buttons
      step-workspace.tsx    # Step 1: Name workspace
      step-brand.tsx        # Step 2: Company URL + brand extraction
      step-platform.tsx     # Step 3: Platform picker grid
      step-template.tsx     # Step 4: Article URL scraping + preview
      platform-card.tsx     # Individual platform selection card
      color-swatch.tsx      # Visual color picker/swatch component
  lib/
    templates/
      agent4-html.ts        # MODIFIED: neutralized colors + {{placeholder}} support
      zendesk-template.ts   # NEW: Zendesk prompt + template (or inline in agent4-html.ts)
      intercom-template.ts  # NEW: Intercom prompt + template (or inline in agent4-html.ts)
    branding.ts             # NEW: replacePlaceholders() utility, default branding constants
```

### Pattern 1: Step State Machine
**What:** Wizard state managed via `useState` with step index and per-step data
**When to use:** The onboarding wizard
**Example:**
```typescript
interface OnboardingState {
  currentStep: number; // 0-3
  workspace: { name: string; slug: string } | null;
  brand: {
    companyName: string; description: string; industry: string;
    targetAudience: string; branding: WorkspaceBranding;
  } | null;
  platform: { id: string; name: string } | null;
  template: { htmlPrompt: string; htmlTemplate: string } | null;
}

// Navigate steps
const goNext = () => setStep(s => Math.min(s + 1, 3));
const goBack = () => setStep(s => Math.max(s - 1, 0));
const skipStep = () => { markStepSkipped(currentStep); goNext(); };
```

### Pattern 2: Template Variable Replacement
**What:** Replace `{{variableName}}` placeholders in templates with workspace branding values at generation time
**When to use:** In `buildHtmlPrompt()` before sending to Claude, and in CSS custom property `:root` blocks
**Example:**
```typescript
const BRANDING_DEFAULTS: Record<string, string> = {
  primaryColor: '#2563eb',
  accentColor: '#2563eb',
  secondaryColor: '#e5e7eb',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  textColor: '#1f2937',
  mutedColor: '#6b7280',
};

export function replacePlaceholders(
  template: string,
  branding: WorkspaceBranding | undefined
): string {
  const values = {
    ...BRANDING_DEFAULTS,
    ...(branding?.primaryColor && { primaryColor: branding.primaryColor }),
    ...(branding?.accentColor && { accentColor: branding.accentColor }),
    ...(branding?.secondaryColor && { secondaryColor: branding.secondaryColor }),
    ...(branding?.fontFamily && { fontFamily: branding.fontFamily }),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? _);
}
```

### Pattern 3: Middleware Onboarding Redirect
**What:** Check workspace `onboarding_state` in middleware and redirect to `/onboarding` if not completed
**When to use:** After auth check in `src/middleware.ts`
**Important caveat:** Middleware runs on every request. Checking DB on every request is expensive. Two approaches:
- **Option A (recommended):** Set a cookie `kbpipe-onboarded=true` after wizard completion. Middleware checks cookie only -- no DB hit. Cookie cleared on logout.
- **Option B:** Check only on specific routes (e.g., `/` homepage). Client-side redirect via `useEffect` in layout.

### Pattern 4: Platform Card Grid
**What:** Responsive card grid showing all 7 platforms with logos and preview thumbnails
**When to use:** Step 3 of wizard and potentially platform selection in Settings
**Example:**
```typescript
const PLATFORMS = [
  { id: 'generic-html', name: 'Generic HTML', icon: Globe, description: 'Works everywhere' },
  { id: 'helpjuice', name: 'Helpjuice', icon: BookOpen, description: 'Accordion-rich articles' },
  { id: 'confluence', name: 'Confluence', icon: Layers, description: 'Atlassian wiki format' },
  { id: 'notion', name: 'Notion', icon: FileText, description: 'Clean semantic HTML' },
  { id: 'zendesk', name: 'Zendesk', icon: HelpCircle, description: 'Help Center articles' },
  { id: 'intercom', name: 'Intercom', icon: MessageSquare, description: 'Minimal clean HTML' },
  { id: 'markdown-only', name: 'Markdown', icon: Code, description: 'GitHub, GitBook, etc.' },
];
```

### Anti-Patterns to Avoid
- **DB query in middleware for onboarding state:** Would add latency to every request. Use a cookie instead.
- **Storing wizard step data in DB on every keystroke:** Batch saves -- persist to DB only on "Next" or "Complete" clicks.
- **Hardcoding platform templates in wizard:** Templates live in `agent4-html.ts` and DB `platform_profiles` table. Wizard selects, doesn't define.
- **Building a custom color picker from scratch:** Use a simple grid of extracted color swatches with selection state. `<input type="color">` for manual fallback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color extraction from CSS | Full CSS parser | `/api/scrape-context` already does this via Claude | Claude extracts brand colors from HTML/CSS intelligently; regex-based CSS parsing would miss many patterns |
| Template analysis | Custom HTML parser | `/api/scrape-template` already does this via Claude | Existing endpoint handles platform detection, class extraction, and template generation |
| Slug generation | Custom algorithm | Existing `slugify()` in `workspace-context.tsx` | Already handles edge cases |
| Form validation | Custom validators | Zod schemas (already in project) | Type-safe, composable |
| Toast notifications | Custom alert system | Sonner (already installed) | Already integrated |

**Key insight:** The scraping intelligence is already built. The onboarding wizard's job is orchestrating existing endpoints, not reimplementing them.

## Common Pitfalls

### Pitfall 1: Middleware Performance Degradation
**What goes wrong:** Adding a DB query to check onboarding state in middleware causes 50-100ms latency on every request.
**Why it happens:** Middleware runs on EVERY matched route, including static asset requests.
**How to avoid:** Use a cookie (`kbpipe-onboarded=true`) set after wizard completion. Middleware reads cookie (0ms) instead of querying DB.
**Warning signs:** Increased TTFB across all pages after deploying.

### Pitfall 2: Race Condition on Workspace Creation
**What goes wrong:** New user signup auto-creates "Default" workspace (in `WorkspaceProvider`), but onboarding wizard step 1 also creates/renames workspace, leading to duplicate or conflicting state.
**Why it happens:** `WorkspaceProvider.loadWorkspaces()` auto-creates a "Default" workspace for new users before onboarding runs.
**How to avoid:** Onboarding step 1 should UPDATE the existing "Default" workspace name, not create a new one. Check if workspace already exists and rename it.
**Warning signs:** Users end up with "Default" + their named workspace.

### Pitfall 3: FinBot Purple Leaking Through
**What goes wrong:** After neutralization, some articles still show purple because DB-stored platform profiles retain old values from before the migration.
**Why it happens:** `getPlatformProfiles()` auto-seeds from `DEFAULT_PLATFORM_PROFILES` only when the profile doesn't exist. If it was already seeded with old purple values, updating the code constants won't update the DB.
**How to avoid:** Two-pronged approach: (1) update code constants in `agent4-html.ts`, (2) run a Supabase migration that updates `platform_profiles` rows where `is_default = true` to replace `#6d28d9` with `#2563eb`.
**Warning signs:** New users get blue, existing users still see purple.

### Pitfall 4: Scrape-Context Timeout During Onboarding
**What goes wrong:** Company website scraping takes 5-10 seconds; user thinks wizard is broken and navigates away.
**Why it happens:** Claude API call + page fetch can be slow, especially for heavy websites.
**How to avoid:** Clear loading state with progress indicator ("Analyzing your website..."), skeleton UI for the preview card, and graceful timeout with manual fallback form.
**Warning signs:** Step 2 abandonment rate.

### Pitfall 5: Sandboxed iframe XSS in Template Preview
**What goes wrong:** Scraped HTML in preview iframe could execute scripts or make external requests.
**Why it happens:** `srcdoc` without sandbox restrictions allows script execution.
**How to avoid:** Use `<iframe sandbox="allow-same-origin" srcdoc={html}>` -- DO NOT include `allow-scripts`. The `allow-same-origin` is needed for CSS to work but scripts are blocked.
**Warning signs:** Console security warnings, unexpected network requests.

### Pitfall 6: onboarding_state Column Not Mapped
**What goes wrong:** Adding `onboarding_state` JSONB column to workspaces table but forgetting to map it in `mapWorkspaceRow()` and the `Workspace` TypeScript type.
**Why it happens:** The mapping layer is explicit -- snake_case to camelCase requires manual additions to both the type and the mapper.
**How to avoid:** Update `Workspace` type in `src/types/index.ts` to include `onboardingState`, update `mapWorkspaceRow` in `queries.ts`, update `createWorkspace` and `updateWorkspace` to handle the new field.

## Code Examples

### Template Neutralization (agent4-html.ts changes)
```typescript
// BEFORE (Generic template):
// --kb-primary: #6d28d9;
// --kb-accent: #f59e0b;

// AFTER:
const GENERIC_TEMPLATE = `<style>
  :root {
    --kb-primary: {{primaryColor}};
    --kb-secondary: {{secondaryColor}};
    --kb-accent: {{accentColor}};
    --kb-font: {{fontFamily}};
    --kb-text: #1f2937;
    --kb-muted: #6b7280;
    --kb-bg: #ffffff;
    --kb-border: #e5e7eb;
  }
  /* ... rest unchanged ... */
</style>`;

// Helpjuice: replace all `var(--accent, #6d28d9)` with `var(--accent, {{primaryColor}})`
// And update the prompt: "Colors default to accent ({{primaryColor}})"
```

### Branding Placeholder Replacement in buildHtmlPrompt
```typescript
// In agent4-html.ts, modify buildHtmlPrompt:
export function buildHtmlPrompt(
  htmlPrompt: string,
  htmlTemplate: string,
  branding?: WorkspaceBranding
): string {
  // Replace placeholders with actual branding or defaults
  const resolvedPrompt = replacePlaceholders(htmlPrompt, branding);
  const resolvedTemplate = replacePlaceholders(htmlTemplate, branding);

  // ... rest of existing logic using resolvedPrompt and resolvedTemplate
}
```

### Zendesk Template (new)
```typescript
const ZENDESK_PROMPT = `${COMPONENT_BASE}

## Platform: Zendesk Help Center
Generate HTML for Zendesk Help Center articles. Use semantic HTML with CSS classes
that map to Zendesk Guide theme conventions.

### Component Mapping
- **Summary/Opening** -> \`<div class="article-intro">\` with intro paragraph
- **Key Highlights** -> \`<ul>\` with \`<li>\` items
- **Step-by-Step** -> \`<ol>\` with \`<li>\` for each step
- **Explanatory Sections** -> \`<h2>\` / \`<h3>\` + \`<p>\` paragraphs
- **Callouts** -> \`<div class="c-callout c-callout--[type]">\` where type is: info, warning, tip, note
- **Tables** -> \`<table>\` (Zendesk wraps in \`<figure class="wysiwyg-table">\` automatically in new editor)
- **Code Blocks** -> \`<pre><code>\`
- **FAQ** -> \`<details><summary>Question</summary><p>Answer</p></details>\`

### Styling Rules
- Prefer CSS classes over inline styles (Zendesk themes control appearance)
- Use semantic HTML5 elements (article, section, details/summary)
- Keep markup clean -- Zendesk theme CSS handles most visual styling
- No \`<style>\` block needed -- Zendesk themes provide global styles

### Output
- Output ONLY the HTML -- no markdown fences, no explanations
- Start with \`<h1>\` for the article title`;

const ZENDESK_TEMPLATE = `<h1>[Article Title]</h1>
<div class="article-intro">
  <p>[Summary paragraph describing what this article covers]</p>
</div>
<h2>[Key Points]</h2>
<ul>
  <li><strong>[Point 1]</strong> -- [explanation]</li>
  <li><strong>[Point 2]</strong> -- [explanation]</li>
</ul>
<h2>[Steps Heading]</h2>
<ol>
  <li><strong>[Step 1]</strong><br>[Description]</li>
  <li><strong>[Step 2]</strong><br>[Description]</li>
</ol>
<div class="c-callout c-callout--tip">
  <p><strong>Tip:</strong> [Tip content]</p>
</div>
<h2>[Details Heading]</h2>
<p>[Explanatory content]</p>
<table>
  <thead><tr><th>[Col 1]</th><th>[Col 2]</th></tr></thead>
  <tbody><tr><td>[Data]</td><td>[Data]</td></tr></tbody>
</table>
<h2>FAQ</h2>
<details><summary>[Question 1]</summary><p>[Answer 1]</p></details>
<details><summary>[Question 2]</summary><p>[Answer 2]</p></details>`;
```

### Intercom Template (new)
```typescript
const INTERCOM_PROMPT = `${COMPONENT_BASE}

## Platform: Intercom Articles
Generate HTML for Intercom Help Center articles. Intercom's API has a strict HTML allowlist
-- only use elements that Intercom supports. Any disallowed elements will be silently stripped.

### Allowed Elements ONLY
p, br, h1, h2, b, strong, i, em, ul, ol, li, img, a, iframe, pre, code,
table, tr, td, hr

### Special Classes (the ONLY classes Intercom supports)
- \`intercom-align-center\` -- center-aligns content (on a div)
- \`intercom-h2b-button\` -- styles an anchor as a button

### Important Restrictions
- h3-h6 are converted to h1/h2 by Intercom -- use h1 and h2 only
- NO <div> tags except \`<div class="intercom-align-center">\`
- NO <span>, <section>, <article>, <style>, <script>
- NO inline styles -- they will be stripped
- NO custom classes -- they will be stripped
- Callouts/accordions are NOT supported via API

### Component Mapping
- **Summary/Opening** -> \`<p><strong>[intro]</strong></p>\` (bold paragraph)
- **Key Highlights** -> \`<ul>\` with \`<li>\` items
- **Step-by-Step** -> \`<ol>\` with \`<li>\` steps
- **Explanatory Sections** -> \`<h2>\` + \`<p>\` paragraphs
- **Callouts** -> \`<p><b>Tip:</b> [content]</p>\` (bold prefix only -- no visual box)
- **Tables** -> \`<table><tr><td>\` (no thead, th -- just tr/td)
- **Code Blocks** -> \`<pre><code>\`
- **Links as buttons** -> \`<a href="#" class="intercom-h2b-button">Button Text</a>\`

### Output
- Output ONLY the HTML -- no markdown fences
- Start with \`<h1>\` for the article title
- Keep it clean and simple`;

const INTERCOM_TEMPLATE = `<h1>[Article Title]</h1>
<p><strong>[Opening summary -- what this article covers]</strong></p>
<hr>
<h2>[Key Highlights]</h2>
<ul>
  <li><strong>[Highlight 1]</strong> -- [explanation]</li>
  <li><strong>[Highlight 2]</strong> -- [explanation]</li>
</ul>
<h2>[Steps Heading]</h2>
<ol>
  <li><strong>[Step 1]</strong><br>[Description]</li>
  <li><strong>[Step 2]</strong><br>[Description]</li>
</ol>
<p><b>Tip:</b> [Important tip or note]</p>
<h2>[Details Heading]</h2>
<p>[Explanatory paragraph]</p>
<table>
  <tr><td><b>[Col 1]</b></td><td><b>[Col 2]</b></td></tr>
  <tr><td>[Data]</td><td>[Data]</td></tr>
</table>
<h2>[Related Resources]</h2>
<ul>
  <li><a href="#">[Resource 1]</a></li>
  <li><a href="#">[Resource 2]</a></li>
</ul>`;
```

### Onboarding Middleware Logic
```typescript
// In src/middleware.ts -- add after existing auth checks:
// Option A: Cookie-based (recommended)
if (user && !request.nextUrl.pathname.startsWith('/onboarding') && !isPublicRoute) {
  const onboarded = request.cookies.get('kbpipe-onboarded')?.value;
  if (!onboarded) {
    // First-time check: query will happen client-side, set cookie after
    // OR: redirect to /onboarding which itself checks and redirects back if already done
  }
}
```

### Supabase Migration
```sql
-- Add onboarding_state to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT '{"completed": false, "steps": {"workspace": false, "brand": false, "platform": false, "template": false}}'::jsonb;

-- Update default platform profiles to neutral colors
UPDATE platform_profiles
SET html_template = REPLACE(html_template, '#6d28d9', '#2563eb'),
    html_prompt = REPLACE(html_prompt, '#6d28d9', '#2563eb')
WHERE is_default = true;

-- Also replace accent color in Helpjuice template
UPDATE platform_profiles
SET html_template = REPLACE(html_template, '#f59e0b', '#2563eb')
WHERE id = 'helpjuice' AND is_default = true;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FinBot purple (`#6d28d9`) hardcoded | Neutral blue (`#2563eb`) with `{{placeholder}}` injection | This phase | All new articles use neutral or custom colors |
| No onboarding | 4-step wizard capturing brand + platform | This phase | Better first-run experience, faster time to first article |
| 5 platforms | 7 platforms (+ Zendesk, Intercom) | This phase | Broader market coverage |
| Branding injected via prompt text only | Template variables `{{}}` + prompt injection | This phase | More reliable color application |

## Open Questions

1. **Platform Preview Thumbnails**
   - What we know: Decision calls for static images generated programmatically from actual templates
   - What's unclear: Whether to use Playwright screenshots, pre-rendered PNGs, or CSS-only previews
   - Recommendation: Use static SVG/PNG files committed to `public/platforms/` -- simplest, fastest, no build dependency. Create them manually from template screenshots. Placeholder colored rectangles are fine for v1.

2. **Existing DB Platform Profiles with Old Colors**
   - What we know: `getPlatformProfiles()` auto-seeds missing profiles but won't update existing ones
   - What's unclear: Whether migration alone is sufficient or if the auto-seed logic needs updating
   - Recommendation: Migration updates DB rows. Also update code constants so new deployments and re-seeds use neutral colors. Both are needed.

3. **buildHtmlPrompt Signature Change**
   - What we know: `buildHtmlPrompt(htmlPrompt, htmlTemplate)` is called from `pipeline.ts` `runPhaseB`
   - What's unclear: Whether to add `branding` as a third parameter or do replacement before calling
   - Recommendation: Add `branding` as optional third parameter. `runPhaseB` already has `branding` in its input -- pass it through. This keeps the replacement logic centralized.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via `npx vitest`) |
| Config file | `vitest.config.ts` (assumed, standard Next.js setup) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ONB-01 | Template neutralization replaces all #6d28d9 | unit | `npx vitest run src/lib/__tests__/template-neutralization.test.ts -x` | No -- Wave 0 |
| ONB-02 | `replacePlaceholders()` fills branding vars | unit | `npx vitest run src/lib/__tests__/branding.test.ts -x` | No -- Wave 0 |
| ONB-03 | `replacePlaceholders()` uses defaults when no branding | unit | `npx vitest run src/lib/__tests__/branding.test.ts -x` | No -- Wave 0 |
| ONB-04 | Zendesk template is valid, uses CSS classes not inline styles | unit | `npx vitest run src/lib/__tests__/zendesk-template.test.ts -x` | No -- Wave 0 |
| ONB-05 | Intercom template uses only allowed HTML tags | unit | `npx vitest run src/lib/__tests__/intercom-template.test.ts -x` | No -- Wave 0 |
| ONB-06 | `buildHtmlPrompt` with branding param produces correct output | unit | `npx vitest run src/lib/__tests__/agent4-html.test.ts -x` | No -- Wave 0 |
| ONB-07 | Onboarding wizard renders and navigates steps | manual-only | Manual browser test | N/A |
| ONB-08 | Middleware redirects un-onboarded users | manual-only | Manual browser test (middleware hard to unit test) | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/__tests__/branding.test.ts` -- covers ONB-02, ONB-03
- [ ] `src/lib/__tests__/template-neutralization.test.ts` -- covers ONB-01 (verify no #6d28d9 in any default template)
- [ ] `src/lib/__tests__/intercom-template.test.ts` -- covers ONB-05 (verify only allowed tags used)
- [ ] `src/lib/__tests__/zendesk-template.test.ts` -- covers ONB-04

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/templates/agent4-html.ts` -- current template system, all 5 platform profiles
- Codebase analysis: `src/lib/pipeline.ts` -- `PhaseBInput.branding` already exists, prompt injection works
- Codebase analysis: `src/types/index.ts` -- `WorkspaceBranding` type already has all needed fields
- Codebase analysis: `src/app/api/scrape-context/route.ts` -- already extracts company info + branding colors via Claude
- Codebase analysis: `src/app/api/scrape-template/route.ts` -- already scrapes article HTML and generates platform profiles
- Codebase analysis: `src/middleware.ts` -- current auth redirect pattern
- Codebase analysis: `src/lib/supabase/queries.ts` -- `updateWorkspace`, `upsertWorkspacePreferences` ready to use
- `.planning/research/platform-templates-research.md` -- Zendesk CSS classes, Intercom allowed tags, Confluence format

### Secondary (MEDIUM confidence)
- Zendesk HTML allowlist from support.zendesk.com/hc/en-us/articles/6644509092378
- Intercom supported HTML from developers.intercom.com/docs/guides/help-center/supported-html

### Tertiary (LOW confidence)
- None -- all findings are from direct codebase analysis or previously verified research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- everything already installed, no new dependencies
- Architecture: HIGH -- follows established App Router patterns, reuses existing endpoints
- Template neutralization: HIGH -- straightforward string replacement in known files
- New platform templates: MEDIUM -- based on research doc, needs testing against actual platforms
- Onboarding UX flow: HIGH -- standard wizard pattern, well-defined in CONTEXT.md
- Pitfalls: HIGH -- identified from direct codebase analysis of auto-seed logic and middleware patterns

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable -- no external API changes expected)
