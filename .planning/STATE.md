# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-09)

**Core value:** Provider infrastructure that dynamically discovers models from external APIs, enabling users to access hundreds of image/video generation models without hardcoding schemas.
**Current focus:** Phase 7 - Video Connections

## Current Position

Phase: 7 of 12 (Video Connections)
Plan: Not started
Status: Ready to plan
Last activity: 2026-01-12 - Milestone v1.1 Improvements created

Progress: ░░░░░░░░░░ 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 15
- Average duration: 6.9 min
- Total execution time: 1.73 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Provider Infrastructure | 2/2 | 14 min | 7 min |
| 2. Model Discovery | 3/3 | 14 min | 4.7 min |
| 3. Generate Node Refactor | 3/3 | 13 min | 4.3 min |
| 4. Model Search Dialog | 2/2 | 17 min | 8.5 min |
| 5. Image URL Server | 2/2 | 5 min | 2.5 min |
| 6. Video & Polish | 4/4 | 43 min | 14.3 min |

**Recent Trend:**
- Last 5 plans: 3 min, 2 min, 10 min, 28 min, 5 min
- Trend: returned to normal after human verification checkpoint

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Gemini always enabled via env var (GEMINI_API_KEY), Replicate/fal.ai optional
- API keys stored in localStorage under node-banana-provider-settings key
- Local state in modal to avoid saving on every keystroke
- Provider config pattern: {id, name, enabled, apiKey, apiKeyEnvVar?}
- Provider registry uses self-registration pattern via registerProvider()
- Gemini remains special-cased in /api/generate for now, not yet migrated
- Capability inference from model name/description keywords
- fal.ai API key optional (works without but rate limited)
- fal.ai auth header: "Key {apiKey}" format (not Bearer)
- fal.ai category maps directly to ModelCapability (no inference)
- 10-minute cache TTL for model lists
- Unified API at /api/models with header-based auth
- Provider dropdown shows Gemini always, others only if API key configured
- Aspect ratio/resolution controls shown only for Gemini provider
- Backward compatibility via aliases: NanoBananaNode, saveNanoBananaDefaults
- Server-side provider execution in API route (not client-side)
- Header-based API key passing: X-Replicate-API-Key, X-Fal-API-Key
- fal.ai sync API (fal.run) instead of queue-based async
- Dual migration approach: loadWorkflow migrates + UI effect for runtime
- fal.ai icon always visible in action bar (works without key but rate limited)
- Replicate icon only visible when API key is configured
- Client-side search filtering for Replicate (their search API unreliable)
- Show all capability badges to differentiate similar models
- Extract variant suffix from fal.ai model IDs for display name
- No TTL for image store - explicit cleanup pattern (callers delete after use)
- 256KB threshold for shouldUseImageUrl (Replicate recommendation)
- Gemini excluded from video node (doesn't support video generation)
- Large videos (>20MB) return URL instead of base64 to avoid memory issues
- Fetch schema from provider API at model selection time with 10-min cache
- Filter internal params, prioritize user-relevant ones (seed, steps, guidance)
- Collapsible parameters section to keep node UI compact

### Deferred Issues

- UAT-001: Provider icons should use real logos (minor, cosmetic)
- ISS-001: Resolved - Generate nodes now adapt to model requirements via dynamic parameters

### Blockers/Concerns

- Pre-existing lint configuration issue (ESLint not configured). Not blocking development.

### Roadmap Evolution

- v1.0 Multi-Provider Support shipped: 6 phases (Phase 1-6), 15 plans
- Milestone v1.1 Improvements created: 6 phases (Phase 7-12), improvements and polish

## Session Continuity

Last session: 2026-01-12
Stopped at: Milestone v1.1 Improvements initialization
Resume file: None
Next action: Plan Phase 7 (Video Connections)
