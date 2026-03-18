---
phase: 08-generic-templates-onboarding
plan: 04
subsystem: ui
tags: [onboarding, wizard, react, platform-selection, brand-extraction, scraping]

# Dependency graph
requires:
  - phase: 08-generic-templates-onboarding
    provides: "Branding utility, 7 platform templates, OnboardingState data model, applyBranding toggle"
provides:
  - "4-step onboarding wizard at /onboarding"
  - "7 platform SVG preview thumbnails"
  - "Brand extraction UI with editable color swatches"
  - "Template scraping with applyBranding=false for custom templates"
  - "PlatformCard and ColorSwatch reusable components"
affects: [08-05-settings-branding, user-onboarding-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wizard state managed via useState with step-by-step persistence to workspace"
    - "Cookie-based onboarding completion tracking (kbpipe-onboarded)"
    - "Sandboxed iframe for HTML template preview"

key-files:
  created:
    - src/app/onboarding/page.tsx
    - src/components/onboarding/wizard-shell.tsx
    - src/components/onboarding/step-workspace.tsx
    - src/components/onboarding/step-brand.tsx
    - src/components/onboarding/step-platform.tsx
    - src/components/onboarding/step-template.tsx
    - src/components/onboarding/platform-card.tsx
    - src/components/onboarding/color-swatch.tsx
    - public/platforms/generic-html.svg
    - public/platforms/helpjuice.svg
    - public/platforms/confluence.svg
    - public/platforms/notion.svg
    - public/platforms/zendesk.svg
    - public/platforms/intercom.svg
    - public/platforms/markdown-only.svg
  modified: []

key-decisions:
  - "Wizard shell manages all step state centrally, persists each step to workspace immediately via updateWorkspace"
  - "Scraped custom templates saved with applyBranding=false -- workspace brand colors do not override scraped styles"
  - "PlatformCard uses Next.js Image with unoptimized SVG for thumbnail previews"
  - "Step resume: wizard detects partially-completed onboarding and starts at first incomplete step"

patterns-established:
  - "Onboarding wizard pattern: step state + dot indicators + skip flow + cookie completion"
  - "Platform preview thumbnails: static SVGs in public/platforms/ referenced by platform ID"

requirements-completed: [SC-1, SC-2, SC-3, SC-4]

# Metrics
duration: 6min
completed: 2026-03-18
---

# Phase 8 Plan 04: Onboarding Wizard UI Summary

**4-step onboarding wizard with brand extraction, 7-platform card grid with SVG previews, and template scraping with applyBranding=false**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-18T15:38:39Z
- **Completed:** 2026-03-18T15:44:30Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Complete 4-step onboarding wizard at /onboarding with gradient background and step dot indicators
- 7 SVG preview thumbnails showing each platform's visual style (colored headers, callout blocks, accordion hints)
- Brand extraction via /api/scrape-context with editable preview, color swatches for primary/accent assignment
- Template scraping via /api/scrape-template with sandboxed iframe preview and applyBranding=false for custom templates
- Responsive layout with skip buttons on every step and top-level "Skip setup" button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create platform preview thumbnails and wizard shell** - `ceacb97` (feat)
2. **Task 2: Build all 4 step components with platform cards** - `ea51490` (feat)

## Files Created/Modified
- `src/app/onboarding/page.tsx` - Onboarding route page, renders WizardShell
- `src/components/onboarding/wizard-shell.tsx` - Central wizard with step navigation, persistence, gradient background, dot indicators
- `src/components/onboarding/step-workspace.tsx` - Step 1: workspace name input with validation (max 50 chars, auto-slug)
- `src/components/onboarding/step-brand.tsx` - Step 2: URL input, brand extraction, editable preview with color swatches
- `src/components/onboarding/step-platform.tsx` - Step 3: 7-platform card grid with SVG thumbnails
- `src/components/onboarding/step-template.tsx` - Step 4: article URL scrape, iframe preview, saves with applyBranding=false
- `src/components/onboarding/platform-card.tsx` - Reusable platform selection card with thumbnail
- `src/components/onboarding/color-swatch.tsx` - Circular color swatch with primary/accent assignment
- `public/platforms/*.svg` - 7 platform preview thumbnail SVGs

## Decisions Made
- Wizard shell manages state centrally and persists each step to workspace immediately (not batched at end)
- Scraped custom templates always saved with applyBranding=false per plan spec (workspace brand colors do not override)
- Step resume implemented by checking onboardingState.steps for first incomplete step
- Cookie `kbpipe-onboarded=true` set with 1-year max-age on completion or skip
- PlatformCard uses Next.js Image component with unoptimized flag for SVG rendering

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Renamed markdown.svg to markdown-only.svg**
- **Found during:** Task 2 (platform card grid)
- **Issue:** Platform ID is `markdown-only` but SVG was named `markdown.svg`, causing broken image reference
- **Fix:** Renamed `public/platforms/markdown.svg` to `public/platforms/markdown-only.svg`
- **Files modified:** public/platforms/markdown-only.svg
- **Committed in:** ea51490 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Filename correction necessary for platform card thumbnails to render. No scope creep.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Onboarding wizard complete, ready for Plan 05 (settings/branding controls)
- Platform preview thumbnails available for reuse in settings UI
- Cookie-based onboarding detection ready for middleware integration

## Self-Check: PASSED
- All 15 key files verified present on disk
- Task commits: ceacb97, ea51490 (verified in git log)
- Full test suite: 119 tests, 12 files, all passing

---
*Phase: 08-generic-templates-onboarding*
*Completed: 2026-03-18*
