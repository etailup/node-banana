---
phase: 06-video-and-polish
plan: 01
subsystem: ui, api
tags: [video, react, nextjs, replicate, fal.ai, react-flow]

# Dependency graph
requires:
  - phase: 03
    provides: GenerateImageNode pattern, provider selection UI
  - phase: 05
    provides: Image URL serving for providers
provides:
  - GenerateVideoNode component with provider/model selection
  - Video generation API support in /api/generate
  - Video output display with HTML5 video element
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [video content-type detection, video URL fallback for large files]

key-files:
  created: [src/components/nodes/GenerateVideoNode.tsx]
  modified: [src/types/index.ts, src/store/workflowStore.ts, src/components/WorkflowCanvas.tsx, src/components/nodes/index.ts, src/app/api/generate/route.ts, src/lib/quickstart/validation.ts]

key-decisions:
  - "Video node excludes Gemini provider (Gemini doesn't support video generation)"
  - "Large videos (>20MB) return URL instead of base64 to avoid memory issues"
  - "Video content-type detection via HTTP headers for Replicate, result.video.url for fal.ai"

patterns-established:
  - "Video response format: { video?: string, videoUrl?: string, contentType: 'video' | 'image' }"
  - "GenerateVideoNode follows same provider/model selector pattern as GenerateImageNode"

issues-created: []

# Metrics
duration: 10min
completed: 2026-01-09
---

# Phase 6 Plan 1: GenerateVideo Node Summary

**GenerateVideoNode component with fal.ai/Replicate provider selection and video generation API support**

## Performance

- **Duration:** 10 min
- **Started:** 2026-01-09T10:16:14Z
- **Completed:** 2026-01-09T10:25:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Created GenerateVideoNode component following GenerateImageNode pattern
- Extended /api/generate route to handle video outputs from both Replicate and fal.ai
- Added video playback display with HTML5 video element and controls
- Integrated video node into workflow execution and regeneration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create GenerateVideoNode component** - `0c29ad1` (feat)
2. **Task 2: Add video generation to API route** - `937480f` (feat)

**Plan metadata:** Pending

## Files Created/Modified

- `src/components/nodes/GenerateVideoNode.tsx` - New video generation node with provider/model selectors
- `src/types/index.ts` - Added generateVideo to NodeType, GenerateVideoNodeData interface, extended GenerateResponse
- `src/store/workflowStore.ts` - Default data, execution logic, regeneration support
- `src/components/WorkflowCanvas.tsx` - Node registration, handles, minimap color (#9333ea purple)
- `src/components/nodes/index.ts` - Exported GenerateVideoNode
- `src/app/api/generate/route.ts` - Video detection for Replicate/fal.ai, content-type handling
- `src/lib/quickstart/validation.ts` - Added generateVideo to valid types

## Decisions Made

- Gemini excluded from video node (doesn't support video generation)
- Large videos (>20MB) return URL directly to avoid memory issues with base64
- Video detection: Replicate uses content-type headers, fal.ai uses result.video.url field
- Video capabilities filter: text-to-video, image-to-video

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## Next Phase Readiness

- GenerateVideoNode ready for testing with actual video models
- Next plan (06-02) will add video playback to OutputNode for viewing generated videos
- Video execution path untested with real providers (will be tested in 06-02)

---
*Phase: 06-video-and-polish*
*Completed: 2026-01-09*
