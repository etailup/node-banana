---
title: AI Agents System
type: feat
status: active
date: 2026-02-14
---

# AI Agents System

## Overview

Add 4 AI agents to Node Banana that automate common workflows, optimize output quality, and enable batch content production. Agents operate both in the editor UI (chat panel + dedicated pages) and via the headless API.

| Agent | Core Value | Entry Points |
|-------|-----------|--------------|
| **Workflow Builder** | Lowers barrier to entry — describe what you want, get a workflow | Chat panel, API |
| **Prompt Optimizer** | Improves output quality — test N variations, pick the best | Chat panel, API |
| **Batch Content** | Scales production — process CSV of items through a template | Dashboard page, API |
| **Quality Review** | Reduces manual review — vision LLM scores images automatically | Output nodes, batch pipeline, API |

## Problem Statement

1. **New users can't build workflows** — they stare at a blank canvas not knowing which nodes to use
2. **Prompt iteration is manual** — users run the same workflow 10x tweaking words each time
3. **Batch production is tedious** — an Amazon seller with 50 products runs workflows one-by-one
4. **Quality control requires eyeballing** — no automated way to catch artifacts or off-brand images

## Technical Approach

### Architecture

Agents build on 3 existing systems:

```
┌──────────────────────────────────────────────────────────┐
│  UI Layer                                                │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Chat Panel   │  │ Campaign Mgr │  │ Quality Badge  │  │
│  │ (existing)   │  │ (new page)   │  │ (on output)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
├─────────┼─────────────────┼──────────────────┼───────────┤
│  API Layer                                               │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌───────┴────────┐  │
│  │ /api/agents/  │  │ /api/agents/│  │ /api/agents/   │  │
│  │ build-workflow│  │ batch       │  │ quality-review │  │
│  │ optimize-     │  │             │  │                │  │
│  │ prompt        │  │             │  │                │  │
│  └──────┬───────┘  └──────┬──────┘  └───────┬────────┘  │
├─────────┼─────────────────┼──────────────────┼───────────┤
│  Engine Layer (existing)                                 │
│  ┌──────┴────────────────────────────────────┴────────┐  │
│  │  Headless Engine + Job Lifecycle + R2 Storage       │  │
│  │  (storage.ts, engine.ts, callback.ts)               │  │
│  └────────────────────────┬───────────────────────────┘  │
│                           │                              │
│  ┌────────────────────────┴───────────────────────────┐  │
│  │  Supabase (agent_jobs, campaigns, quality_reviews) │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Key decisions:**
- Same `nb_live_*` API key auth for all agent endpoints
- `{{variable}}` syntax (already implemented in `resolveVariables()`)
- Polling for status updates (consistent with existing job polling pattern)
- Separate `batch_items` table (better queries, resumability)
- Quality review is opt-in per workflow (not always-on)
- Upfront job creation for optimizer (simpler quota checking)

### Database Schema Changes

```sql
-- Parent table for all agent operations
CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL, -- 'workflow_builder' | 'prompt_optimizer' | 'batch' | 'quality_review'
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed | paused
  config JSONB NOT NULL DEFAULT '{}'::jsonb, -- agent-specific configuration
  result JSONB, -- agent-specific output
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Prompt optimizer: stores each variation and its score
CREATE TABLE IF NOT EXISTS public.prompt_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  variation_index INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  headless_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  image_url TEXT,
  scores JSONB, -- { overall: 0.85, prompt_adherence: 0.9, aesthetics: 0.8, ... }
  status TEXT NOT NULL DEFAULT 'pending', -- pending | generating | scoring | completed | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batch campaign: tracks a bulk processing operation
CREATE TABLE IF NOT EXISTS public.batch_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_id UUID NOT NULL REFERENCES headless_workflows(id) ON DELETE CASCADE,
  variable_map JSONB NOT NULL, -- { "productName": "csv_column_1", "imageUrl": "csv_column_3" }
  total_items INTEGER NOT NULL,
  concurrency INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | paused | completed | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batch campaign items: one row per CSV row, enables resume and partial export
