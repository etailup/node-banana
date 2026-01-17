---
phase: 24-improved-cost-summary
plan: 03
subsystem: ui
tags: [cost-dialog, pricing, fal-ai, replicate, gemini]

# Dependency graph
requires:
  - phase: 24-01
    provides: fal.ai pricing API integration
  - phase: 24-02
    provides: costCalculator multi-provider support
provides:
  - Simplified CostDialog with Gemini pricing and external provider model links
  - CostIndicator always showing dollar format
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Model links for external providers instead of unreliable pricing

key-files:
  created: []
  modified:
    - src/components/CostDialog.tsx
    - src/components/CostIndicator.tsx
    - src/components/__tests__/CostDialog.test.tsx
    - src/app/api/models/route.ts

key-decisions:
  - "Show $x.xx in header always (Gemini costs only, external providers not tracked)"
  - "Replace external provider pricing with 'View model' links to provider pages"
  - "Remove fal.ai pricing API calls to avoid 429 rate limit errors"

patterns-established:
  - "External provider costs shown as model links, not prices"

issues-created: []

# Metrics
duration: 15min
completed: 2026-01-17
---

# Phase 24 Plan 3: Update CostDialog UI Summary

**Simplified CostDialog showing Gemini pricing with model links for fal.ai/Replicate instead of unreliable external pricing**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-01-16T07:54:02Z
- **Completed:** 2026-01-17T07:31:49Z
- **Tasks:** 4 (3 auto + 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- Simplified CostDialog with two sections: Gemini Cost (with prices) and External Providers (with model links)
- CostIndicator always shows $x.xx format (Gemini costs only)
- Removed fal.ai pricing API calls that were causing 429 rate limit errors
- Model links go to fal.ai/models/{id} and replicate.com/{owner/model}

## Task Commits

1. **Task 1-2: Restructure CostDialog** - `065af2c`, `52a9dc0` (initial implementation)
2. **Task 1-3 (revised): Simplify based on feedback** - `d6ce195` (feat: simplify CostDialog with model links)
3. **Fix: Always show dollar format** - `611760e` (fix: always show dollar format in cost indicator)
4. **Fix: Remove pricing API calls** - `ac6e953` (fix: remove fal.ai pricing API calls causing 429 errors)

## Files Created/Modified

- `src/components/CostDialog.tsx` - Simplified two-section layout with Gemini Cost and External Providers
- `src/components/CostIndicator.tsx` - Always shows $x.xx format
- `src/components/__tests__/CostDialog.test.tsx` - Updated tests for new layout (33 tests passing)
- `src/app/api/models/route.ts` - Removed fetchFalPricing function and related types

## Decisions Made

- External provider pricing is unreliable (fal.ai 429 errors, Replicate has no API) - show model links instead
- Header always shows dollar format (Gemini costs only since external not tracked)
- Incurred cost tracks Gemini generations only

## Deviations from Plan

### User-Requested Changes

**1. Simplified pricing display based on user feedback**
- **Issue:** fal.ai pricing API returning 429 errors, pricing data unreliable
- **Change:** Replaced complex pricing display with simple model links
- **Files modified:** CostDialog.tsx, CostIndicator.tsx, models/route.ts

### Auto-fixed Issues

None - changes were user-directed simplifications.

## Issues Encountered

- fal.ai pricing API rate limiting (429 errors) - resolved by removing pricing calls entirely

## Next Step

Phase 24 complete, ready for next phase
