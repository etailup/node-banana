# UAT Issues: Phase 02 Plan 01

**Tested:** 2026-01-09
**Source:** .planning/phases/02-model-discovery/02-01-SUMMARY.md
**Tester:** User via /gsd:verify-work

## Open Issues

[None]

## Resolved Issues

### UAT-001: Search endpoint returns "Cannot read properties of undefined (reading 'map')"

**Discovered:** 2026-01-09
**Phase/Plan:** 02-01
**Severity:** Major
**Resolved:** 2026-01-09 - Fixed in 02-01-FIX.md
**Commit:** be490bb

**Description:** When using the search query parameter, the API returns an error instead of filtered results. The error "Cannot read properties of undefined (reading 'map')" suggests the Replicate search API returns a different response structure than the list endpoint.

**Fix:** Added defensive null checks before calling .map() on data.results in both API route and provider library. Returns empty array with success:true when results is undefined.

---

*Phase: 02-model-discovery*
*Plan: 01*
*Tested: 2026-01-09*
