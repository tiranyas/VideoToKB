---
phase: 08-generic-templates-onboarding
plan: 01
subsystem: templates
tags: [branding, css-variables, placeholder-replacement, template-neutralization]

requires:
  - phase: 06-security-and-tests
    provides: existing pipeline and template infrastructure
provides:
  - replacePlaceholders utility for {{placeholder}} variable substitution
  - BRANDING_DEFAULTS constant with neutral blue theme
  - Neutralized templates (no hardcoded FinBot purple)
  - buildHtmlPrompt accepts optional branding parameter
  - PhaseBInput.applyBranding guard for custom template protection
affects: [08-02, 08-03, 08-04, 09-platform-expansion]

tech-stack:
  added: []
  patterns: [placeholder-replacement, branding-defaults, applyBranding-guard]

key-files:
  created:
    - src/lib/branding.ts
    - src/lib/__tests__/branding.test.ts
    - src/lib/__tests__/template-neutralization.test.ts
  modified:
    - src/lib/templates/agent4-html.ts
    - src/lib/pipeline.ts

key-decisions:
  - "Neutral default color #2563eb (blue-600) replaces #6d28d9 (FinBot purple) in all templates"
  - "HelpJuice template uses var(--accent, {{primaryColor}}) pattern for CSS fallback compatibility"
  - "applyBranding=false skips both template placeholder replacement AND prompt-based branding injection"

patterns-established:
  - "Placeholder pattern: {{variableName}} in templates, resolved by replacePlaceholders()"
  - "Branding guard: applyBranding field controls whether workspace colors override template styling"

requirements-completed: [SC-5, SC-6, SC-7]

duration: 4min
completed: 2026-03-18
---

# Phase 8 Plan 01: Template Neutralization & Branding Utility Summary

**Neutralized all built-in templates from FinBot purple to neutral blue with {{placeholder}} variable replacement for workspace branding**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-18T15:31:20Z
- **Completed:** 2026-03-18T15:35:27Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Eliminated all #6d28d9 (FinBot purple) from every default template
- Created replacePlaceholders utility with BRANDING_DEFAULTS for neutral theme
- Updated buildHtmlPrompt to accept optional branding and resolve placeholders before composing prompts
- Added applyBranding guard in pipeline.ts to protect scraped custom templates from branding override
- 25 new tests covering branding utility and template neutralization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create branding utility and tests** - `6ed82b2` (feat)
2. **Task 2: Neutralize templates, update buildHtmlPrompt, add applyBranding guard** - `114d26f` (feat)

_Both tasks used TDD: tests written first (RED), implementation second (GREEN)._

## Files Created/Modified
- `src/lib/branding.ts` - replacePlaceholders utility and BRANDING_DEFAULTS constant
- `src/lib/__tests__/branding.test.ts` - 13 tests for branding utility
- `src/lib/templates/agent4-html.ts` - Neutralized templates with {{placeholder}} variables, updated buildHtmlPrompt
- `src/lib/__tests__/template-neutralization.test.ts` - 12 tests verifying no FinBot purple and placeholder resolution
- `src/lib/pipeline.ts` - Added applyBranding field to PhaseBInput, guards branding pass-through

## Decisions Made
- Used #2563eb (blue-600) as neutral default -- matches plan spec and feedback that default colors must not be FinBot-specific
- HelpJuice template preserves var(--accent, {{primaryColor}}) CSS fallback pattern for compatibility with HelpJuice's own theming
- applyBranding=false suppresses both template placeholder replacement AND prompt-based branding text injection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Branding utility ready for Plan 02 (onboarding flow) to collect workspace branding
- buildHtmlPrompt signature updated, ready for Plan 03 (platform profile schema) to pass branding through
- applyBranding guard in place for scraped custom templates (Plan 03)

## Self-Check: PASSED
- All 5 key files verified present on disk
- Task commits: 6ed82b2, 114d26f (verified during execution)
- Full test suite: 119 tests, 12 files, all passing

---
*Phase: 08-generic-templates-onboarding*
*Completed: 2026-03-18*
