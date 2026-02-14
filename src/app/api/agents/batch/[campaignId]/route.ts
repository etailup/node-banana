/**
 * GET /api/agents/batch/:campaignId — Get campaign status + progress
 * PATCH /api/agents/batch/:campaignId — Pause/resume/cancel/retry
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import {
  getCampaign,
  updateCampaignStatus,
  getBatchItems,
  getCampaignProgress,
  resetFailedItems,
} from "@/lib/agents/batchStorage"
import { runBatchCampaign } from "@/lib/agents/batchEngine"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params

  const { error: authError } = await validateApiKey(request)
  if (authError) return authError

  const campaign = await getCampaign(campaignId)
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  const progress = await getCampaignProgress(campaignId)
  const items = await getBatchItems(campaignId)

  return NextResponse.json({
    campaign,
    progress,
    items: items.map(item => ({
      id: item.id,
      rowIndex: item.row_index,
      rowData: item.row_data,
      status: item.status,
      outputUrls: item.output_urls,
      error: item.error,
      retryCount: item.retry_count,
    })),
  })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params

  const { error: authError } = await validateApiKey(request)
  if (authError) return authError

  let body: { action?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const campaign = await getCampaign(campaignId)
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  }

  switch (body.action) {
    case "pause":
      await updateCampaignStatus(campaignId, "paused")
      return NextResponse.json({ status: "paused" })

    case "resume":
      await updateCampaignStatus(campaignId, "running")
      // Re-launch the batch engine
      runBatchCampaign({
        campaignId,
        agentJobId: campaign.agent_job_id,
      }).catch(console.error)
      return NextResponse.json({ status: "running" })

    case "cancel":
      await updateCampaignStatus(campaignId, "failed")
      return NextResponse.json({ status: "cancelled" })

    case "retry_failed": {
      const resetCount = await resetFailedItems(campaignId)
      if (resetCount > 0) {
        await updateCampaignStatus(campaignId, "running")
        runBatchCampaign({
          campaignId,
          agentJobId: campaign.agent_job_id,
        }).catch(console.error)
      }
      return NextResponse.json({ status: "running", resetItems: resetCount })
    }

    default:
      return NextResponse.json(
        { error: "Invalid action. Valid: pause, resume, cancel, retry_failed" },
        { status: 400 }
      )
  }
}
