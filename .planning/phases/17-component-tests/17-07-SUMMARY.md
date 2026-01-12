---
phase: 17-component-tests
plan: 07
status: complete
---

# Summary: Menu and Notification Component Tests

## Completed Tasks

### Task 1: Add ConnectionDropMenu component tests
**Commit:** `109cd3f`

Created comprehensive tests for the ConnectionDropMenu component covering:
- Basic rendering (position, header with handle type, keyboard shortcuts hint)
- Not rendering when handleType is null
- Node type filtering for source connections:
  - Image output shows: Annotate, Generate Image, Generate Video, Split Grid Node, Split Grid Now, Output
  - Text output shows: Generate Image, Generate Video, LLM Generate
  - Video output shows: Generate Video, Output
- Node type filtering for target connections:
  - Image input shows: Image Input, Annotate, Generate Image
  - Text input shows: Prompt, LLM Generate
  - Video input shows: Generate Video
- Menu item click behavior (onSelect with type and isAction flag)
- Escape key closing menu
- Click outside closing menu
- Keyboard navigation (ArrowUp, ArrowDown, Enter, wrap-around)
- Mouse hover highlighting

**Tests:** 22

### Task 2: Add Toast and CostIndicator tests
**Commit:** `6c7e141`

**Toast.test.tsx:**
- Basic rendering (not rendered when null, renders with message, close button)
- Type styling (info, success, warning, error with appropriate bg colors)
- Type icons displayed for each type
- Close button click calls hide()
- Auto-hide after 4 seconds when not persistent
- Persistent toast stays visible (no auto-hide)
- Details section collapsed by default
- "Show details" button expands details
- "Hide details" button collapses details
- Details reset when message changes
- useToast store tests (show sets message/type/persistent/details, hide clears state)

**Tests:** 31

**CostIndicator.test.tsx:**
- Not rendered when no nodes and incurredCost is 0
- Renders when generation nodes exist
- Renders when incurredCost > 0
- Zero cost display ($0.00)
- Non-zero cost formatted correctly (nano-banana, nano-banana-pro, 4K resolution)
- Sum costs for multiple generation nodes
- Click opens CostDialog
- Close button closes CostDialog
- Passes correct predictedCost and incurredCost to CostDialog
- Cost updates when nodes change
- SplitGrid configured nodes included in cost calculation
- Unconfigured SplitGrid nodes not included

**Tests:** 16

## Files Created/Modified
- `/src/components/__tests__/ConnectionDropMenu.test.tsx` (253 lines) - NEW (previously existed but uncommitted)
- `/src/components/__tests__/Toast.test.tsx` (293 lines) - NEW
- `/src/components/__tests__/CostIndicator.test.tsx` (320 lines) - NEW

## Verification Results
- [x] `npm test -- --run` passes all tests (643 tests)
- [x] `npm run build` succeeds without errors
- [x] ConnectionDropMenu node filtering logic tested
- [x] Toast auto-hide and persistent modes tested

## Test Count
- New tests added: 69 (22 + 31 + 16)
- Total project tests: 643

## Deviations
None. All tasks completed as planned.

## Commit History
1. `109cd3f` - test(17-07): add ConnectionDropMenu component tests
2. `6c7e141` - test(17-07): add Toast and CostIndicator component tests
