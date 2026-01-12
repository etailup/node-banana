---
phase: 14-fix-drag-connect-bugs
plan: 01
subsystem: ui
tags: [react-flow, handles, connections, node-editor]

requires:
  - phase: 03-generate-node-refactor
    provides: Dynamic handle rendering from model schema
  - phase: 04-model-search-dialog
    provides: Model selection and schema loading
provides:
  - Stable drag-connect node creation that persists through model selection
  - Normalized handle ID system for multi-provider compatibility
  - Handle-to-schema mapping for API parameter passing
affects: [future-node-types, connection-system-improvements]

tech-stack:
  added: []
  patterns:
    - "Normalized handle IDs (image, text, image-0, text-0) for connection stability"
    - "data-schema-name attribute for preserving API parameter names"
    - "handleToSchemaName mapping in execution for API compatibility"

key-files:
  created: []
  modified:
    - src/components/nodes/GenerateImageNode.tsx
    - src/components/nodes/GenerateVideoNode.tsx
    - src/components/WorkflowCanvas.tsx
    - src/store/workflowStore.ts

key-decisions:
  - "Use normalized handle IDs instead of schema names for React Flow handles"
  - "Store schema name in data-schema-name attribute for reference"
  - "Build handleToSchemaName mapping at execution time from inputSchema"

patterns-established:
  - "Handle normalization: single input uses type name (image), multiple use indexed (image-0)"
  - "Schema mapping: inputSchema drives normalized ID to schema name conversion"

issues-created: []

duration: 7min
completed: 2026-01-12
---

# Phase 14 Plan 01: Fix Drag-Connect Node Creation Bugs Summary

**Placeholder handles ensure connections persist when selecting models that don't use all input types**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-12T10:11:43Z
- **Completed:** 2026-01-12T10:23:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Always render "image" and "text" handles even when model schema doesn't include them
- Placeholder handles (dimmed at 30% opacity) preserve connections for models that don't use that input type
- Normalized dynamic handle IDs to use standard values ("image", "text") instead of schema-specific names
- Updated connection validation to return normalized handle IDs when finding compatible targets
- Added handle-to-schema mapping in execution to preserve API parameter compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Normalize handle IDs + placeholder handles** - `7548e5a` (fix)
2. **Task 2: Update connection validation** - `714b60b` (fix)
3. **Task 3: Map handles to schema names in execution** - `5643cb8` (feat)

## Files Created/Modified
- `src/components/nodes/GenerateImageNode.tsx` - Placeholder handles for missing inputs, normalized IDs
- `src/components/nodes/GenerateVideoNode.tsx` - Same fix for video nodes
- `src/components/WorkflowCanvas.tsx` - findCompatibleHandle returns normalized IDs
- `src/store/workflowStore.ts` - getConnectedInputs builds handleToSchemaName mapping

## Decisions Made
- **Placeholder handles**: Always render "image" and "text" handles, dimmed when model doesn't use them
- **Normalized handle naming**: Single input of type uses base name ("image"), multiple use indexed ("image-0", "image-1")
- **Schema name preservation**: Stored in data-schema-name attribute for debugging/reference
- **Execution mapping**: Build mapping at runtime from inputSchema rather than storing in edge data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Handle disappearance with text-to-image models**
- **Found during:** Testing after initial fix
- **Issue:** Text-to-image models (FLUX, etc.) have no image input in schema, causing image handle to disappear
- **Fix:** Always render placeholder handles for missing input types (dimmed at 30% opacity)
- **Files modified:** GenerateImageNode.tsx, GenerateVideoNode.tsx
- **Verification:** Build passes, handles persist through model selection

## Issues Encountered

None

## Next Phase Readiness
- Phase 14 complete (single plan phase)
- Milestone v1.1 complete - all 8 phases finished
- Ready for `/gsd:complete-milestone`

---
*Phase: 14-fix-drag-connect-bugs*
*Completed: 2026-01-12*
