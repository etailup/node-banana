/**
 * GET /api/agents
 *
 * List agent jobs for the authenticated user.
 * Query params: ?type=workflow_builder (optional filter)
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/apiMiddleware"
import { listAgentJobs } from "@/lib/agents/storage"
import type { AgentType } from "@/lib/agents/types"

const VALID_TYPES: AgentType[] = ["workflow_builder", "prompt_optimizer", "batch", "quality_review"]

export const GET = withAuth(async (userId: string, request: NextRequest) => {
  const type = request.nextUrl.searchParams.get("type") as AgentType | null

  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid agent type. Valid: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    )
  }

  const jobs = await listAgentJobs(userId, type ?? undefined)

  return NextResponse.json({ jobs })
})
