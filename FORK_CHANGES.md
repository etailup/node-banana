# Fork Changes: etailup/node-banana

This document tracks all divergences from `shrimbly/node-banana` (upstream). Use it during upstream syncs to predict conflicts and resolve them quickly.

**Last updated:** 2026-03-02

---

## Conflict Risk Tiers

### Tier 1 — High Risk (upstream modifies frequently)

#### `package.json`
- **What:** Added 9 fork deps (Supabase, Stripe, AWS S3, sharp, resend, daisyui, react-email). Moved three.js to devDeps. Changed build script to `next build --webpack`.
- **Why:** SaaS infrastructure, cloud storage, Vercel function size optimization.
- **Resolution:** Accept upstream's version, then run `bash scripts/sync-fork-deps.sh`.

#### `src/store/workflowStore.ts`
- **What:** Added `isCloud` state flag + setter. Thin delegation calls to `cloudExtensions.ts` for save validation, cloud save, auto-save check, hydration guard. Loading state sanitization in `loadWorkflowFile()`, `stopWorkflow()`, `saveWorkflow()`, `saveToFile()`.
- **Why:** Cloud mode (Supabase/R2) vs local filesystem toggle.
- **Resolution:** Accept upstream for the bulk of changes. Re-add the import line for `cloudExtensions`. Re-add `isCloud` state (3 lines). Re-add thin delegation calls (each 1-3 lines). Loading state sanitization is a quality fix that could be upstreamed.

#### `next.config.ts`
- **What:** Security headers, `outputFileTracingExcludes` for Vercel, webpack flag.
- **Why:** Vercel deployment optimization, security hardening.
- **Resolution:** Take ours (superset of upstream config).

#### `src/components/Header.tsx`
- **What:** Custom SVG icon, `HeadlessPublishModal` button, agents button, env-var branding. Removed banana icon img, Willie attribution, Discord link.
- **Why:** SaaS product branding and feature access.
- **Resolution:** Take ours entirely — this file diverges significantly.

---

### Tier 2 — Moderate Risk (upstream occasionally modifies)

#### `src/app/api/save-generation/route.ts`
- **What:** Early-return cloud guard: when `isCloud`, uploads to R2 instead of local filesystem.
- **Why:** Vercel has no persistent filesystem.
- **Resolution:** Keep the cloud guard block at the top; merge upstream changes to the local path below.

#### `src/app/api/workflow/route.ts`
- **What:** Cloud guard: when request has `workflowId` (cloud save), routes to Supabase. Otherwise falls through to local file save.
- **Why:** Dual-mode save (cloud + local).
- **Resolution:** Keep cloud guard block; merge upstream changes to local save path.

#### `src/app/api/load-generation/route.ts`
- **What:** Cloud guard: resolves generation URLs from R2 when cloud.
- **Resolution:** Same pattern — keep cloud guard, merge local path.

#### `src/app/api/generate/route.ts`
- **What:** Added Kie.ai provider integration (models, schemas, defaults, image input keys, non-standard API handling).
- **Why:** Support for Sora, Veo, Kling, and 28 other Kie.ai models.
- **Resolution:** Our Kie additions are at the end of functions — usually no conflict. If upstream refactors the function structure, re-add Kie cases.

#### `src/app/api/models/route.ts`
- **What:** Added `KIE_MODELS` array (31 models) and Kie provider in the response.
- **Resolution:** Our additions are additive (new array + spread into response). Low conflict risk.

#### `src/components/WorkflowCanvas.tsx`
- **What:** Minor — added `HeadlessPublishModal` rendering.
- **Resolution:** Re-add modal import and JSX if conflicted.

#### `src/components/ChatPanel.tsx`
- **What:** Added prompt optimizer integration in chat tools.
- **Resolution:** Additive — re-add if removed by upstream.

#### `src/components/FloatingActionBar.tsx`
- **What:** Added optimizer and quality review buttons.
- **Resolution:** Additive changes, re-add if conflicted.

