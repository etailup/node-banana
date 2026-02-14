/**
 * GET /api/agents/optimize-prompt/:jobId
 *
 * Poll optimization status and get ranked results.
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { getAgentJob } from "@/lib/agents/storage"
import { getVariations } from "@/lib/agents/promptOptimizer"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Auth
  const { error: authError } = await validateApiKey(request)
  if (authError) return authError

  // Get job
  const job = await getAgentJob(jobId)
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.agent_type !== "prompt_optimizer") {
    return NextResponse.json({ error: "Not a prompt optimizer job" }, { status: 400 })
  }

  // Get variations
  const variations = await getVariations(jobId)

  // Build progress
  const completed = variations.filter(v => v.status === "completed").length
  const failed = variations.filter(v => v.status === "failed").length
  const total = variations.length

  // Rank by overall score (completed only)
  const ranked = variations
    .filter(v => v.status === "completed" && v.scores)
    .sort((a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0))
    .map((v, i) => ({
      rank: i + 1,
      variationId: v.id,
      prompt: v.prompt,
      imageUrl: v.image_url,
      scores: v.scores,
      status: v.status,
    }))

  return NextResponse.json({
    jobId,
    status: job.status,
    progress: { completed, failed, total },
    results: ranked,
    basePrompt: job.config.basePrompt,
  })
}
