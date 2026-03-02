/**
 * POST /api/agents/quality-review
 *
 * Submit images for quality review. Scores each with vision LLM.
 * Synchronous for small batches (< 5 images), async for larger.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { createAgentJob, updateAgentJob } from "@/lib/agents/storage"
import { checkAgentLimits } from "@/lib/agents/limits"
import { reviewImages, type ReviewInput } from "@/lib/agents/qualityReview"
import { createQualityReview } from "@/lib/agents/qualityStorage"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanByPriceId } from "@/lib/plans"

export const maxDuration = 120
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  // Auth
  const { error: authError, auth } = await validateApiKey(request)
  if (authError) return authError

  if (!auth.userId) {
    return NextResponse.json({ error: "User authentication required for quality review" }, { status: 401 })
  }

  // Parse body
  let body: {
    images?: { url: string; prompt?: string }[]
    brandGuidelines?: string
    threshold?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return NextResponse.json({ error: "images array is required" }, { status: 400 })
  }

  if (body.images.length > 20) {
    return NextResponse.json({ error: "Maximum 20 images per request" }, { status: 400 })
  }

  // Usage limit check
  const subscription = await getSubscription(auth.userId)
  const priceId = subscription?.stripe_price_id ?? null
  const plan = getPlanByPriceId(priceId)
  const planId = plan?.id ?? "free"

  const limits = await checkAgentLimits(auth.userId, "quality_review", planId, body.images.length)
  if (!limits.allowed) {
    return NextResponse.json(
      { error: `Quality review limit exceeded (${limits.current + body.images.length}/${limits.limit}). Upgrade your plan.` },
      { status: 429 }
    )
  }

  // Create agent job
  const agentJob = await createAgentJob({
    userId: auth.userId,
    agentType: "quality_review",
    config: { imageCount: body.images.length, threshold: body.threshold || 0.70 },
  })

  await updateAgentJob(agentJob.id, {
    status: "running",
    started_at: new Date().toISOString(),
  })

  try {
    const threshold = body.threshold || 0.70
    const reviewInputs: ReviewInput[] = body.images.map(img => ({
      url: img.url,
      prompt: img.prompt,
    }))

    const results = await reviewImages(reviewInputs, body.brandGuidelines, threshold)

    // Store results in database
    const storedReviews = await Promise.all(
      results.map(r =>
        createQualityReview({
          userId: auth.userId!,
          agentJobId: agentJob.id,
          imageUrl: r.imageUrl,
          sourcePrompt: body.images?.find(i => i.url === r.imageUrl)?.prompt,
          scores: r.scores,
          grade: r.grade,
          passed: r.passed,
          issues: r.issues,
        })
      )
    )

    await updateAgentJob(agentJob.id, {
      status: "completed",
      result: { reviewCount: storedReviews.length },
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      reviews: results.map((r, i) => ({
        id: storedReviews[i].id,
        imageUrl: r.imageUrl,
        grade: r.grade,
        passed: r.passed,
        scores: r.scores,
        issues: r.issues,
        suggestion: r.suggestion,
      })),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateAgentJob(agentJob.id, {
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
