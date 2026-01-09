---
phase: 05-image-url-server
plan: 01
subsystem: api
tags: [next.js, api-routes, image-serving, in-memory-cache]

# Dependency graph
requires:
  - phase: 03-02
    provides: Server-side provider execution pattern
  - phase: 02-03
    provides: TTL-based caching pattern (adapted to no-TTL for explicit cleanup)
provides:
  - In-memory image store with explicit cleanup
  - Image serving API endpoint (/api/images/[id])
  - uploadImageForUrl utility returning URL + ID for cleanup
  - shouldUseImageUrl threshold detection (256KB)
affects: [05-02, generate-node, provider-execution]

# Tech tracking
tech-stack:
  added: [crypto.randomUUID]
  patterns: [explicit-cleanup-vs-ttl, request-scoped-resources]

key-files:
  created:
    - src/lib/images/store.ts
    - src/lib/images/index.ts
    - src/app/api/images/[id]/route.ts
  modified: []

key-decisions:
  - "No TTL for image store - callers responsible for cleanup after provider fetches"
  - "Return both URL and ID from uploadImageForUrl to enable cleanup"
  - "256KB threshold matches Replicate recommendation for URL vs base64"

patterns-established:
  - "Explicit cleanup pattern: store returns ID, caller deletes after use"

issues-created: []

# Metrics
duration: 3min
completed: 2026-01-09
---

# Phase 5 Plan 01: Image Serving Endpoint Summary

**In-memory image store with explicit cleanup, serving endpoint at /api/images/[id], and uploadImageForUrl utility returning URL+ID**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-09T09:41:34Z
- **Completed:** 2026-01-09T09:44:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- In-memory Map-based image store with storeImage/getImage/deleteImage/deleteImages
- API endpoint serving stored images with correct Content-Type and Cache-Control: no-store
- uploadImageForUrl utility returning { url, id } for cleanup after use
- shouldUseImageUrl threshold check for 256KB (Replicate's recommendation)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create in-memory image store** - `5cbff58` (feat)
2. **Task 2: Create image serving API endpoint** - `9e85f0b` (feat)
3. **Task 3: Create uploadImageForUrl utility** - `49ad058` (feat)

**Plan metadata:** `5ebea8d` (docs: complete plan)

## Files Created/Modified

- `src/lib/images/store.ts` - Map-based store with storeImage, getImage, deleteImage, deleteImages
- `src/app/api/images/[id]/route.ts` - GET endpoint serving stored images with proper headers
- `src/lib/images/index.ts` - uploadImageForUrl and shouldUseImageUrl utilities, re-exports store

## Decisions Made

- No TTL for image store - using explicit cleanup pattern instead (callers delete after provider fetches)
- Return both URL and ID from uploadImageForUrl to enable cleanup
- 256KB threshold for shouldUseImageUrl matches Replicate's documented recommendation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Buffer to Uint8Array conversion in API route**
- **Found during:** Task 2 (API endpoint implementation)
- **Issue:** NextResponse doesn't directly accept Buffer, needed Uint8Array
- **Fix:** Convert Buffer to Uint8Array in response
- **Files modified:** src/app/api/images/[id]/route.ts
- **Verification:** Build succeeds, TypeScript compiles
- **Committed in:** 9e85f0b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (blocking), 0 deferred
**Impact on plan:** Minor implementation detail, no scope change

## Issues Encountered

None

## Next Phase Readiness

- Image serving infrastructure complete and ready for integration
- Next plan (05-02) will integrate with generate node for URL-based providers
- No blockers

---
*Phase: 05-image-url-server*
*Completed: 2026-01-09*