CREATE TABLE IF NOT EXISTS public.batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.batch_campaigns(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  row_data JSONB NOT NULL, -- original CSV row
  headless_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | running | completed | failed | skipped
  output_urls JSONB DEFAULT '[]'::jsonb, -- ["https://r2.../output.png"]
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(campaign_id, row_index)
);

-- Quality review scores per image
CREATE TABLE IF NOT EXISTS public.quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_job_id UUID REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  source_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  source_prompt TEXT, -- original prompt for alignment scoring
  scores JSONB NOT NULL, -- { overall, artifacts, text_readability, composition, prompt_alignment }
  grade TEXT NOT NULL, -- A | B | C | F
  passed BOOLEAN NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb, -- ["Slight artifact in top-left", "Text partially cut off"]
  user_override BOOLEAN DEFAULT false, -- user manually approved despite low score
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_jobs_user_status ON agent_jobs(user_id, status);
CREATE INDEX idx_agent_jobs_type ON agent_jobs(agent_type);
CREATE INDEX idx_prompt_variations_job ON prompt_variations(agent_job_id);
CREATE INDEX idx_batch_items_campaign_status ON batch_items(campaign_id, status);
CREATE INDEX idx_quality_reviews_source ON quality_reviews(source_job_id);
CREATE INDEX idx_quality_reviews_user ON quality_reviews(user_id, created_at DESC);
```

### Plan Limits Extension

```typescript
// src/lib/plans.ts — add agent limits
const planLimitsMap = {
  free: {
    // ...existing limits...
    agentOptimizations: 5,       // per month
    agentBatchItems: 50,         // total items per month
    agentBatchConcurrency: 1,    // sequential
    agentQualityReviews: 20,     // per month
  },
  pro: {
    agentOptimizations: 50,
    agentBatchItems: 5000,
    agentBatchConcurrency: 10,
    agentQualityReviews: 500,
  },
  enterprise: {
    agentOptimizations: Infinity,
    agentBatchItems: Infinity,
    agentBatchConcurrency: 50,
    agentQualityReviews: Infinity,
  },
}
```

---

## Implementation Phases

### Phase 1: Agent Foundation + Workflow Builder

**Why first:** Lowest complexity, builds foundation all agents need, highest barrier-to-entry reduction.

#### 1.1 Agent Foundation (`src/lib/agents/`)

Create shared agent infrastructure.

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/agents/types.ts` | Agent types, configs, results |
| Create | `src/lib/agents/storage.ts` | CRUD for `agent_jobs` table |
| Create | `src/lib/agents/limits.ts` | Per-agent usage limit checks |
| Modify | `src/lib/plans.ts` | Add agent limit fields to `PlanLimits` |
| Modify | `src/types/saas.ts` | Extend `PlanLimits` type |
| Create | `supabase/migrations/20260215_agent_tables.sql` | Agent schema from above |

**`src/lib/agents/types.ts`:**

```typescript
export type AgentType = 'workflow_builder' | 'prompt_optimizer' | 'batch' | 'quality_review'

export type AgentJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'

export interface AgentJob {
  id: string
  user_id: string
  agent_type: AgentType
  status: AgentJobStatus
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface CreateAgentJobParams {
  userId: string
  agentType: AgentType
  config: Record<string, unknown>
}
```

**`src/lib/agents/storage.ts`:**

```typescript
export async function createAgentJob(params: CreateAgentJobParams): Promise<AgentJob>
export async function getAgentJob(id: string): Promise<AgentJob | null>
export async function updateAgentJob(id: string, updates: Partial<AgentJob>): Promise<void>
export async function listAgentJobs(userId: string, type?: AgentType): Promise<AgentJob[]>
```

**`src/lib/agents/limits.ts`:**

```typescript
export async function checkAgentLimits(
  userId: string,
  agentType: AgentType,
  planId: string,
  quantity?: number
): Promise<{ allowed: boolean; current: number; limit: number }>
```

