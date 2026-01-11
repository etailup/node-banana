# Issues

Deferred enhancements and improvements discovered during development.

## Open Issues

### ISS-002: Multi-image inputs not mapped correctly for fal.ai models

**Discovered:** 2026-01-12 during Phase 8 UAT
**Severity:** Medium (affects specific models with multiple image inputs)
**Context:** fal.ai Kling 2.6 image-to-video model accepts both `image_url` (first frame) and `tail_image_url` (last frame), but the API route only maps the first connected image to `image_url` and ignores additional images.

**Evidence from logs:**
```
Images count: 2
Added image as 'image_url' (data:image/png;base64,...)
Request body keys: [ 'prompt', 'image_url' ]
```
Second image was received but not included in request body.

**Root cause:** `/api/generate/route.ts` fal.ai handling only maps `images[0]` to `image_url`. No logic to map additional images to their correct schema parameters (e.g., `tail_image_url`).

**Suggested fix:**
1. Fetch model schema to identify all image input parameters
2. Map connected images to schema parameters in order (or by handle name if available)
3. Consider adding named image handles to GenerateVideoNode for explicit mapping

## Resolved Issues

### ISS-001: Generate node should adapt to model requirements

**Discovered:** 2026-01-09 during UAT for Phase 5
**Resolved:** 2026-01-10 in Phase 06-03 (Custom model parameters)
**Resolution:** Added /api/models/[modelId] endpoint to fetch model parameter schemas from Replicate and fal.ai. Created ModelParameters component that renders dynamic inputs based on schema. Parameters flow through to providers during generation.

---
*Last updated: 2026-01-12*
