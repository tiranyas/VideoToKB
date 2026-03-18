---
phase: 08-generic-templates-onboarding
plan: 02
subsystem: templates
tags: [zendesk, intercom, platform-profiles, html-templates]

# Dependency graph
requires:
  - phase: 08-generic-templates-onboarding
    provides: "Existing template system with COMPONENT_BASE and DEFAULT_PLATFORM_PROFILES"
provides:
  - "Zendesk Help Center platform profile (CSS classes, semantic HTML)"
  - "Intercom platform profile (strict HTML allowlist, minimal markup)"
  - "7 total platform profiles in DEFAULT_PLATFORM_PROFILES"
affects: [onboarding-wizard, platform-picker, article-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zendesk uses CSS classes (c-callout) instead of inline styles"
    - "Intercom uses strict HTML allowlist with only 2 special classes"

key-files:
  created:
    - src/lib/__tests__/zendesk-template.test.ts
    - src/lib/__tests__/intercom-template.test.ts
  modified:
    - src/lib/templates/agent4-html.ts

key-decisions:
  - "Zendesk template uses CSS classes (c-callout--info/warning/tip) per Zendesk Guide theme conventions"
  - "Intercom template uses only API-allowed HTML tags, no div/span/style"
  - "Both templates inserted before markdown-only to keep markdown-only as last entry"

patterns-established:
  - "Platform templates follow COMPONENT_BASE prefix pattern for consistent agent behavior"

requirements-completed: [SC-2]

# Metrics
duration: 3min
completed: 2026-03-18
---

# Phase 8 Plan 02: Zendesk and Intercom Templates Summary

**Zendesk Help Center (CSS classes, c-callout, details/summary FAQ) and Intercom (strict HTML allowlist, no div/span/style) platform templates with TDD validation**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-18T15:31:24Z
- **Completed:** 2026-03-18T15:34:00Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 3

## Accomplishments
- Added Zendesk Help Center template with CSS-class-based styling (c-callout, article-intro, semantic HTML5)
- Added Intercom template with strict HTML allowlist compliance (no forbidden tags, no inline styles)
- Total platform profiles increased from 5 to 7
- 21 comprehensive tests covering both templates

## Task Commits

Each task was committed atomically (TDD flow):

1. **Task 1 RED: Failing tests for Zendesk and Intercom** - `8aeb92f` (test)
2. **Task 1 GREEN: Implement Zendesk and Intercom templates** - `d341be2` (feat)

## Files Created/Modified
- `src/lib/templates/agent4-html.ts` - Added ZENDESK_PROMPT, ZENDESK_TEMPLATE, INTERCOM_PROMPT, INTERCOM_TEMPLATE constants and profile entries
- `src/lib/__tests__/zendesk-template.test.ts` - 10 tests: entry exists, CSS classes, semantic HTML, no inline styles
- `src/lib/__tests__/intercom-template.test.ts` - 11 tests: entry exists, strict tag allowlist, no forbidden elements

## Decisions Made
- Zendesk template follows CSS-class approach (c-callout--info/warning/tip) matching Zendesk Guide theme conventions, no style block needed
- Intercom template uses only API-allowed HTML elements per Intercom developer docs, with bold-prefix callouts instead of visual boxes
- Templates placed before markdown-only entry to maintain markdown as the last option

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing test failures in `template-neutralization.test.ts` (from plan 08-01 scope) -- unrelated to this plan, not addressed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- 7 platform profiles now available for onboarding wizard platform picker (plan 08-04+)
- Templates ready for branding placeholder integration (plan 08-01 scope)

---
*Phase: 08-generic-templates-onboarding*
*Completed: 2026-03-18*