#### 1.2 Workflow Builder Agent

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/agents/workflowBuilder.ts` | Builder logic + LLM tool definitions |
| Create | `src/app/api/agents/build-workflow/route.ts` | Headless API endpoint |
| Modify | `src/lib/chat/tools.ts` | Enhance `createWorkflow` tool with builder agent |
| Modify | `src/components/ChatPanel.tsx` | Add `/build` command hint + UX polish |

**How it works:**

The existing `createWorkflow` tool in `tools.ts` already does basic workflow creation from chat. The Workflow Builder agent enhances this with:

1. **Smarter system prompt** — includes knowledge of all node types, connection rules, common workflow patterns (carousel, A/B test, batch generation)
2. **Multi-step creation** — uses the existing `stepCountIs(3)` limit but plans first, then creates
3. **Validation** — after creating nodes/edges, validates the workflow is executable via `validateWorkflow()` from the store
4. **Auto-layout** — positions nodes in a left-to-right flow with consistent spacing

**Chat panel UX changes:**
- Add autocomplete for `/build` command
- When agent creates a workflow, show a confirmation bar: "Agent created 5 nodes. [Accept] [Undo]"
- Use existing `captureSnapshot()` / `revertToSnapshot()` for undo

**API endpoint (`POST /api/agents/build-workflow`):**

```typescript
// Request
{
  "description": "Create a product carousel with 5 variations using different backgrounds",
  "model": "gemini-3-flash-preview" // optional, defaults to flash
}

// Response
{
  "agentJobId": "uuid",
  "workflow": { nodes: [...], edges: [...] },
  "variables": { "productImage": { type: "image" }, "productName": { type: "text" } }
}
```

This is synchronous (no polling needed) — the LLM returns the workflow definition directly.

**Layout algorithm:**

```typescript
// Simple left-to-right layout
function autoLayoutNodes(nodes: WorkflowNodeJSON[], edges: WorkflowEdgeJSON[]) {
  const levels = groupNodesByLevel(nodes, edges) // existing function
  const X_GAP = 280 // node width + padding
  const Y_GAP = 120
  let x = 100

  for (const level of levels) {
    const startY = -(level.length - 1) * Y_GAP / 2
    level.forEach((node, i) => {
      node.position = { x, y: startY + i * Y_GAP }
    })
    x += X_GAP
  }
}
```

#### 1.3 Agent Dashboard Page

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/dashboard/agents/page.tsx` | Agent jobs list page |
| Create | `src/app/api/agents/route.ts` | List agent jobs for dashboard |

Simple table view of all agent jobs (type, status, created_at, link to result). Reuses existing dashboard layout patterns from `/dashboard/jobs`.

---

### Phase 2: Prompt Optimizer

**Why second:** Medium complexity, builds on Phase 1 foundation, high user value.

#### 2.1 Optimizer Core

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/agents/promptOptimizer.ts` | Variation generation + scoring logic |
| Create | `src/app/api/agents/optimize-prompt/route.ts` | Start optimization |
| Create | `src/app/api/agents/optimize-prompt/[jobId]/route.ts` | Poll status + results |

**How it works:**

```
1. User provides: base prompt + optional reference image + count (default: 5)
2. LLM generates N prompt variations (creative rewrites, not rule-based)
3. For each variation:
   a. Create headless job with the variation as prompt
   b. Execute workflow (image generation)
   c. Wait for completion
4. After all generations complete:
   a. Vision LLM scores each image (prompt adherence, aesthetics, artifacts)
   b. Rank by overall score
5. Return ranked results: [{prompt, score, imageUrl, breakdown}]
```

**Variation generation prompt:**

```
You are an expert prompt engineer for AI image generation.
Given this base prompt, generate {count} creative variations that explore
different angles while maintaining the core intent.

Base prompt: "{basePrompt}"
{referenceImage ? "Reference image is attached for style/content guidance." : ""}

Return a JSON array of {count} prompt strings. Each should:
- Maintain the core subject/intent
- Vary style descriptors, composition, lighting, or mood
- Be self-contained (no references to other variations)
```

**Scoring rubric (vision LLM prompt):**

```
Score this AI-generated image on a scale of 0.0 to 1.0 for each dimension:

