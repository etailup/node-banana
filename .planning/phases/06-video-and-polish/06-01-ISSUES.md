# UAT Issues: Phase 6 Plan 1

**Tested:** 2026-01-09
**Source:** .planning/phases/06-video-and-polish/06-01-SUMMARY.md
**Tester:** User via /gsd:verify-work

## Open Issues

[None]

## Resolved Issues

### UAT-001: GenerateVideoNode not accessible from UI

**Discovered:** 2026-01-09
**Phase/Plan:** 06-01
**Severity:** Blocker
**Feature:** GenerateVideoNode component
**Description:** The GenerateVideoNode cannot be added to the canvas. It does not appear in the connection drop menu when dragging from a prompt node, and it does not appear in the floating action bar.
**Expected:** "Generate Video" option available in connection drop menu and/or floating action bar
**Actual:** Node option missing from both menus
**Repro:**
1. Open Node Banana at localhost:3000
2. Drag a connection from a Prompt node's output
3. Look for "Generate Video" in the drop menu - not present
4. Check floating action bar - no video option

**Resolved:** 2026-01-09 - Fixed in immediate hotfix
**Commit:** 1846105
**Fix:** Added generateVideo to TEXT_TARGET_OPTIONS and IMAGE_TARGET_OPTIONS in ConnectionDropMenu.tsx

---
*Phase: 06-video-and-polish*
*Plan: 01*
*Tested: 2026-01-09*
