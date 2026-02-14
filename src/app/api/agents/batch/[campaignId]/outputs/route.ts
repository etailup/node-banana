/**
 * GET /api/agents/batch/:campaignId/outputs
 *
 * Get output URLs for completed batch items.
 * Query params: ?status=completed (default: completed)
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/headless/auth"
import { getCampaign, getBatchItems } from "@/lib/agents/batchStorage"
import type { BatchItemStatus } from "@/lib/agents/types"

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

  const statusFilter = (request.nextUrl.searchParams.get("status") || "completed") as BatchItemStatus
  const items = await getBatchItems(campaignId, statusFilter)

  const outputs = items.map(item => ({
    rowIndex: item.row_index,
    rowData: item.row_data,
    urls: item.output_urls,
  }))

  return NextResponse.json({ outputs, total: outputs.length })
}
