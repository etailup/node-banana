---
phase: 35-large-workflow-handling
plan: 02
subsystem: chat-context
tags: [tdd, selection, subgraph, context-scoping]
requires:
  - src/types/nodes.ts (WorkflowNode type)
  - src/types/workflow.ts (WorkflowEdge type)
provides:
  - src/lib/chat/subgraphExtractor.ts (extractSubgraph function)
  - SubgraphResult interface for selection-aware context
affects:
  - Future chat context builder integration (plan 35-03)
tech-stack:
  - TypeScript
  - Vitest (testing)
key-files:
  - src/lib/chat/subgraphExtractor.ts (89 lines)
  - src/lib/chat/subgraphExtractor.test.ts (289 lines)
key-decisions:
  - Use Set for O(1) node lookup during edge classification
  - Boundary connections track both direction and handle type
  - Empty selection returns all nodes/edges with isScoped=false
  - Type breakdown uses node.type directly (not node data)
  - Handle type from sourceHandle/targetHandle with fallback to "unknown"
duration: 10 minutes
completed: 2026-01-31
---

# Selection-aware subgraph extraction for focused LLM context

## Performance

**Velocity:** 10 minutes (plan 35-02)
**Code output:** 378 lines (89 implementation + 289 tests)
**Test coverage:** 8 comprehensive test cases, all passing
**Efficiency:** Clean TDD flow (RED -> GREEN, no refactor needed)

## Accomplishments

Implemented `extractSubgraph()` function that splits a workflow into detailed selected nodes and a lightweight summary of the rest. This enables context-aware chat where users can select specific nodes to focus the LLM's attention, crucial for large workflows with 50+ nodes.

Key features:
- O(1) node lookup using Set for efficient edge classification
- Three-way edge classification: fully within selection, boundary, outside
- Boundary connections identify direction (incoming/outgoing) and handle type
- Type breakdown counts unselected nodes by type for LLM context
- Empty selection returns full workflow (no scoping)

## Task Commits

| Phase | Commit | Description |
|-------|--------|-------------|
| RED | d102922 | test(35-02): add failing tests for subgraph extraction |
| GREEN | e44bdfa | feat(35-02): implement extractSubgraph for selection-aware context |

## Files Created/Modified

**Created:**
- `src/lib/chat/subgraphExtractor.ts` - Core extraction function with SubgraphResult interface
- `src/lib/chat/subgraphExtractor.test.ts` - Comprehensive test suite (8 test cases)

**Modified:**
- None (net new functionality)

## Decisions Made

1. **Set-based lookup** - Use `new Set(selectedNodeIds)` for O(1) membership testing during edge classification (scales well for large workflows)

2. **Boundary direction semantics** - "incoming" when target is selected (data flows INTO selection), "outgoing" when source is selected (data flows OUT of selection)

3. **Handle type tracking** - Store sourceHandle/targetHandle on boundary connections so LLM knows what type of data is crossing the boundary (image vs text)

4. **Empty selection behavior** - When `selectedNodeIds` is empty, return all nodes/edges with `isScoped=false` (no scoping applied)

5. **Type breakdown source** - Use `node.type` directly rather than inspecting node data (simpler, faster)

## Deviations from Plan

None. Implementation followed plan exactly:
- SubgraphResult interface as specified
- All required test cases implemented
- Edge classification logic matches spec
- Boundary connection structure with direction/handleType fields

## Issues Encountered

None. Clean TDD execution with no blockers.

## Next Phase Readiness

**Ready for plan 35-03 (Chat Context Builder Integration):**
- extractSubgraph function exported and tested
- SubgraphResult interface provides all needed data
- Boundary connections enable LLM to understand data flow across selection
- Type breakdown gives high-level overview of unselected nodes

**Integration points for 35-03:**
- Call extractSubgraph() when user has selected nodes
- Pass selectedNodes to detailed context builder
- Format restSummary into concise text summary for LLM
- Include boundary connections in context (e.g., "Node B receives image from Node A outside selection")
