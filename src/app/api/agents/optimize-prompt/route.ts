/**
 * POST /api/agents/optimize-prompt
 *
 * Start a prompt optimization job. Generates N variations,
 * executes each, and scores with vision LLM.
 * Returns immediately with jobId — poll status endpoint for results.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { createAgentJob, updateAgentJob } from "@/lib/agents/storage"
import { checkAgentLimits } from "@/lib/agents/limits"
import { runOptimization, estimateOptimizerCost } from "@/lib/agents/promptOptimizer"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanByPriceId } from "@/lib/plans"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Auth
  const { error: authError, auth } = await validateApiKey(request)
  if (authError) return authError

  // Parse body
  let body: {
    basePrompt?: string
    count?: number
    model?: string
    referenceImage?: string
    workflowId?: string
    aspectRatio?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.basePrompt || typeof body.basePrompt !== "string") {
    return NextResponse.json({ error: "basePrompt is required" }, { status: 400 })
  }

  const count = Math.min(Math.max(body.count || 5, 2), 10)

  // Usage limit check
  if (auth.userId) {
    const subscription = await getSubscription(auth.userId)
    const priceId = subscription?.stripe_price_id ?? null
    const plan = getPlanByPriceId(priceId)
    const planId = plan?.id ?? "free"

    const limits = await checkAgentLimits(auth.userId, "prompt_optimizer", planId)
    if (!limits.allowed) {
      return NextResponse.json(
        { error: `Monthly optimization limit reached (${limits.current}/${limits.limit}). Upgrade your plan.` },
        { status: 429 }
      )
    }
  }

  // Cost estimate
  const costEstimate = estimateOptimizerCost(count, body.model)

  // Create agent job
  if (!auth.userId) {
    return NextResponse.json({ error: "User authentication required for optimization" }, { status: 401 })
  }

  const agentJob = await createAgentJob({
    userId: auth.userId,
    agentType: "prompt_optimizer",
    config: {
      basePrompt: body.basePrompt,
      count,
      model: body.model,
      referenceImage: body.referenceImage ? "[provided]" : undefined,
      aspectRatio: body.aspectRatio,
      costEstimate,
    },
  })

  await updateAgentJob(agentJob.id, {
    status: "running",
    started_at: new Date().toISOString(),
  })

  // Run optimization in background
  runOptimization({
    agentJobId: agentJob.id,
    basePrompt: body.basePrompt,
    count,
    model: body.model,
    referenceImage: body.referenceImage,
    workflowId: body.workflowId,
    aspectRatio: body.aspectRatio,
  })
    .then(() =>
      updateAgentJob(agentJob.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
      })
    )
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : String(err)
      await updateAgentJob(agentJob.id, {
        status: "failed",
        error: message,
        completed_at: new Date().toISOString(),
      })
    })

  return NextResponse.json(
    {
      jobId: agentJob.id,
      status: "running",
      costEstimate,
    },
    { status: 202 }
  )
}