#### `.env.example`
- **What:** Added Supabase, Stripe, R2, Resend, headless API, and branding env vars.
- **Resolution:** Append our sections after upstream's content.

---

### Tier 3 — Low Risk (rarely modified by upstream)

#### `src/app/layout.tsx`
- **What:** Uses `process.env.NEXT_PUBLIC_APP_NAME || "Node Banana"` for title.
- **Resolution:** Identical to upstream when env var is unset. Zero conflict expected.

#### `src/components/quickstart/QuickstartInitialView.tsx`
- **What:** Same env var pattern for branding.
- **Resolution:** Identical to upstream when env var is unset.

#### `.vercelignore`
- **What:** Broader exclusion rules for Vercel deployment.
- **Resolution:** Take ours (superset).

#### `.gitignore`
- **What:** Added entries for `supabase/`, `.env`, generations.
- **Resolution:** Append our additions.

#### `tsconfig.json`
- **What:** Added `exclude` entries for supabase functions.
- **Resolution:** Take ours (superset).

#### `middleware.ts`
- **What:** New file — Supabase auth middleware.
- **Resolution:** Fork-only file, no conflict.

---

### No Risk — Fork-Only Files (~100 files)

These files exist only in our fork. Upstream never touches them.

**SaaS Infrastructure:**
- `src/lib/supabase/` — client, server, db helpers
- `src/lib/stripe.ts` — Stripe integration
- `src/lib/plans.ts` — pricing plan definitions
- `src/lib/usage.ts` — usage tracking
- `src/lib/rateLimiter.ts` — API rate limiting
- `src/lib/resend.tsx` — email sending
- `src/lib/apiKeys.ts` — API key management
- `src/lib/apiMiddleware.ts` — auth middleware for API routes
- `src/lib/errors.ts` — error types
- `src/lib/env.ts` — environment variable validation
- `src/types/saas.ts` — SaaS type definitions

**Headless API:**
- `src/app/api/headless/` — 6 route files
- `src/lib/headless/` — engine, graph, storage, auth, callback, types
- `src/components/HeadlessPublishModal.tsx`

**AI Agents:**
- `src/app/api/agents/` — 8 route files
- `src/lib/agents/` — optimizer, batch, quality review, storage, types
- `src/components/OptimizerResults.tsx`
- `src/components/QualityDetailModal.tsx`
- `src/components/nodes/QualityBadge.tsx`

**Dashboard:**
- `src/app/(marketing)/` — landing, login, pricing, callback, dashboard
- `src/app/dashboard/` — agents, campaigns, jobs, keys pages
- `src/components/campaigns/` — CSV uploader, variable mapper, progress
- `src/components/marketing/` — header, footer

**Cloud Storage:**
- `src/lib/cloud/editorStorage.ts`
- `src/lib/imageUploader.ts`
- `src/store/cloudExtensions.ts`

**Email Templates:**
- `src/emails/` — Welcome, SubscriptionConfirmed

**Database Migrations:**
- `supabase/migrations/` — 4 migration files

**API Routes (fork-only):**
- `src/app/api/auth/` — delete, signout
- `src/app/api/dashboard/` — jobs, stats
- `src/app/api/editor-workflows/route.ts`
- `src/app/api/env-status/route.ts`
- `src/app/api/keys/route.ts`
- `src/app/api/stripe/` — checkout, portal
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/upload-image/route.ts`
- `src/app/api/workflow-images/route.ts`

**Scripts:**
- `scripts/fork-deps.json`
- `scripts/sync-fork-deps.sh`
- `scripts/rebrand.sh`

---

## Quick Reference: Post-Merge Checklist

After every upstream sync:

1. Resolve conflicts per tier guidance above
2. Run `bash scripts/sync-fork-deps.sh` (handles package.json deps)
3. `npm run build` — verify no import/type errors
4. `npm run test:run` — verify all tests pass
5. Check this file for any new Tier 1/2 files that need manual attention
6. Update this file if new fork changes were added since last sync
