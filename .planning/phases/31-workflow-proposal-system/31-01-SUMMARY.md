---
phase: 31-workflow-proposal-system
plan: 01
subsystem: api
tags: [quickstart, workflow-proposal, llm, gemini, typescript]

# Dependency graph
requires:
  - phase: 30-quickstart-experience
    provides: quickstart API patterns, validation utilities, prompts.ts structure
provides:
  - WorkflowProposal types for reviewable workflow structure
  - buildProposalPrompt function for proposal generation
  - /api/quickstart/propose endpoint for generating proposals
affects: [31-02, quickstart-ui, workflow-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [proposal-before-build, reviewable-workflow-structure]

key-files:
  created:
    - src/lib/quickstart/proposalPrompt.ts
    - src/app/api/quickstart/propose/route.ts
  modified:
    - src/types/quickstart.ts

key-decisions:
  - "Proposal types focus on purpose/description, not internal state or positions"
  - "Reuse parseJSONFromResponse from validation.ts for consistent JSON parsing"
  - "Validate proposal shape before returning to catch LLM errors early"

patterns-established:
  - "ProposedNode.purpose: Human-readable explanation of node's role in workflow"
  - "ProposedConnection.description: Data flow explanation for user understanding"
  - "WorkflowProposal.warnings: Surface limitations before user commits to workflow"

issues-created: []

# Metrics
duration: 12min
completed: 2026-01-26
---

# Phase 31-01: Workflow Proposal Infrastructure Summary

**WorkflowProposal types, buildProposalPrompt function, and /api/quickstart/propose endpoint for reviewable workflow structure before JSON generation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-26T15:00:00Z
- **Completed:** 2026-01-26T15:12:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- WorkflowProposal types enable reviewable structure with purpose descriptions
- buildProposalPrompt generates LLM prompt focused on human-readable descriptions
- /api/quickstart/propose endpoint returns structured proposals for user review

## Task Commits

Each task was committed atomically:

1. **Task 1: Define WorkflowProposal types** - `602130a` (feat)
2. **Task 2: Create proposal generation prompt** - `0e42a7d` (feat)
3. **Task 3: Create /api/quickstart/propose endpoint** - `c9b887b` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `src/types/quickstart.ts` - Added ProposedNode, ProposedConnection, ProposedGroup, WorkflowProposal types
- `src/lib/quickstart/proposalPrompt.ts` - buildProposalPrompt function for proposal generation
- `src/app/api/quickstart/propose/route.ts` - POST endpoint for generating workflow proposals

## Decisions Made
- **Proposal types focus on purpose**: Unlike full workflow JSON, proposals emphasize human-readable descriptions for each node and connection. No positions, no internal state.
- **Reuse validation utilities**: parseJSONFromResponse already handles markdown extraction and error recovery.
- **Shape validation before return**: The endpoint validates that LLM output matches expected structure to fail fast on malformed responses.

## Deviations from Plan

None - plan executed exactly as written

## Issues Encountered
None

## Next Phase Readiness
- Proposal endpoint is ready for ProposalReviewView UI integration (Plan 02)
- Types are exported and can be imported by components
- Endpoint tested via build verification

---
*Phase: 31-workflow-proposal-system*
*Completed: 2026-01-26*
