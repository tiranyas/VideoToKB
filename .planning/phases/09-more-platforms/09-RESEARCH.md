# Phase 9: More Platforms (Zendesk, Intercom) - Research

**Researched:** 2026-03-20
**Domain:** Platform-specific HTML template generation for KB platforms
**Confidence:** HIGH

## Summary

Phase 9 focuses on verifying and hardening the Zendesk Help Center and Intercom platform templates that were built in Phase 8 (plan 08-02). After thorough investigation, the templates already exist in `src/lib/templates/agent4-html.ts` with all 7 platform profiles registered, the onboarding wizard already shows all 7 platforms, and the pipeline correctly routes through the selected platform profile. The existing templates are largely correct but have minor gaps compared to official platform documentation that should be addressed.

The Zendesk template is well-structured but could benefit from using `<thead>` explicitly (Zendesk supports it) and adding `<section>` wrappers for semantic grouping. The Intercom template is accurate regarding the strict tag allowlist, but the prompt should explicitly warn that `<thead>` and `<th>` are NOT allowed in Intercom tables (only `tr`/`td`), and that `<strong>` gets converted to `<b>` and `<em>` to `<i>` by Intercom's API.

**Primary recommendation:** This phase is primarily a QA/hardening phase. The templates exist and work. Focus on: (1) fixing template accuracy gaps identified below, (2) adding output validation tests that check Claude's actual generated HTML against platform constraints, and (3) verifying end-to-end that pasting generated HTML into each platform renders correctly.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App framework | Already in use |
| Vitest | (installed) | Unit testing | Already configured, used for template tests |
| Anthropic SDK | (installed) | Claude API calls | Agent 4 HTML generation |

### Supporting
No new libraries needed. This phase works entirely within the existing template and test infrastructure.

## Architecture Patterns

### Existing Template System (No Changes Needed)
```
src/lib/templates/agent4-html.ts     # All 7 platform profiles
src/lib/article-generator.ts         # generateHTML() -> Agent 4
src/lib/pipeline.ts                  # runPhaseB() orchestrates HTML gen
src/lib/branding.ts                  # replacePlaceholders() for {{vars}}
src/components/onboarding/step-platform.tsx  # Platform picker UI
```

### Pattern: Platform Profile Structure
Each platform profile follows this pattern:
1. **Prompt constant** (`ZENDESK_PROMPT`) - Component-based instructions for Claude, prefixed with shared `COMPONENT_BASE`
2. **Template constant** (`ZENDESK_TEMPLATE`) - Reference HTML that Claude must match structurally
3. **Profile entry** in `DEFAULT_PLATFORM_PROFILES` array with `id`, `name`, `htmlPrompt`, `htmlTemplate`, `isDefault`

The `buildHtmlPrompt()` function combines prompt + template + branding into the final system prompt for Agent 4.

### Anti-Patterns to Avoid
- **Do not add new npm dependencies** for HTML validation -- use string-based checks in Vitest
- **Do not modify the pipeline architecture** -- only modify template content and tests
- **Do not add `<style>` blocks to Zendesk or Intercom templates** -- both platforms handle styling through their own theme CSS

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML tag validation | Custom HTML parser | Regex-based Vitest assertions | Existing pattern works (see intercom-template.test.ts) |
| Platform rendering test | Browser-based rendering engine | Manual paste-and-check + snapshot tests | Claude output is non-deterministic; snapshot the template, not the LLM output |

## Common Pitfalls

### Pitfall 1: Intercom Silently Strips Forbidden Tags
**What goes wrong:** Claude generates `<div>`, `<span>`, `<section>`, `<style>`, or `<thead>`/`<th>` tags. Intercom silently removes or converts them, breaking the article layout.
**Why it happens:** The prompt lists allowed tags but Claude sometimes ignores restrictions, especially for tables where it defaults to `<thead><th>`.
**How to avoid:** The template MUST demonstrate `<table><tr><td>` pattern (no `<thead>`, no `<th>`). The prompt should have a "NEVER USE" list in addition to the allowed list.
**Warning signs:** Tables with headers that disappear when pasted into Intercom.

### Pitfall 2: Zendesk Theme CSS Class Assumptions
**What goes wrong:** Template uses CSS classes like `c-callout--info` that don't exist in the customer's Zendesk theme.
**Why it happens:** Zendesk themes are customizable. The `c-callout` classes are a convention, not a built-in guarantee.
**How to avoid:** Document in the template prompt that these classes work with default/standard Zendesk Guide themes. Consider adding a note to users that custom themes may need CSS additions.
**Warning signs:** Callouts rendering as plain divs with no visual styling.

