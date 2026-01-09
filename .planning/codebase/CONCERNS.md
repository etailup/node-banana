# Codebase Concerns

**Analysis Date:** 2026-01-09

## Tech Debt

**Large Monolithic Store File:**
- Issue: `src/store/workflowStore.ts` is 2,027 lines with mixed concerns
- Files: `src/store/workflowStore.ts`
- Why: Rapid development, all logic centralized for convenience
- Impact: Difficult to test, hard to navigate, violates single responsibility
- Fix approach: Split into `workflowActions.ts`, `workflowExecution.ts`, `workflowPersistence.ts`

**Silent Log Failures:**
- Issue: Fetch calls to `/api/logs` have `.catch()` with only console.error
- Files: `src/store/workflowStore.ts` (lines 1071-1082, 1327-1333, 1345-1351, 1700-1706)
- Why: Non-critical logging shouldn't block execution
- Impact: Silent failures, no user visibility into logging issues
- Fix approach: Add retry logic or toast notifications

## Known Bugs

**None Identified:**
- No TODO/FIXME comments indicating known bugs found in codebase scan
- Application appears stable based on code review

## Security Considerations

**Shell Command Execution:**
- Risk: `browse-directory/route.ts` executes osascript/PowerShell commands
- Files: `src/app/api/browse-directory/route.ts` (lines 19-21, 74-77)
- Current mitigation: Commands are hardcoded (not user input)
- Recommendations: Validate returned paths with `path.resolve()`, use `execFile` instead of `exec`

**Unvalidated Base64 Processing:**
- Risk: Large/malformed base64 strings could cause memory issues
- Files: `src/app/api/generate/route.ts` (line 74), `src/app/api/save-generation/route.ts`
- Current mitigation: None - Buffer.from() called on any size input
- Recommendations: Add size validation before processing (e.g., 10MB limit)

**API Keys in Environment:**
- Risk: Low - standard practice for API keys
- Files: `.env.local` (gitignored), `.env.example` (documented)
- Current mitigation: .gitignore includes .env.local
- Recommendations: Ensure .env.local never committed

## Performance Bottlenecks

**Synchronous localStorage Operations:**
- Problem: localStorage.getItem/setItem called synchronously during state updates
- Files: `src/store/workflowStore.ts` (lines 251, 273, 290, 305, 314, 320)
- Measurement: Not measured, but could block on large workflows
- Cause: Simple implementation for persistence
- Improvement path: Consider IndexedDB for large datasets, add debouncing

**Deep Cloning with JSON:**
- Problem: `JSON.parse(JSON.stringify())` used for cloning
- Files: `src/store/workflowStore.ts` (line 508)
- Measurement: Not measured
- Cause: Simple solution for deep cloning
- Improvement path: Use `structuredClone()` for better performance

## Fragile Areas

**Workflow Execution Pipeline:**
- Files: `src/store/workflowStore.ts` (executeWorkflow, lines 815-1356)
- Why fragile: 500+ lines of complex state management with topological sort
- Common failures: Edge cases with pause edges, group locking, error recovery
- Safe modification: Split into smaller functions, add unit tests first
- Test coverage: None - HIGH PRIORITY gap

**Connection Validation:**
- Files: `src/components/WorkflowCanvas.tsx` (isValidConnection)
- Why fragile: Type matching logic affects entire workflow
- Common failures: Invalid connections accepted or valid connections rejected
- Safe modification: Review handle type definitions in `src/types/index.ts`
- Test coverage: None

## Scaling Limits

**Workflow Size:**
- Current capacity: Unknown - no explicit limits
- Limit: Browser memory for large node graphs with many images
- Symptoms at limit: Slow rendering, memory pressure
- Scaling path: External image storage (already implemented), virtualization for node list

## Dependencies at Risk

**No Critical Risks Identified:**
- All dependencies appear actively maintained
- React 19, Next.js 16, TypeScript 5.9 are current versions
- @xyflow/react actively maintained

## Missing Critical Features

**No Tests for Critical Code:**
- Problem: Workflow execution logic untested
- Files: `src/store/workflowStore.ts`, `src/app/api/**`
- Current workaround: Manual testing only
- Blocks: Safe refactoring, confidence in changes
- Implementation complexity: Medium - need to mock API calls

## Test Coverage Gaps

**Workflow Execution:**
- What's not tested: `executeWorkflow()`, `getConnectedInputs()`, node-specific execution
- Risk: Bugs in core functionality not caught until runtime
- Priority: High
- Difficulty to test: Medium - requires mocking API calls and store setup

**API Routes:**
- What's not tested: All routes in `src/app/api/**`
- Risk: Server-side bugs not caught
- Priority: Medium
- Difficulty to test: Medium - need request/response mocking

**React Components:**
- What's not tested: All components in `src/components/**`
- Risk: UI bugs not caught
- Priority: Low - visual testing manual
- Difficulty to test: Medium - need React Testing Library setup

---

*Concerns audit: 2026-01-09*
*Update as issues are fixed or new ones discovered*
