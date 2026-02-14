/**
 * POST /api/agents/batch
 *
 * Create a batch campaign. Validates template, data, and quotas.
 * Returns campaign ID — poll status endpoint for progress.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { createAgentJob, updateAgentJob } from "@/lib/agents/storage"
import { checkAgentLimits } from "@/lib/agents/limits"
import { createCampaign, createBatchItems } from "@/lib/agents/batchStorage"
import { runBatchCampaign } from "@/lib/agents/batchEngine"
import { getWorkflow } from "@/lib/headless/storage"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanByPriceId, getPlanLimits } from "@/lib/plans"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Auth
  const { error: authError, auth } = await validateApiKey(request)
  if (authError) return authError

  if (!auth.userId) {
    return NextResponse.json({ error: "User authentication required for batch operations" }, { status: 401 })
  }

  // Parse body
  let body: {
    name?: string
    workflowId?: string
    data?: Record<string, unknown>[]
    variableMap?: Record<string, string>
    concurrency?: number
    callbackUrl?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate required fields
  if (!body.name || !body.workflowId || !body.data || !body.variableMap) {
    return NextResponse.json(
      { error: "Required: name, workflowId, data (array), variableMap" },
      { status: 400 }
    )
  }

  if (!Array.isArray(body.data) || body.data.length === 0) {
    return NextResponse.json({ error: "data must be a non-empty array" }, { status: 400 })
  }

  // Validate workflow exists
  const workflow = await getWorkflow(body.workflowId)
  if (!workflow) {
    return NextResponse.json({ error: `Workflow not found: ${body.workflowId}` }, { status: 404 })
  }

  // Plan limits
  const subscription = await getSubscription(auth.userId)
  const priceId = subscription?.stripe_price_id ?? null
  const plan = getPlanByPriceId(priceId)
  const planId = plan?.id ?? "free"
  const limits = getPlanLimits(planId)

  // Check batch items quota
  const itemLimits = await checkAgentLimits(auth.userId, "batch", planId, body.data.length)
  if (!itemLimits.allowed) {
    return NextResponse.json(
      { error: `Batch item limit exceeded (${itemLimits.current + body.data.length}/${itemLimits.limit}). Upgrade your plan.` },
      { status: 429 }
    )
  }

  // Cap concurrency to plan limit
  const concurrency = Math.min(body.concurrency || 5, limits.agentBatchConcurrency)

  try {
    // Create agent job
    const agentJob = await createAgentJob({
      userId: auth.userId,
      agentType: "batch",
      config: {
        name: body.name,
        workflowId: body.workflowId,
        totalItems: body.data.length,
        concurrency,
      },
    })

    // Create campaign
    const campaign = await createCampaign({
      userId: auth.userId,
      agentJobId: agentJob.id,
      name: body.name,
      workflowId: body.workflowId,
      variableMap: body.variableMap,
      totalItems: body.data.length,
      concurrency,
    })

    // Create batch items
    await createBatchItems(campaign.id, body.data)

    // Run campaign in background
    runBatchCampaign({
      campaignId: campaign.id,
      agentJobId: agentJob.id,
      callbackUrl: body.callbackUrl,
    }).catch(async (err) => {
      console.error("Batch campaign error:", err)
      await updateAgentJob(agentJob.id, {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
    })

    return NextResponse.json(
      {
        campaignId: campaign.id,
        agentJobId: agentJob.id,
        totalItems: body.data.length,
        status: "pending",
      },
      { status: 202 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