### Pitfall 3: Intercom's Tag Conversions
**What goes wrong:** Template uses `<strong>` and `<em>` but Intercom converts these to `<b>` and `<i>`. Not a breaking issue, but `<h3>`-`<h6>` getting flattened to `<h1>`/`<h2>` can break hierarchy.
**Why it happens:** Intercom's API normalizes HTML to its internal format.
**How to avoid:** Only use `<h1>` and `<h2>` in Intercom template (already done). Document the conversion behavior in the prompt so Claude does not use `<h3>`.

### Pitfall 4: Branding Placeholders in Wrong Templates
**What goes wrong:** Adding `{{primaryColor}}` to Zendesk or Intercom templates which should NOT have inline styles.
**Why it happens:** Copy-paste from Generic or HelpJuice templates.
**How to avoid:** Zendesk and Intercom templates should have zero `{{placeholder}}` variables -- they use CSS classes or no styling at all.
**Warning signs:** `replacePlaceholders()` finding matches in templates that should be style-free.

### Pitfall 5: RTL Language Support
**What goes wrong:** Hebrew/Arabic articles don't get `dir="rtl"` attribute.
**Why it happens:** Both Zendesk and Intercom support `dir` attribute but the templates don't demonstrate it.
**How to avoid:** The `buildHtmlPrompt` already includes "maintain RTL direction" in critical rules. Verify this works.

## Code Examples

### Current Template Selection Flow (Verified from Source)
```typescript
// pipeline.ts - runPhaseB
const fullPrompt = buildHtmlPrompt(htmlPrompt, htmlTemplate, effectiveBranding);
const html = await generateHTML(article, fullPrompt);
```

### Existing Test Pattern for Template Validation
```typescript
// From intercom-template.test.ts - pattern to follow
it('htmlTemplate contains only allowed tags', () => {
  const template = intercom!.htmlTemplate;
  const tagMatches = template.match(/<([a-z][a-z0-9]*)/g) || [];
  const usedTags = new Set(tagMatches.map((t) => t.slice(1)));
  const allowedTags = new Set(['p', 'br', 'h1', 'h2', ...]);
  for (const tag of usedTags) {
    expect(allowedTags.has(tag)).toBe(true);
  }
});
```

## Platform-Specific Findings