1. prompt_adherence: Does the image match the prompt "{prompt}"?
2. aesthetics: Is the image visually appealing? Good composition, lighting, color?
3. artifacts: Are there visual artifacts, distortions, or anomalies? (1.0 = no artifacts)
4. coherence: Is the image internally consistent? No anatomical errors, impossible physics?

{referenceImage ? "5. reference_similarity: How similar is this to the reference image in style/content?" : ""}

Return JSON: { prompt_adherence: 0.X, aesthetics: 0.X, artifacts: 0.X, coherence: 0.X, overall: 0.X }
```

**Cost estimation before execution:**

```typescript
function estimateOptimizerCost(count: number, model: string): { generations: number, llmCalls: number, estimatedCost: string } {
  const genCost = getModelCost(model) * count
  const scoreCost = 0.01 * count // vision LLM scoring per image
  const variationCost = 0.005 // one LLM call to generate variations
  return {
    generations: count,
    llmCalls: count + 1,
    estimatedCost: `$${(genCost + scoreCost + variationCost).toFixed(2)}`
  }
}
```

#### 2.2 Optimizer UI

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/components/ChatPanel.tsx` | Add `/optimize` command |
| Create | `src/components/OptimizerResults.tsx` | Results gallery with scores |

**Chat panel integration:**

User selects a prompt node → opens chat → types `/optimize` or "optimize this prompt" → agent detects selected prompt node → runs optimization → shows results in `OptimizerResults` component.

**OptimizerResults component:**

```
┌──────────────────────────────────────────────────┐
│ Prompt Optimizer Results        [Apply Best] [×] │
├──────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │ img1    │ │ img2    │ │ img3    │ │ img4    ││
│ │         │ │         │ │         │ │         ││
│ │  ★ 92%  │ │  87%    │ │  83%    │ │  71%    ││
│ └────┬────┘ └─────────┘ └─────────┘ └─────────┘│
│ Prompt: "A crimson sports car on a winding..."   │
│ Adherence: 95%  Aesthetics: 90%  Artifacts: 92% │
│                            [Apply This Prompt]   │
└──────────────────────────────────────────────────┘
```

- Gallery grid of all variations, sorted by score
- Click an image to see detailed scores + full prompt
- "Apply This Prompt" replaces the selected prompt node's text
- "Apply Best" auto-applies the #1 result

---

### Phase 3: Batch Content Agent

**Why third:** Highest complexity, biggest revenue driver (Pro/Enterprise), needs Phase 1 foundation.

#### 3.1 Batch Engine

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/agents/batchEngine.ts` | Campaign orchestration loop |
| Create | `src/lib/agents/batchStorage.ts` | CRUD for campaigns + items |
| Create | `src/app/api/agents/batch/route.ts` | Create campaign |
| Create | `src/app/api/agents/batch/[campaignId]/route.ts` | Poll status |
| Create | `src/app/api/agents/batch/[campaignId]/outputs/route.ts` | Download outputs |

**How it works:**

```
1. User provides: workflow template ID + CSV data + variable mapping
2. System validates:
   - Template exists and has {{variables}}
   - CSV columns map to all required variables
   - User has sufficient quota (plan limit check for total items)
3. Creates campaign record + batch_items rows (one per CSV row)
4. Orchestration loop:
   a. Pick next `pending` items up to concurrency limit
   b. For each: resolve variables → submit to headless engine
   c. Poll headless jobs for completion
   d. Update batch_item status + output URLs
   e. If quota exhausted mid-batch → pause campaign
   f. If item fails → mark failed, increment retry_count
5. When all items processed → mark campaign completed
6. Fire callback webhook if configured
```

**API endpoints:**

```typescript
// POST /api/agents/batch — Create campaign
{
  "name": "Product Carousel Q1",
  "workflowId": "uuid",
  "data": [
    { "productName": "Widget A", "imageUrl": "https://..." },
    { "productName": "Widget B", "imageUrl": "https://..." }
  ],
  "variableMap": {
    "productName": "productName",  // variable → data field
    "productImage": "imageUrl"
  },
  "concurrency": 5,  // optional, capped by plan
  "callbackUrl": "https://..."  // optional
}

