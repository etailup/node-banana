/**
 * POST /api/headless/execute
 *
 * Submit a workflow for headless execution.
 * Returns { jobId, status: "pending" } immediately.
 * Execution runs in the background.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/headless/auth";
import { executeWorkflow } from "@/lib/headless/engine";
import { getWorkflow, countRunningJobs } from "@/lib/headless/storage";
import { checkUsageLimits, incrementUsage } from "@/lib/usage";
import { getSubscription } from "@/lib/supabase/db";
import { getPlanByPriceId } from "@/lib/plans";
import type { HeadlessExecuteRequest, ExecuteResponse } from "@/lib/headless/types";

export const maxDuration = 300; // 5 min (Vercel)
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth
  const { error: authError, auth } = await validateApiKey(request);
  if (authError) return authError;

  // Usage limit enforcement for user-authenticated requests
  if (auth.userId) {
    const subscription = await getSubscription(auth.userId);
    const priceId = subscription?.stripe_price_id ?? null;
    const plan = getPlanByPriceId(priceId);
    const planId = plan?.id ?? "free";

    const usage = await checkUsageLimits(auth.userId, planId);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Monthly usage limit reached (${usage.current}/${usage.limit}). Upgrade your plan for more runs.`,
        },
        { status: 429 },
      );
    }
  }

  // Parse body
  let body: HeadlessExecuteRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate: need either workflowId or inline workflow
  if (!body.workflowId && !body.workflow) {
    return NextResponse.json(
      { error: "Provide either workflowId or workflow (inline JSON)" },
      { status: 400 },
    );
  }

  // Concurrency check
  const maxConcurrent = parseInt(process.env.HEADLESS_MAX_CONCURRENT || "5", 10);
  const running = await countRunningJobs();
  if (running >= maxConcurrent) {
    return NextResponse.json(
      { error: `Too many running jobs (${running}/${maxConcurrent}). Try again later.` },
      { status: 429 },
    );
  }

  // Resolve workflow definition
  let workflowDef = body.workflow;
  let storedWorkflowId = body.workflowId;

  if (body.workflowId && !body.workflow) {
    const stored = await getWorkflow(body.workflowId);
    if (!stored) {
      return NextResponse.json(
        { error: `Workflow not found: ${body.workflowId}` },
        { status: 404 },
      );
    }
    workflowDef = stored.definition;
    storedWorkflowId = stored.id;
  }

  if (!workflowDef) {
    return NextResponse.json({ error: "No workflow definition resolved" }, { status: 400 });
  }

  // Execute (returns immediately with jobId)
  try {
    const jobId = await executeWorkflow(
      workflowDef,
      body.parameters,
      body.callbackUrl,
      storedWorkflowId,
      { maxConcurrency: body.maxConcurrency, userId: auth.userId },
    );

    // Increment usage for user-authenticated requests
    if (auth.userId) {
      incrementUsage(auth.userId).catch((err) =>
        console.error("Failed to increment usage:", err)
      );
    }

    const response: ExecuteResponse = { jobId, status: "pending" };
    return NextResponse.json(response, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
