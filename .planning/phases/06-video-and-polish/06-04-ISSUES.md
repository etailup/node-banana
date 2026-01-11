# UAT Issues: Phase 6 Plan 4

**Tested:** 2026-01-11
**Source:** .planning/phases/06-video-and-polish/06-04-PLAN.md
**Tester:** User via /gsd:verify-work

## Open Issues

[None]

## Future Enhancements

### ENHANCE-002: Auto-resize node when expanding Parameters section

**Logged:** 2026-01-11
**Priority:** Medium
**Feature:** Node UX

**Description:** When the user expands the "Parameters" collapsible section, the node height does not automatically adjust to fit the content. User must manually drag to resize the node.

**Desired Behavior:** Node should auto-expand its height when Parameters section is opened, and shrink back when closed.

**Technical Notes:**
- BaseNode or the specific node component needs to detect content height changes
- React Flow supports dynamic node dimensions
- Could use ResizeObserver or measure content on expand/collapse toggle
- Need to call `updateNodeData` with new dimensions or use React Flow's auto-sizing

---

### ENHANCE-001: Dynamic model input handles based on schema

**Logged:** 2026-01-11
**Priority:** Medium
**Feature:** Model-specific node inputs

**Description:** Currently GenerateImage/GenerateVideo nodes have fixed generic inputs (one image handle, one text handle). Models like Kling 2.6 support multiple distinct inputs:
- First frame image
- Last frame image
- Positive prompt
- Negative prompt

**Desired Behavior:** Parse model schema to identify input types and dynamically create the appropriate number of input handles/edges. Each input should be labeled according to its purpose.

**Technical Notes:**
- Schema already fetched via Model Search API
- Would need to identify image inputs (image_url, first_frame, last_frame, etc.)
- Would need to identify text inputs (prompt, negative_prompt, etc.)
- Handle components would need to be generated dynamically
- Connection validation and execution logic would need updates

## Resolved Issues

### UAT-001: fal.ai model parameter schema returns 404 [RESOLVED]

**Discovered:** 2026-01-11
**Resolved:** 2026-01-11
**Phase/Plan:** 06-04
**Severity:** Minor
**Feature:** Custom model parameters
**Resolution:** Updated to use correct fal.ai Model Search API (`/v1/models?endpoint_id={modelId}&expand=openapi-3.0`) and properly parse the response structure (models array, $ref resolution).

---

*Phase: 06-video-and-polish*
*Plan: 04*
*Tested: 2026-01-11*