### Zendesk Help Center - Detailed Constraints
**Source:** [Zendesk Official Docs](https://support.zendesk.com/hc/en-us/articles/6644509092378-Supported-HTML-for-help-center-articles) (HIGH confidence)

**Supported tags (relevant subset):** a, blockquote, br, code, details, div, figure, h1-h6, hr, img, li, ol, p, pre, section, span, strong, em, summary, table, td, th, tr, thead, tbody, ul, video, audio

**Key facts:**
- ALL tags support `class`, `data-*`, `dir`, `id`, `aria-*` attributes
- Inline styles are supported (but CSS classes preferred for theme consistency)
- `<details>` + `<summary>` is supported (current template uses this for FAQ -- correct)
- `<thead>` and `<th>` are supported (current template uses them -- correct)
- `<iframe>` limited to approved domains (YouTube, Vimeo, Wistia, Loom)
- No `<style>` block in article body (styles go in theme CSS)
- No `<script>` tags
- No form elements

**Current template accuracy:** HIGH. The Zendesk template correctly:
- Uses CSS classes (`c-callout`, `article-intro`) instead of inline styles
- Uses semantic HTML5 (`<details>`, `<summary>`, `<table>` with `<thead>`)
- Avoids `<style>` block
- Has no branding placeholders

**Gap identified:** The prompt says "No `<style>` block needed" which is correct. No changes needed.

### Intercom - Detailed Constraints
**Source:** [Intercom Official Docs](https://www.intercom.com/help/en/articles/4103903-formatting-your-articles-with-the-articles-api) (HIGH confidence)

**Allowed tags (complete list):** p, br, h1, h2, b, strong, i, em, ul, ol, li, img, a, iframe, pre, code, table, tr, td, hr, div (only with `class="intercom-align-center"`)

**NOT allowed (will be stripped/converted):**
- `<h3>` through `<h6>` -- converted to h1/h2
- `<thead>`, `<th>`, `<tbody>` -- NOT in allowed list
- `<span>`, `<section>`, `<article>`, `<figure>`, `<figcaption>` -- converted to `<p>`
- `<div>` without `class="intercom-align-center"` -- converted to `<p>`
- `<style>`, `<script>` -- removed entirely
- `<form>`, `<input>`, `<textarea>` -- removed entirely
- All inline `style` attributes -- stripped
- All custom `class` attributes (except the two allowed) -- stripped
- `<details>`, `<summary>` -- NOT in allowed list (no accordion support)

**Tag conversions by Intercom API:**
- `<strong>` -> `<b>`
- `<em>` -> `<i>`

**Special classes (the ONLY custom classes allowed):**
- `intercom-align-center` on `<div>` -- centers content
- `intercom-h2b-button` on `<a>` -- styles link as button

**Current template accuracy:** HIGH. The Intercom template correctly:
- Uses only allowed tags
- Has no `<div>` (except noted allowance for `intercom-align-center`)
- Has no `<span>`, `<style>`, inline styles
- Uses `<h1>` and `<h2>` only
- Tables use `<tr><td>` without `<thead>` or `<th>`

**Gaps identified:**
1. Template uses `<strong>` which Intercom converts to `<b>` -- not breaking but could use `<b>` directly for consistency
2. Prompt currently lists `<thead>` in its restrictions section -- but should also mention `<th>`, `<tbody>`, `<details>`, `<summary>` as unsupported
3. Prompt should explicitly call out that `<strong>` -> `<b>` and `<em>` -> `<i>` conversion happens

## State of the Art

| Aspect | Current State | Action Needed |
|--------|--------------|---------------|
| All 7 platform profiles registered | Complete | None |
| Onboarding shows all 7 platforms | Complete | None |
| Pipeline routes to correct template | Complete | None |
| Zendesk template HTML constraints | Correct | Minor prompt refinement |
| Intercom template HTML constraints | Correct | Add explicit `<thead>`/`<th>`/`<tbody>` warning to prompt |
| Template unit tests | 21 tests exist (10 Zendesk, 11 Intercom) | Add edge case tests |
| Branding integration | Correct (Zendesk/Intercom have no placeholders) | None |

## Open Questions

1. **Real-world paste testing**
   - What we know: Templates produce structurally correct HTML per platform docs
   - What's unclear: Whether actual Claude output (not just the template) pastes cleanly into Zendesk/Intercom editors
   - Recommendation: Manual QA step -- generate a real article for each platform and paste it in. This cannot be automated.

2. **Zendesk `c-callout` class availability**
   - What we know: Zendesk supports custom CSS classes on all elements
   - What's unclear: Whether `c-callout--info/warning/tip` is a standard Zendesk theme class or needs to be added to the theme CSS
   - Recommendation: Document that users may need to add callout CSS to their Zendesk theme, or switch to using `<blockquote>` as a more universal fallback

3. **Edge cases: code blocks and images in Intercom**
   - What we know: `<pre><code>` is allowed, `<img>` requires publicly accessible URLs
   - What's unclear: How well code blocks with syntax highlighting survive Intercom's processing
   - Recommendation: Test with a code-heavy article. Intercom likely strips any `class="language-*"` from `<code>` tags.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (configured in vitest.config.ts) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/lib/__tests__/zendesk-template.test.ts src/lib/__tests__/intercom-template.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Zendesk HTML uses correct CSS classes | unit | `npx vitest run src/lib/__tests__/zendesk-template.test.ts -x` | Yes (10 tests) |
| SC-2 | Intercom HTML uses only allowed tags | unit | `npx vitest run src/lib/__tests__/intercom-template.test.ts -x` | Yes (11 tests) |
| SC-3 | Intercom output has no forbidden tags | unit | `npx vitest run src/lib/__tests__/intercom-template.test.ts -x` | Yes (partial -- tests template, not LLM output) |
| SC-4 | Platform HTML renders in target editor | manual-only | N/A -- requires pasting into real platform editors | N/A |
| SC-5 | Platform picker shows all 7 platforms | unit | New test needed or manual verification | No |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/__tests__/zendesk-template.test.ts src/lib/__tests__/intercom-template.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps
- [ ] Test for Intercom `<thead>`/`<th>`/`<tbody>` absence in prompt (should warn against these)
- [ ] Test for Zendesk template having no branding placeholders (no `{{...}}` in template)
- [ ] Test for Intercom template having no branding placeholders

## Sources

### Primary (HIGH confidence)
- [Zendesk: Supported HTML for help center articles](https://support.zendesk.com/hc/en-us/articles/6644509092378-Supported-HTML-for-help-center-articles) - Full tag allowlist and attribute support
- [Intercom: Formatting articles with the Articles API](https://www.intercom.com/help/en/articles/4103903-formatting-your-articles-with-the-articles-api) - Full tag allowlist, conversion rules, restrictions
- [Intercom: Allowed HTML for Articles](https://developers.intercom.com/docs/guides/help-center/supported-html) - Developer docs (page did not render content fully but confirmed by secondary source)

### Secondary (MEDIUM confidence)
- Existing codebase analysis (agent4-html.ts, test files, pipeline.ts) - Direct source code inspection
- Phase 08-02 SUMMARY.md - Confirms templates were built and tested

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, existing stack verified
- Architecture: HIGH - Directly inspected all source files, no changes to architecture needed
- Pitfalls: HIGH - Verified against official platform documentation
- Template accuracy: HIGH - Cross-referenced templates against official docs from both platforms

**Research date:** 2026-03-20
**Valid until:** 2026-04-20 (platform HTML restrictions change infrequently)
