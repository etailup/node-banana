# Node Banana Multi-Provider Support

## What This Is

Expanding Node Banana to support multiple AI providers (Replicate, fal.ai) alongside existing Gemini integration for image and video generation. Users can enable providers via API keys in settings, browse models through a search dialog, and use any supported model in their workflows.

## Core Value

Provider infrastructure that dynamically discovers models from external APIs, enabling users to access hundreds of image/video generation models without hardcoding schemas.

## Requirements

### Validated

- ✓ Visual node-based workflow editor with React Flow — existing
- ✓ Image generation via Gemini API (nano-banana, nano-banana-pro) — existing
- ✓ Text generation via Gemini/OpenAI — existing
- ✓ Image annotation with Konva.js — existing
- ✓ Workflow save/load with JSON files — existing
- ✓ Auto-save and cost tracking — existing
- ✓ Node grouping and locking — existing

### Active

- [ ] Provider settings UI with API key management for Replicate and fal.ai
- [ ] Dynamic model fetching from provider APIs (no hardcoded schemas)
- [ ] Rename NanoBanana node to generic "Generate" node with multi-model support
- [ ] Model selection UI within Generate node
- [ ] Floating action bar icons for enabled providers with search dialog
- [ ] Model search dialog showing name, description, pricing
- [ ] Local server endpoint to serve images as URLs for providers requiring URLs
- [ ] Support both base64 and URL image inputs per provider requirements
- [ ] Inline video playback in output node
- [ ] Custom model parameters support (use provider schema)
- [ ] Backward compatibility with existing workflows (Gemini remains default)

### Out of Scope

- Model favorites/history — deferred to future version
- Cost tracking for Replicate/fal.ai — deferred, keep existing Gemini cost tracking only
- Audio generation models — focus on image/video only
- Provider SDKs — prefer direct API calls via fetch

## Context

**Existing Architecture:**
- Central state in `src/store/workflowStore.ts` (Zustand)
- Node types defined in `src/types/index.ts`
- Image generation in `src/app/api/generate/route.ts`
- NanoBanana node in `src/components/nodes/NanoBananaNode.tsx`
- Project settings in `src/components/ProjectSetupModal.tsx`

**Provider APIs:**
- Replicate: REST API with model discovery at `https://api.replicate.com/v1/models`
- fal.ai: REST API with model listing endpoints

**Backward Compatibility Approach:**
- Existing `nanoBanana` node type continues to work
- Internal model names (`nano-banana`, `nano-banana-pro`) map to Gemini
- New workflows use generic model selection
- Old workflows load and execute without changes

## Constraints

- **Default Provider**: Gemini remains the default; Replicate/fal.ai are optional add-ons
- **Backward Compatibility**: Existing workflows must continue to work without modification
- **No Hardcoded Schemas**: Model parameters fetched from provider APIs at runtime
- **Local Image Serving**: Use local API endpoint for image URLs, no external upload services

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local server for image URLs | Avoids external dependencies, works offline, no upload latency | — Pending |
| Fetch over SDKs | Reduces bundle size, consistent patterns across providers | — Pending |
| Dynamic model discovery | Future-proof as providers add models, no maintenance burden | — Pending |
| Keep nanoBanana type internally | Backward compatibility for existing workflows | — Pending |

---
*Last updated: 2026-01-09 after initialization*
