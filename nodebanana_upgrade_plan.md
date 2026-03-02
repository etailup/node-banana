# Headless Workflow Execution API

## Context

Node Banana workflows currently only run in the browser — the user clicks Run, and `executeWorkflow()` in the Zustand store orchestrates everything client-side. There's no way to trigger a workflow from external tools (n8n, Zapier, cron), run batches, or get results via webhook.

This plan adds a **headless execution layer** — new API routes + a server-side engine that can run any workflow JSON programmatically. Outputs are uploaded to R2 (CDN delivery) with metadata in Supabase. Results are POSTed to a callback URL.

**Critical constraint**: All changes are **additive-only** (new files, zero edits to existing files) so upstream `git merge` stays clean.

---

## Image & Variable System

### Workflows as reusable templates

Instead of embedding base64 images, workflows use **URL references** and **named variable slots**:

```json
{
  "nodes": [
    {
      "id": "imageInput-cover",
      "type": "imageInput",
      "data": { "image": null, "imageUrl": "{{cover_image}}" }
    },
    {
      "id": "prompt-style",
      "type": "prompt",
      "data": { "prompt": "{{product_description}}" }
    }
  ]
}
```

At execution time, the API call fills the slots:

```json
{
  "workflowId": "wf_abc123",
  "parameters": {
    "images": { "cover_image": "https://r2.example.com/inputs/product.jpg" },
    "prompts": { "product_description": "A sleek wireless headphone on marble" }
  },
  "callbackUrl": "https://your-server.com/results"
}
```

**Resolution order for images**: `parameters.images[variableName]` → `node.data.imageUrl` (fetch from URL) → `node.data.image` (embedded base64)

**Resolution order for prompts**: `parameters.prompts[variableName]` → `node.data.prompt` (embedded text)

Variable names default to the node ID but can be customized via `node.data.variableName` for cleaner API contracts.

### Image handling at execution time

1. Engine resolves image source (parameter override → URL → base64)
2. If source is a URL → fetch and convert to base64 (the `/api/generate` route expects base64)
3. Generated outputs → upload to R2 → store CDN URL
4. Callback payload contains R2 URLs (not base64) — small payloads, fast delivery

---

## Storage Architecture

### Supabase Tables (new)