// Response: { campaignId, agentJobId, totalItems, status: "pending" }

// GET /api/agents/batch/:campaignId
// Response: { campaign, items: [{rowIndex, status, outputUrls, error}], progress: {completed, failed, total} }

// GET /api/agents/batch/:campaignId/outputs?status=completed
// Response: { outputs: [{rowIndex, rowData, urls: [...]}] }
// Or with Accept: application/zip → returns ZIP file
```

**Resume/pause:**

```typescript
// PATCH /api/agents/batch/:campaignId
{ "action": "pause" | "resume" | "cancel" | "retry_failed" }
```

`retry_failed` resets all `failed` items with `retry_count < 3` back to `pending` and resumes.

#### 3.2 Campaign Manager UI

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/app/dashboard/campaigns/page.tsx` | Campaign list |
| Create | `src/app/dashboard/campaigns/[id]/page.tsx` | Campaign detail + progress |
| Create | `src/app/dashboard/campaigns/new/page.tsx` | Create campaign wizard |
| Create | `src/components/campaigns/CampaignProgress.tsx` | Progress bar + stats |
| Create | `src/components/campaigns/CampaignItemsTable.tsx` | Items with status/output |
| Create | `src/components/campaigns/VariableMapper.tsx` | Map CSV columns → variables |
| Create | `src/components/campaigns/CsvUploader.tsx` | CSV upload + preview |

**Campaign wizard flow (3 steps):**

```
Step 1: Select Template
┌────────────────────────────────────────┐
│ Select Workflow Template               │
│ ┌──────────────────────────────────┐   │
│ │ 🔄 Product Carousel (5 vars)    │   │
│ │ 🖼️ Hero Image Generator (3 vars)│   │
│ │ 📸 A+ Content Pack (7 vars)     │   │
│ └──────────────────────────────────┘   │
│ Variables detected: productName,       │
│ productImage, backgroundColor          │
│                          [Next →]      │
└────────────────────────────────────────┘

Step 2: Upload Data + Map Variables
┌────────────────────────────────────────┐
│ Upload CSV     [Choose File] [Preview] │
│                                        │
│ Variable Mapping:                      │
│ {{productName}}  → [CSV: product_name▼]│
│ {{productImage}} → [CSV: image_url   ▼]│
│ {{bgColor}}      → [CSV: color       ▼]│
│                                        │
│ Preview (row 1):                       │
│ productName = "Widget A"               │
│ productImage = "https://cdn.../a.jpg"  │
│                          [Next →]      │
└────────────────────────────────────────┘

Step 3: Configure + Launch
┌────────────────────────────────────────┐
│ Campaign: Product Carousel Q1          │
│ Items: 47  |  Template: Product Carousel│
│                                        │
│ Concurrency: [5 ▼] (max 10 on Pro)    │
│ □ Auto quality review (costs ~$0.47)   │
│ □ Webhook callback URL: [________]     │
│                                        │
│ Estimated cost: ~$4.70                 │
│ (47 generations × nano-banana)         │
│                                        │
│              [Cancel]  [🚀 Launch]     │
└────────────────────────────────────────┘
```

**Campaign detail page:**

```
┌────────────────────────────────────────────────┐
│ Product Carousel Q1           [Pause] [Cancel] │
│ ████████████████████░░░░░ 38/47 (81%)         │
│ ✅ 35 completed  ⏳ 3 running  ❌ 2 failed     │
│                                                │
│ [Download Completed (35)] [Retry Failed (2)]   │
├────────────────────────────────────────────────┤
│ # │ Product    │ Status    │ Output  │ Score   │
│ 1 │ Widget A   │ ✅ Done   │ [View]  │ A (94%) │
│ 2 │ Widget B   │ ✅ Done   │ [View]  │ B (82%) │
│ 3 │ Widget C   │ ⏳ Running│ —       │ —       │
│ 4 │ Widget D   │ ❌ Failed │ —       │ [Retry] │
│...│ ...        │ ...       │ ...     │ ...     │
└────────────────────────────────────────────────┘
```

