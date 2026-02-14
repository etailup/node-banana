/**
 * GET /api/agents/quality-review/:reviewId — Get review details
 * PATCH /api/agents/quality-review/:reviewId — Override review (accept anyway)
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { getQualityReview, setUserOverride } from "@/lib/agents/qualityStorage"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  const { error: authError } = await validateApiKey(request)
  if (authError) return authError

  const review = await getQualityReview(reviewId)
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 })
  }

  return NextResponse.json({ review })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params

  const { error: authError } = await validateApiKey(request)
  if (authError) return authError

  let body: { userOverride?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.userOverride === undefined) {
    return NextResponse.json({ error: "userOverride field required" }, { status: 400 })
  }

  await setUserOverride(reviewId, body.userOverride)

  return NextResponse.json({ success: true })
}
