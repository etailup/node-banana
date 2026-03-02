/**
 * POST /api/agents/build-workflow
 *
 * Generate a workflow from a natural language description.
 * Uses LLM to create node graph, validates and auto-layouts.
 * Auth: API key (headless) or session (dashboard).
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { buildWorkflow } from "@/lib/agents/workflowBuilder"
import { createAgentJob, updateAgentJob } from "@/lib/agents/storage"
import { checkAgentLimits } from "@/lib/agents/limits"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanByPriceId } from "@/lib/plans"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Auth
  const { error: authError, auth } = await validateApiKey(request)
  if (authError) return authError

  // Parse body
  let body: { description?: string; model?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.description || typeof body.description !== "string" || body.description.trim().length === 0) {
    return NextResponse.json({ error: "description is required" }, { status: 400 })
  }

  // Usage limit check
  if (auth.userId) {
    const subscription = await getSubscription(auth.userId)
    const priceId = subscription?.stripe_price_id ?? null
    const plan = getPlanByPriceId(priceId)
    const planId = plan?.id ?? "free"

    const limits = await checkAgentLimits(auth.userId, "workflow_builder", planId)
    if (!limits.allowed) {
      return NextResponse.json(
        { error: `Monthly workflow builder limit reached (${limits.current}/${limits.limit}). Upgrade your plan.` },
        { status: 429 }
      )
    }
  }

  try {
    // Create agent job record
    const agentJob = auth.userId
      ? await createAgentJob({
          userId: auth.userId,
          agentType: "workflow_builder",
          config: { description: body.description, model: body.model },
        })
      : null

    if (agentJob) {
      await updateAgentJob(agentJob.id, {
        status: "running",
        started_at: new Date().toISOString(),
      })
    }

    // Build workflow
    const result = await buildWorkflow(body.description, body.model)

    // Update job with result
    if (agentJob) {
      await updateAgentJob(agentJob.id, {
        status: "completed",
        result: {
          nodeCount: result.workflow.nodes.length,
          edgeCount: result.workflow.edges.length,
          variables: result.variables,
        },
        completed_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      agentJobId: agentJob?.id ?? null,
      workflow: result.workflow,
      variables: result.variables,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