Polling interval: 5 seconds while campaign is `running`, stops when `completed`/`failed`/`paused`.

---

### Phase 4: Quality Review Agent

**Why last:** Depends on Phase 1 foundation, can integrate with batch (Phase 3), lower standalone urgency.

#### 4.1 Quality Review Core

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/agents/qualityReview.ts` | Vision LLM scoring logic |
| Create | `src/lib/agents/qualityStorage.ts` | CRUD for quality_reviews |
| Create | `src/app/api/agents/quality-review/route.ts` | Submit images for review |
| Create | `src/app/api/agents/quality-review/[reviewId]/route.ts` | Get review results |

**How it works:**

```
1. Receives: image URL(s) + optional source prompt + optional brand guidelines
2. For each image:
   a. Call vision LLM with scoring rubric prompt
   b. Parse scores: { artifacts, text_readability, composition, prompt_alignment, overall }
   c. Assign grade: A (≥0.85), B (≥0.70), C (≥0.50), F (<0.50)
   d. Determine passed = overall ≥ threshold (default 0.70)
   e. Extract specific issues as strings
3. Store results in quality_reviews table
4. Return scores + grade + issues
```

**Vision scoring prompt:**

```typescript
const SCORING_PROMPT = `You are an image quality analyst. Score this AI-generated image.

Scoring dimensions (0.0 to 1.0):
- artifacts: Visual defects, distortions, floating elements, unnatural textures. 1.0 = flawless.
- text_readability: If text is present, is it legible and properly rendered? If no text, score 1.0.
- composition: Balance, focal point, rule-of-thirds, visual hierarchy. 1.0 = excellent composition.
- prompt_alignment: How well does the image match this prompt: "{prompt}". 1.0 = perfect match.
- overall: Weighted average reflecting overall quality.

{brandGuidelines ? `Brand guidelines to check against:\n${brandGuidelines}` : ''}

Respond with JSON:
{
  "scores": { "artifacts": 0.X, "text_readability": 0.X, "composition": 0.X, "prompt_alignment": 0.X, "overall": 0.X },
  "issues": ["description of issue 1", "description of issue 2"],
  "suggestion": "brief suggestion to improve this image"
}`
```

**API endpoint:**

```typescript
// POST /api/agents/quality-review
{
  "images": [
    { "url": "https://r2.../output.png", "prompt": "A red car on a mountain road" }
  ],
  "brandGuidelines": "Use warm tones, no blue backgrounds", // optional
  "threshold": 0.70 // optional, default 0.70
}

// Response
{
  "reviews": [
    {
      "id": "uuid",
      "imageUrl": "https://...",
      "grade": "B",
      "passed": true,
      "scores": { "artifacts": 0.95, "text_readability": 1.0, "composition": 0.75, "prompt_alignment": 0.80, "overall": 0.82 },
      "issues": ["Slightly unbalanced composition — subject too far left"],
      "suggestion": "Add 'centered composition' to prompt"
    }
  ]
}
```

#### 4.2 Quality Review UI

**Files:**

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/nodes/QualityBadge.tsx` | Score badge overlay on output nodes |
| Modify | `src/components/nodes/OutputNode.tsx` | Add badge + review trigger |
| Create | `src/components/QualityDetailModal.tsx` | Detailed score breakdown |
| Modify | `src/app/dashboard/campaigns/[id]/page.tsx` | Add quality column to batch items |

**Quality badge on output nodes:**

```
┌──────────────────────────┐
│ Output                   │
│ ┌──────────────────────┐ │
│ │                  [A] │ │  ← green badge (A), yellow (B), orange (C), red (F)
│ │   [generated img]    │ │
│ │                      │ │
│ └──────────────────────┘ │
│ [Review] [Regenerate]    │
└──────────────────────────┘
```

Click badge → opens `QualityDetailModal`:

