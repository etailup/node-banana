/**
 * POST /api/headless/webhook
 *
 * Incoming webhook trigger for n8n/Zapier/cron.
 * Validates HMAC-SHA256 signature, then forwards to the execute endpoint logic.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { executeWorkflow } from "@/lib/headless/engine";
import { getWorkflow, countRunningJobs } from "@/lib/headless/storage";
import type { HeadlessExecuteRequest, ExecuteResponse } from "@/lib/headless/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function validateHmac(body: string, signature: string | null): boolean {
  const secret = process.env.HEADLESS_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip validation (development mode)
    return true;
  }

  if (!signature) return false;

  // Expect format: "sha256=<hex>"
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // HMAC validation
  const signature = request.headers.get("X-Webhook-Signature");
  if (!validateHmac(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  // Parse body
  let body: HeadlessExecuteRequest;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

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
      { error: `Too many running jobs (${running}/${maxConcurrent})` },
      { status: 429 },
    );
  }

  // Resolve workflow
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

  try {
    const jobId = await executeWorkflow(
      workflowDef,
      body.parameters,
      body.callbackUrl,
      storedWorkflowId,
      { maxConcurrency: body.maxConcurrency },
    );

    const response: ExecuteResponse = { jobId, status: "pending" };
    return NextResponse.json(response, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