**`headless_workflows`** — Stores workflow templates
```sql
CREATE TABLE headless_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  definition JSONB NOT NULL,        -- full WorkflowFile JSON
  variables JSONB DEFAULT '{}',     -- { "cover_image": { type: "image", description: "..." }, ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**`headless_jobs`** — Persists job history across restarts
```sql
CREATE TABLE headless_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES headless_workflows(id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|running|completed|failed|cancelled
  parameters JSONB DEFAULT '{}',
  progress JSONB DEFAULT '{"completed":0,"total":0}',
  outputs JSONB DEFAULT '{}',       -- { "output-1": { "imageUrl": "https://r2.../out.png" } }
  errors JSONB DEFAULT '[]',
  callback_url TEXT,
  callback_delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Cloudflare R2

- **Input images**: Stored in R2 by the user, referenced by URL in workflows or parameters
- **Output images**: Engine uploads generated images to R2, stores CDN URL in `headless_jobs.outputs`
- **Bucket**: New `headless-outputs` bucket (or reuse existing one if preferred)
- **Upload path**: `outputs/{job_id}/{node_id}.png`

### Why both R2 + Supabase?

- **R2**: Fast CDN delivery of images, cheap storage, no egress fees
- **Supabase**: Structured metadata (job history, workflow definitions, variable schemas), queryable, already set up

---

## New Files

### Core Library (`src/lib/headless/`)

| File | Purpose |
|------|---------|
| `types.ts` | All interfaces: `HeadlessExecuteRequest`, `JobRecord`, `ParameterOverrides`, `CallbackPayload`, `WorkflowVariable` |
| `graph.ts` | Pure re-implementation of `groupNodesByLevel` + `getConnectedInputs` (not exported from workflowStore) + `applyOverrides()` + `resolveVariables()` |
| `engine.ts` | `WorkflowEngine` class — executes workflow server-side, calls existing `/api/generate` and `/api/llm` via localhost HTTP |
| `storage.ts` | R2 upload (output images) + Supabase CRUD (workflows, jobs) |
| `callback.ts` | Fires webhook callbacks with retry (reuses `src/utils/fetchWithRetry.ts`) |

### API Routes (`src/app/api/headless/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/headless/execute` | POST | Submit workflow + parameters → returns `{ jobId }` immediately |
| `/api/headless/jobs/[jobId]` | GET | Poll job status, progress, output URLs |
| `/api/headless/webhook` | POST | Incoming trigger for n8n/Zapier/cron with HMAC validation |
| `/api/headless/workflows` | GET, POST | List/create workflow templates in Supabase |
| `/api/headless/workflows/[id]` | GET, PUT, DELETE | CRUD for a specific workflow template |

### Tests

| File | Covers |
|------|--------|
| `src/lib/headless/__tests__/graph.test.ts` | `groupNodesByLevel`, `getConnectedInputs`, `resolveVariables` |
| `src/lib/headless/__tests__/engine.test.ts` | Engine execution with mocked fetch + storage |

---

## Execution Flow

```
External trigger (curl / n8n / cron)
  │
  ▼
POST /api/headless/execute
  ├── Auth: X-API-Key header vs HEADLESS_API_KEY env var
  ├── Load workflow from Supabase (by workflowId) or use inline JSON
  ├── Resolve variables: fill {{slots}} from parameters
  ├── Resolve image URLs: fetch external images → convert to base64
  ├── Create job record in Supabase (status: "pending")
  ├── Return { jobId, status: "pending" } immediately
  │
  └── Background execution:
        ├── groupNodesByLevel(nodes, edges) → dependency levels
        ├── For each level (sequential):
        │     For each batch (parallel, up to maxConcurrency):
        │       - imageInput: use resolved image (base64)
        │       - prompt: use resolved text
        │       - nanoBanana: POST localhost/api/generate → get base64 output
        │       - llmGenerate: POST localhost/api/llm → get text output
        │       - output: collect final image
        │
        ├── Upload output images to R2 → get CDN URLs
        ├── Update job in Supabase (status: "completed", outputs: { URLs })
        └── POST callbackUrl with { jobId, status, outputUrls }
```

**Why internal HTTP calls?** The `/api/generate` route handles all provider routing (Gemini, Replicate, fal, Kie.ai, WaveSpeed), API keys, retries, and response parsing — ~2000 lines. Calling via localhost reuses all of it. HTTP overhead (~1ms) is negligible vs minutes of AI generation.

---

## Environment Variables (all new)

```
HEADLESS_API_KEY=               # Required — auth for /api/headless/* routes
HEADLESS_WEBHOOK_SECRET=        # Optional — HMAC-SHA256 for webhook signing
HEADLESS_MAX_CONCURRENT=5       # Max parallel job executions
HEADLESS_BASE_URL=http://localhost:3000  # For internal API calls

# R2 (for output image uploads)
R2_ACCOUNT_ID=                  # Cloudflare account ID
R2_ACCESS_KEY_ID=               # R2 API token
R2_SECRET_ACCESS_KEY=           # R2 API secret
R2_BUCKET_NAME=headless-outputs
R2_PUBLIC_URL=                  # Public bucket URL for CDN delivery

# Supabase (already configured in project)
SUPABASE_URL=                   # From existing .env
SUPABASE_SERVICE_ROLE_KEY=      # For server-side DB access
```

---

## Node Support (MVP)

| Node Type | Supported | How |
|-----------|-----------|-----|
| `imageInput` | Yes | URL fetch → base64, or parameter override |
| `prompt` | Yes | Template variable resolution, or parameter override |
| `promptConstructor` | Yes | `@variable` template resolution from connected nodes |
| `nanoBanana` | Yes | POST to `/api/generate` |
| `llmGenerate` | Yes | POST to `/api/llm` |
| `output` | Yes | Collect final image → upload to R2 |
| `annotation` | No | Requires browser Canvas — skip with warning |
| `generateVideo` | Future | Same pattern as nanoBanana |
| `splitGrid` | Future | Needs dynamic node spawning |

---

## Security

- **API key auth**: `/api/headless/*` routes require `X-API-Key` header matching `HEADLESS_API_KEY`
- **Webhook HMAC**: Incoming webhooks validated via `X-Webhook-Signature` (HMAC-SHA256)
- **Callback signing**: Outgoing callbacks signed with same secret
- **Concurrency cap**: Max N active jobs to prevent resource exhaustion
- **Supabase RLS**: Jobs table scoped by API key (future multi-tenant support)

---

## Implementation Order

1. `src/lib/headless/types.ts` — all interfaces
2. `src/lib/headless/graph.ts` — pure graph functions + variable resolution
3. `src/lib/headless/storage.ts` — R2 upload + Supabase CRUD for workflows/jobs
4. `src/lib/headless/callback.ts` — webhook callback delivery
5. `src/lib/headless/engine.ts` — core execution engine
6. Supabase migrations — `headless_workflows` + `headless_jobs` tables
7. `src/app/api/headless/execute/route.ts` — main execute endpoint
8. `src/app/api/headless/jobs/[jobId]/route.ts` — job status polling
9. `src/app/api/headless/webhook/route.ts` — incoming webhook trigger
10. `src/app/api/headless/workflows/route.ts` + `[id]/route.ts` — workflow CRUD
11. Tests for graph + engine

---

## Key Reference Files (read-only, not modified)

- `src/store/workflowStore.ts` — `groupNodesByLevel` (line 359), `getConnectedInputs` (line 875)
- `src/app/api/generate/route.ts` — HTTP contract for image/video generation
- `src/app/api/llm/route.ts` — HTTP contract for text generation
- `src/types/nodes.ts` — node data interfaces
- `src/types/workflow.ts` — `WorkflowEdge`, `WorkflowFile`
- `src/utils/fetchWithRetry.ts` — reuse for callback delivery

---

## Verification

1. **Unit tests**: `npm run test:run` — graph utilities + engine with mocked fetch
2. **Manual smoke test**:
   - Start dev server: `npm run dev`
   - Create a workflow template via `POST /api/headless/workflows`
   - Submit execution via `POST /api/headless/execute` with parameter overrides
   - Poll `/api/headless/jobs/:id` until completed
   - Verify output images are in R2 and callback arrives at a test endpoint
3. **Upstream merge test**: `git merge upstream/master` — zero conflicts (no existing files modified)
