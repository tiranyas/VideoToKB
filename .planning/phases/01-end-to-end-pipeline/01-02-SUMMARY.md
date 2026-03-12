---
phase: 01-end-to-end-pipeline
plan: 02
subsystem: api
tags: [loom, assemblyai, anthropic, claude, sse, pipeline, transcription]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Shared pipeline types, How-to template, test scaffolds in RED state"
provides:
  - "Loom URL resolver with CDN MP4 extraction and Apollo state fallback"
  - "AssemblyAI transcription service with paragraph-level text"
  - "Transcript preprocessor (filler word removal, timestamps, filtering)"
  - "Claude article generator using claude-sonnet-4-5"
  - "Pipeline orchestrator chaining resolve -> transcribe -> generate with progress callbacks"
  - "SSE streaming POST endpoint at /api/process"
affects: [01-03, 01-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [lazy-sdk-instantiation, non-awaited-async-iife-sse, stage-specific-error-handling]

key-files:
  created: [src/lib/loom-resolver.ts, src/lib/transcription.ts, src/lib/article-generator.ts, src/lib/pipeline.ts, src/app/api/process/route.ts]
  modified: [src/lib/__tests__/transcription.test.ts, src/lib/__tests__/article-generator.test.ts]

key-decisions:
  - "Lazy SDK instantiation (inside function body) for testability with Vitest 4.x mock constructors"
  - "Used [\s\S] instead of dotAll flag (s) for regex compatibility with ES2017 target"

patterns-established:
  - "Lazy SDK client creation inside function body for constructor mock compatibility"
  - "Non-awaited async IIFE inside ReadableStream.start() for SSE immediate response"
  - "Stage-specific error messages via nested try/catch in pipeline orchestrator"

requirements-completed: [VINP-01, TRNS-01, TRNS-02, GENR-02, PRUX-01, PRUX-02, PRUX-03]

# Metrics
duration: 4min
completed: 2026-03-12
---

# Phase 1 Plan 02: Backend Pipeline Summary

**Loom resolver, AssemblyAI transcription, Claude article generator, pipeline orchestrator, and SSE streaming endpoint -- all 24 tests GREEN**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-12T21:42:31Z
- **Completed:** 2026-03-12T21:46:18Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Complete backend pipeline: Loom URL -> CDN video URL -> AssemblyAI transcript -> preprocessed text -> Claude KB article
- Pipeline orchestrator emits real-time progress events (in_progress/complete for each stage)
- SSE streaming POST endpoint at /api/process with proper headers for Vercel deployment
- All 24 tests across 4 test files pass GREEN; project builds without errors
- Stage-specific error messages for resolve, transcription, and generation failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement Loom resolver, transcription service, and article generator** - `209ecb7` (feat)
2. **Task 2: Implement pipeline orchestrator and SSE streaming API route** - `3ff29aa` (feat)

## Files Created/Modified
- `src/lib/loom-resolver.ts` - Loom URL validation and CDN video URL extraction with Apollo state fallback
- `src/lib/transcription.ts` - AssemblyAI transcription + filler word removal + timestamp formatting
- `src/lib/article-generator.ts` - Claude claude-sonnet-4-5 article generation with template system prompt
- `src/lib/pipeline.ts` - Pipeline orchestrator chaining all steps with progress callbacks
- `src/app/api/process/route.ts` - SSE streaming POST endpoint (maxDuration 300s, force-dynamic)
- `src/lib/__tests__/transcription.test.ts` - Fixed mock to use function expression for constructor
- `src/lib/__tests__/article-generator.test.ts` - Fixed mock to use function expression for constructor

## Decisions Made
- Lazy SDK instantiation (creating AssemblyAI/Anthropic clients inside function body rather than module scope) for compatibility with Vitest 4.x mock constructors that require `function` expressions
- Used `[\s\S]` character class instead of dotAll regex flag (`s`) for ES2017 target compatibility in Next.js build

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test mock constructors for Vitest 4.x compatibility**
- **Found during:** Task 1
- **Issue:** Vitest 4.x requires `function` expressions (not arrow functions) for `vi.fn().mockImplementation()` when the mock is used as a constructor with `new`. The Plan 01 test scaffolds used arrow functions.
- **Fix:** Changed `() => ({...})` to `function() { return {...}; }` in mock implementations for both AssemblyAI and Anthropic SDK mocks
- **Files modified:** `src/lib/__tests__/transcription.test.ts`, `src/lib/__tests__/article-generator.test.ts`
- **Verification:** All 24 tests pass
- **Committed in:** 209ecb7 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed dotAll regex flag incompatible with ES2017 target**
- **Found during:** Task 2 (build verification)
- **Issue:** `npm run build` failed because the `s` (dotAll) regex flag requires ES2018+, but tsconfig targets ES2017
- **Fix:** Replaced `/pattern/s` with `/pattern/` using `[\s\S]` for cross-line matching
- **Files modified:** `src/lib/loom-resolver.ts`
- **Verification:** Build succeeds, tests still pass
- **Committed in:** 3ff29aa (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for test and build correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None for this plan -- API keys (ASSEMBLYAI_API_KEY, ANTHROPIC_API_KEY) are documented in `.env.local.example` from Plan 01.

## Next Phase Readiness
- Backend pipeline complete, ready for Plan 03 (frontend components)
- All test scaffolds in GREEN state
- SSE endpoint ready for client consumption via fetch + ReadableStream

## Self-Check: PASSED

All 5 key files verified present. Both task commits (209ecb7, 3ff29aa) verified in git log.

---
*Phase: 01-end-to-end-pipeline*
*Completed: 2026-03-12*
