---
phase: 35-large-workflow-handling
plan: 03
subsystem: chat-integration
tags: [client-side, selection-ui, api-integration, subgraph]
requires:
  - src/lib/chat/subgraphExtractor.ts (extractSubgraph)
  - src/lib/chat/contextBuilder.ts (stripBinaryData)
provides:
  - Selection-aware chat workflow state
  - Selection chip UI in ChatPanel
  - API-side subgraph context building
affects:
  - src/components/WorkflowCanvas.tsx (chatWorkflowState computation)
  - src/components/ChatPanel.tsx (selection UI, error handling)
  - src/app/api/chat/route.ts (subgraph-aware context)
  - src/lib/chat/tools.ts (system prompt)
tech-stack:
  - React
  - TypeScript
  - Next.js API Routes
  - AI SDK v6
key-files:
  - src/components/WorkflowCanvas.tsx (chatWorkflowState with stripped data)
  - src/components/ChatPanel.tsx (selection chip UI)
  - src/app/api/chat/route.ts (subgraph extraction)
  - src/lib/chat/tools.ts (system prompt updates)
key-decisions:
  - Client-side binary stripping (not API-side) for smaller HTTP payloads
  - selectedNodeIds derived from node.selected state
  - Selection chip dismissible per session (resets when selection changes)
  - Server-side subgraph extraction in API route
  - System prompt includes metadata placeholder notes
  - 413 error handling for oversized payloads
duration: 5 minutes
completed: 2026-01-31
---

# Client-side wiring, ChatPanel selection chip, API subgraph integration

## Performance

**Started:** 2026-01-31
**Completed:** 2026-01-31
**Duration:** ~5 minutes
**Code output:** 4 files modified
**Efficiency:** Clean execution phase, all tasks completed successfully

## Accomplishments

Completed the full integration of selection-aware chat context for large workflows:

1. **Client-side binary stripping** - `chatWorkflowState` uses `stripBinaryData()` to create rich but compact node data, removing base64 images/videos and large arrays while preserving all parameters and settings

2. **Selection-aware subgraph scoping** - `selectedNodeIds` computed from `nodes.filter(n => n.selected)` and passed to chat API for focused context

3. **Selection chip UI** - Dismissible "Focused on N selected nodes" chip appears above chat input when nodes are selected, providing clear visual feedback

4. **API-side subgraph extraction** - `extractSubgraph()` called in chat API route before context building, enabling detailed focus on selected nodes with lightweight summaries of the rest

5. **Error handling** - Oversized payload errors return friendly 413 message to user

6. **System prompt updates** - Enhanced with metadata placeholder notes and subgraph summary section to guide LLM understanding of stripped context

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | aaafef4 | feat(35-03): rewrite chatWorkflowState with selection context |
| 2 | 89fca5f | feat(35-03): update API route and system prompt for subgraph-aware context |
| 3 | (checkpoint) | Human verification - approved by user |

## Files Created/Modified

**Created:**
- None (all modifications to existing files)

**Modified:**
- `src/components/WorkflowCanvas.tsx` - Rich stripped `chatWorkflowState` with `selectedNodeIds`
- `src/components/ChatPanel.tsx` - Selection chip UI, `selectedNodeIds` forwarding, error handling
- `src/app/api/chat/route.ts` - Subgraph-aware context building, 413 error handling
- `src/lib/chat/tools.ts` - System prompt with metadata awareness and subgraph summary

## Decisions Made

1. **Client-side stripping** - Call `stripBinaryData()` in WorkflowCanvas (not API-side) to reduce HTTP payload size before network transmission

2. **Selection derivation** - Compute `selectedNodeIds` from `nodes.filter(n => n.selected).map(n => n.id)` rather than maintaining separate state

3. **Chip dismissibility** - Selection chip dismissible per session using local `useState`, resets when selection changes (chip reappears)

4. **Server-side extraction** - Subgraph extraction happens in API route (not client-side) to keep client bundle smaller and logic centralized

5. **Metadata placeholders** - System prompt explicitly notes that `[image: ...]`, `[video: ...]`, `[N image(s)]` are non-editable metadata placeholders representing stripped binary data

6. **Error handling** - 413 status for token/size issues with friendly message: "Workflow too large to send. Try selecting fewer nodes."

## Deviations from Plan

None. Implementation followed plan exactly:
- Binary stripping integrated client-side
- Selection chip UI implemented as specified
- API route modified for subgraph-aware context
- System prompt enhanced with metadata notes
- All checkpoint requirements met

## Issues Encountered

None. Clean execution with no blockers. All tasks completed successfully and checkpoint approved.

## Next Phase Readiness

**Phase 35 complete** - All 3 plans finished:
- Plan 01: Binary stripping and rich workflow context (TDD)
- Plan 02: Selection-aware subgraph extraction (TDD)
- Plan 03: Client-side wiring and integration (execution)

**System capabilities:**
- Chat agent receives rich stripped node data with all parameters
- Users can select nodes to focus LLM attention on specific workflow areas
- Selection chip provides clear visual feedback
- Subgraph extraction enables scalable context for large workflows (50+ nodes)
- Error handling prevents silent failures from oversized payloads

**Ready for next milestone** - Phase 35 completes Milestone v1.4 (Agentic Workflow Builder). Ready to proceed to Milestone v1.5 (Store Refactoring) or address any new priorities.
