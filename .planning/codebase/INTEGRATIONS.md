# External Integrations

**Analysis Date:** 2026-01-09

## APIs & External Services

**AI Image Generation - Google Gemini:**
- SDK/Client: `@google/genai` 1.30.0 - `package.json`
- Route: `src/app/api/generate/route.ts` (5-minute timeout)
- Models: `gemini-2.5-flash-image`, `gemini-3-pro-image-preview`
- Internal names: `nano-banana`, `nano-banana-pro`
- Auth: `GEMINI_API_KEY` env var
- Features: Aspect ratio, resolution (2K/4K), Google Search tool

**AI Text Generation - Google Gemini:**
- Route: `src/app/api/llm/route.ts` (1-minute timeout)
- Models: `gemini-2.5-flash`, `gemini-3-flash-preview`, `gemini-3-pro-preview`
- Auth: `GEMINI_API_KEY` env var
- Features: Temperature, max tokens, multimodal (text + images)

**AI Text Generation - OpenAI (Optional):**
- Route: `src/app/api/llm/route.ts`
- Models: `gpt-4.1-mini`, `gpt-4.1-nano`
- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth: `OPENAI_API_KEY` env var (optional)
- Features: Temperature, max tokens, multimodal support

## Data Storage

**File System (Server-side):**
- Workflow JSON files - `src/app/api/workflow/route.ts`
- Generated images as PNG - `src/app/api/save-generation/route.ts`
- Auto-creates `inputs/` and `generations/` subdirectories
- Uses `fs/promises` for async file operations

**LocalStorage (Client-side):**
- `node-banana-workflow-configs` - Project metadata and file paths
- `node-banana-workflow-costs` - Cost tracking per workflow
- `node-banana-nanoBanana-defaults` - Sticky generation settings
- Reference: `src/store/workflowStore.ts`

**Caching:**
- None (all database queries, no Redis)

## Authentication & Identity

**Auth Provider:**
- None - Local-first application
- API keys stored in environment variables only

## Monitoring & Observability

**Custom Logging:**
- Logger: `src/utils/logger.ts` (client), `src/utils/logger-server.ts` (server)
- Session-based logging with unique session IDs
- Structured JSON format with timestamps
- Categories: workflow, node execution, API calls, file operations
- Privacy: Truncates prompts (200 chars), sanitizes image data
- Server persistence: `src/app/api/logs/route.ts`
- Rotation: Keeps last 10 sessions

**Error Tracking:**
- Console logging only (no Sentry/external service)

**Analytics:**
- None

## CI/CD & Deployment

**Hosting:**
- Local development primary use case
- Compatible with Vercel for production deployment

**CI Pipeline:**
- None configured (no GitHub Actions workflows found)

## Environment Configuration

**Development:**
- Required: `GEMINI_API_KEY`
- Optional: `OPENAI_API_KEY`
- Secrets location: `.env.local` (gitignored)
- Reference: `.env.example`

**Production:**
- Same env vars as development
- No staging environment configured

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## API Timeout Configuration

| Route | Timeout | Purpose |
|-------|---------|---------|
| `/api/generate` | 5 min | Image generation via Gemini |
| `/api/llm` | 1 min | Text generation (Google/OpenAI) |
| `/api/workflow` | Default | Save/load workflow files |
| Other routes | Default | Various operations |

## Request Body Size Limits

- Server Actions body limit: 50MB - `next.config.ts`
- Supports large image payloads in workflows

---

*Integration audit: 2026-01-09*
*Update when adding/removing external services*
