---
phase: 19-type-refactoring
plan: 01
subsystem: types
tags: [typescript, refactoring, types, modularization]

# Dependency graph
requires:
  - phase: 16-store-modularization
    provides: Pattern for extracting to domain files with re-exports
provides:
  - Node types module (src/types/nodes.ts)
  - Annotation types module (src/types/annotation.ts)
  - Re-exports from index.ts for backward compatibility
affects: [type-refactoring, future-type-extraction]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Type extraction to domain-specific files
    - Re-export pattern for backward compatibility
    - Shared types in base module to avoid circular dependencies

key-files:
  created:
    - src/types/annotation.ts
    - src/types/nodes.ts
  modified:
    - src/types/index.ts

key-decisions:
  - "BaseNodeData defined in annotation.ts to avoid circular imports (nodes.ts imports from annotation.ts)"
  - "Re-export all types from index.ts via export * from './module' for backward compatibility"
  - "Combined Task 1-3 into single atomic commit due to circular type dependencies"

patterns-established:
  - "Type domain files live in src/types/*.ts"
  - "Base types shared across domains go in the dependency-free module"

issues-created: []

# Metrics
duration: 8min
completed: 2026-01-13
---

# Phase 19 Plan 01: Extract Node and Annotation Types Summary

**Extracted node and annotation types from index.ts into focused domain modules with re-exports preserving backward compatibility**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-13T20:38:00Z
- **Completed:** 2026-01-13T20:46:00Z
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Created src/types/annotation.ts with BaseNodeData, shape types, AnnotationNodeData, and tool types (95 lines)
- Created src/types/nodes.ts with NodeType, NodeStatus, all *NodeData types, WorkflowNode, HandleType (180 lines)
- Updated src/types/index.ts to re-export from domain files, reduced from 365 to 126 lines (-239 lines)
- Maintained full backward compatibility for all import sites
- All 1142 tests pass

## Task Commits

Tasks were combined into a single atomic commit due to circular type dependencies:

1. **Tasks 1-3: Extract types to domain files** - `f178b72` (feat)

## Files Created/Modified

- `src/types/annotation.ts` - BaseNodeData, ShapeType, all *Shape types, AnnotationShape, AnnotationNodeData, ToolType, ToolOptions
- `src/types/nodes.ts` - NodeType, NodeStatus, all *NodeData types (ImageInput, Prompt, NanoBanana, GenerateVideo, LLMGenerate, SplitGrid, Output), WorkflowNodeData union, WorkflowNode, HandleType, ModelInputDef, history item types
- `src/types/index.ts` - Re-exports from annotation.ts and nodes.ts, keeps model types, edge types, API types, config types, group types, provider types

## Decisions Made

- **BaseNodeData in annotation.ts:** To avoid circular dependencies (nodes.ts imports AnnotationNodeData from annotation.ts), BaseNodeData is defined in annotation.ts as the base module with no imports
- **Single atomic commit:** Tasks 1-3 are tightly coupled (nodes.ts imports from both annotation.ts and index.ts) - separating them would break compilation
- **Remaining types in index.ts:** Model types (AspectRatio, Resolution, ModelType), LLM types, Edge types, API types, Config types, Group types, Provider types remain in index.ts for Plan 2

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered

- Pre-existing TypeScript errors in test files (missing mock properties for React Flow node types) - not related to this refactoring, tests still pass via Vitest

## Next Phase Readiness

- Pattern established for Plan 19-02 (extract provider, workflow, API, and model types)
- Ready to continue Phase 19 with remaining type extractions

---
*Phase: 19-type-refactoring*
*Completed: 2026-01-13*