```
┌──────────────────────────────────────────┐
│ Quality Review                       [×] │
├──────────────────────────────────────────┤
│ Overall: B (82%)                         │
│                                          │
│ Artifacts:        ████████████████░░ 95% │
│ Text Readability: ████████████████████ 100%│
│ Composition:      ██████████████░░░░ 75% │
│ Prompt Alignment: ████████████████░░ 80% │
│                                          │
│ Issues:                                  │
│ • Slightly unbalanced composition        │
│                                          │
│ Suggestion: Add "centered composition"   │
│                                          │
│ [Accept Anyway] [Regenerate with Fix]    │
└──────────────────────────────────────────┘
```

"Regenerate with Fix" appends the suggestion to the prompt and re-runs the generation node.

#### 4.3 Batch Integration

When creating a batch campaign, users can check "Auto quality review". This adds a post-processing step:

```
For each completed batch item:
  1. Get output image URL
  2. Submit to quality review agent
  3. Store score in quality_reviews table
  4. If score < threshold → mark item as failed, add to retry queue
  5. Update batch_items table with quality score
```

This uses the batch campaign's callback mechanism — when a headless job completes, the batch engine checks if quality review is enabled and submits the output for scoring before marking the item as `completed`.

---

## Files Modified/Created Summary

| Phase | Action | File |
|-------|--------|------|
| 1 | Create | `supabase/migrations/20260215_agent_tables.sql` |
| 1 | Create | `src/lib/agents/types.ts` |
| 1 | Create | `src/lib/agents/storage.ts` |
| 1 | Create | `src/lib/agents/limits.ts` |
| 1 | Create | `src/lib/agents/workflowBuilder.ts` |
| 1 | Create | `src/app/api/agents/build-workflow/route.ts` |
| 1 | Create | `src/app/api/agents/route.ts` |
| 1 | Create | `src/app/dashboard/agents/page.tsx` |
| 1 | Modify | `src/lib/chat/tools.ts` |
| 1 | Modify | `src/components/ChatPanel.tsx` |
| 1 | Modify | `src/lib/plans.ts` |
| 1 | Modify | `src/types/saas.ts` |
| 2 | Create | `src/lib/agents/promptOptimizer.ts` |
| 2 | Create | `src/app/api/agents/optimize-prompt/route.ts` |
| 2 | Create | `src/app/api/agents/optimize-prompt/[jobId]/route.ts` |
| 2 | Create | `src/components/OptimizerResults.tsx` |
| 2 | Modify | `src/components/ChatPanel.tsx` |
| 3 | Create | `src/lib/agents/batchEngine.ts` |
| 3 | Create | `src/lib/agents/batchStorage.ts` |
| 3 | Create | `src/app/api/agents/batch/route.ts` |
| 3 | Create | `src/app/api/agents/batch/[campaignId]/route.ts` |
| 3 | Create | `src/app/api/agents/batch/[campaignId]/outputs/route.ts` |
| 3 | Create | `src/app/dashboard/campaigns/page.tsx` |
| 3 | Create | `src/app/dashboard/campaigns/[id]/page.tsx` |
| 3 | Create | `src/app/dashboard/campaigns/new/page.tsx` |
| 3 | Create | `src/components/campaigns/CampaignProgress.tsx` |
| 3 | Create | `src/components/campaigns/CampaignItemsTable.tsx` |
| 3 | Create | `src/components/campaigns/VariableMapper.tsx` |
| 3 | Create | `src/components/campaigns/CsvUploader.tsx` |
| 4 | Create | `src/lib/agents/qualityReview.ts` |
| 4 | Create | `src/lib/agents/qualityStorage.ts` |
| 4 | Create | `src/app/api/agents/quality-review/route.ts` |
| 4 | Create | `src/app/api/agents/quality-review/[reviewId]/route.ts` |
| 4 | Create | `src/components/nodes/QualityBadge.tsx` |
| 4 | Create | `src/components/QualityDetailModal.tsx` |
| 4 | Modify | `src/components/nodes/OutputNode.tsx` |
| 4 | Modify | `src/app/dashboard/campaigns/[id]/page.tsx` |

## Acceptance Criteria

