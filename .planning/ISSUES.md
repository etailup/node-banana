# Issues

Deferred enhancements and improvements discovered during development.

## Open Issues

(None currently)

## Resolved Issues

### ISS-001: Generate node should adapt to model requirements

**Discovered:** 2026-01-09 during UAT for Phase 5
**Resolved:** 2026-01-10 in Phase 06-03 (Custom model parameters)
**Resolution:** Added /api/models/[modelId] endpoint to fetch model parameter schemas from Replicate and fal.ai. Created ModelParameters component that renders dynamic inputs based on schema. Parameters flow through to providers during generation.

---
*Last updated: 2026-01-10*
