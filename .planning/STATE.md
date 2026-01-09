# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-09)

**Core value:** Provider infrastructure that dynamically discovers models from external APIs, enabling users to access hundreds of image/video generation models without hardcoding schemas.
**Current focus:** Phase 4 - Model Search Dialog

## Current Position

Phase: 3 of 6 (Generate Node Refactor) - COMPLETE
Plan: 3 of 3 in current phase
Status: Phase complete
Last activity: 2026-01-09 - Completed 03-03-PLAN.md (Backward compatibility)

Progress: [======================================================] 53% (8/15 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 4.9 min
- Total execution time: 0.67 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Provider Infrastructure | 2/2 | 14 min | 7 min |
| 2. Model Discovery | 3/3 | 14 min | 4.7 min |
| 3. Generate Node Refactor | 3/3 | 13 min | 4.3 min |

**Recent Trend:**
- Last 5 plans: 5 min, 5 min, 5 min, 3 min
- Trend: improving

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

### Deferred Issues

None.

### Blockers/Concerns

- Pre-existing lint configuration issue (ESLint not configured). Not blocking development.

## Session Continuity

Last session: 2026-01-09
Stopped at: Completed 03-03-PLAN.md (Backward compatibility)
Resume file: None
Next action: Plan Phase 4 (Model Search Dialog)