### Phase 1 — Agent Foundation + Workflow Builder
- [x] `agent_jobs` table exists with RLS policies
- [x] Agent usage limits enforced per plan tier
- [ ] User types "build a carousel workflow with 3 variations" in chat → nodes appear on canvas
- [ ] Created workflow passes `validateWorkflow()` — all connections are valid
- [ ] Undo button reverts agent-created workflow (snapshot/revert)
- [x] `POST /api/agents/build-workflow` returns valid workflow JSON
- [x] Agent jobs page at `/dashboard/agents` shows history
- [x] `npm run build` succeeds

### Phase 2 — Prompt Optimizer
- [ ] User selects prompt node → types `/optimize` → sees cost estimate → confirms
- [x] 5 prompt variations generated and executed via headless engine
- [x] Vision LLM scores all outputs, ranked by overall score
- [x] OptimizerResults gallery shows images + scores + prompts
- [x] "Apply Best" replaces prompt node text with winning prompt
- [x] `POST /api/agents/optimize-prompt` starts async optimization, returns jobId
- [x] `GET /api/agents/optimize-prompt/:jobId` returns ranked results when complete
- [x] Partial failures handled — if 3/5 succeed, show those 3

### Phase 3 — Batch Content
- [x] Campaign wizard: select template → upload CSV → map variables → configure → launch
- [x] Campaign detail page shows live progress with 5s polling
- [x] Pause/resume/cancel work correctly
- [x] "Download Completed" exports available outputs even if campaign is still running
- [x] "Retry Failed" requeues failed items (max 3 retries)
- [ ] Quota exceeded mid-batch → campaign pauses with clear message
- [x] `POST /api/agents/batch` creates campaign via API
- [x] CSV validation: rejects malformed data before campaign starts
- [x] Concurrency respects plan limits

### Phase 4 — Quality Review
- [x] Quality badge appears on output nodes after generation (when enabled)
- [x] Click badge → detailed score breakdown modal
- [ ] "Regenerate with Fix" appends suggestion to prompt and re-runs
- [x] "Accept Anyway" overrides low score (stored as `user_override`)
- [ ] Batch integration: auto-review enabled → failed images auto-retry
- [x] `POST /api/agents/quality-review` scores images via API
- [x] Scoring rubric produces consistent, useful results across image types

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Workflow Builder adoption | 30% of new users use builder in first session | `agent_jobs WHERE agent_type = 'workflow_builder'` / new signups |
| Optimizer improves quality | Average 15% score improvement over base prompt | Compare base vs best variation scores |
| Batch campaign completion rate | >95% of items succeed | `completed / total` across campaigns |
| Quality review accuracy | <10% false positive rate on grade F | User override rate on F-graded images |
| Pro plan conversion | 20% lift in Free→Pro upgrades | Stripe checkout events before/after launch |

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vision LLM scoring inconsistency | Quality grades unreliable | Hardcode rubric with concrete examples; add user override |
| Batch campaign costs exceed expectations | Bill shock, churn | Mandatory cost estimate + confirmation before launch |
| Headless engine bottleneck under batch load | Slow campaigns, timeouts | Per-campaign concurrency caps, queue system if needed |
| Workflow builder creates invalid graphs | User frustration | Post-creation validation + auto-fix pass |
| Agent API abuse (free tier spam) | Infrastructure costs | Strict per-agent quotas + rate limiting |

## References

### Internal
- Chat tools infrastructure: `src/lib/chat/tools.ts`
- Edit operations: `src/lib/chat/editOperations.ts`
- Context builder: `src/lib/chat/contextBuilder.ts`
- Headless engine: `src/lib/headless/engine.ts`
- Job lifecycle types: `src/lib/headless/types.ts`
- Variable resolution: `src/lib/headless/graph.ts` (`resolveVariables()`)
- Usage tracking: `src/lib/usage.ts`
- Plan limits: `src/lib/plans.ts`
- SaaS migration: `supabase/migrations/20260214_saas_tables.sql`
- Store: `src/store/workflowStore.ts` (snapshot/revert for undo)

### Existing Plans
- `docs/plans/2026-02-05-feat-amazon-aplus-content-generator-workflow-plan.md` — related batch content use case
