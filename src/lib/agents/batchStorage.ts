/**
 * Batch Campaign Storage Layer
 *
 * CRUD operations for batch_campaigns and batch_items tables.
 */

import { createClient } from "@supabase/supabase-js"
import type { BatchCampaign, BatchItem, BatchItemStatus, CampaignStatus } from "./types"

let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string) {
  return getSupabase().from(name) as any
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export async function createCampaign(params: {
  userId: string
  agentJobId: string
  name: string
  workflowId: string
  variableMap: Record<string, string>
  totalItems: number
  concurrency: number
}): Promise<BatchCampaign> {
  const { data, error } = await table("batch_campaigns")
    .insert({
      user_id: params.userId,
      agent_job_id: params.agentJobId,
      name: params.name,
      workflow_id: params.workflowId,
      variable_map: params.variableMap,
      total_items: params.totalItems,
      concurrency: params.concurrency,
      status: "pending",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create campaign: ${error.message}`)
  return data as BatchCampaign
}

export async function getCampaign(id: string): Promise<BatchCampaign | null> {
  const { data, error } = await table("batch_campaigns")
    .select("*")
    .eq("id", id)
    .single()

  if (error?.code === "PGRST116") return null
  if (error) throw new Error(`Failed to get campaign: ${error.message}`)
  return data as BatchCampaign
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<void> {
  const { error } = await table("batch_campaigns")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(`Failed to update campaign: ${error.message}`)
}

export async function listCampaigns(userId: string): Promise<BatchCampaign[]> {
  const { data, error } = await table("batch_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list campaigns: ${error.message}`)
  return (data || []) as BatchCampaign[]
}

// ---------------------------------------------------------------------------
// Batch Items
// ---------------------------------------------------------------------------

export async function createBatchItems(
  campaignId: string,
  rows: Record<string, unknown>[]
): Promise<BatchItem[]> {
  const items = rows.map((row, i) => ({
    campaign_id: campaignId,
    row_index: i,
    row_data: row,
    status: "pending",
    output_urls: [],
    retry_count: 0,
  }))

  const { data, error } = await table("batch_items")
    .insert(items)
    .select()

  if (error) throw new Error(`Failed to create batch items: ${error.message}`)
  return (data || []) as BatchItem[]
}

export async function getBatchItems(
  campaignId: string,
  status?: BatchItemStatus
): Promise<BatchItem[]> {
  let query = table("batch_items")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("row_index", { ascending: true })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to get batch items: ${error.message}`)
  return (data || []) as BatchItem[]
}

export async function updateBatchItem(
  id: string,
  updates: Partial<Pick<BatchItem, "status" | "headless_job_id" | "output_urls" | "error" | "retry_count" | "completed_at">>
): Promise<void> {
  const { error } = await table("batch_items")
    .update(updates)
    .eq("id", id)

  if (error) throw new Error(`Failed to update batch item: ${error.message}`)
}

export async function getNextPendingItems(
  campaignId: string,
  limit: number
): Promise<BatchItem[]> {
  const { data, error } = await table("batch_items")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("row_index", { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to get pending items: ${error.message}`)
  return (data || []) as BatchItem[]
}

export async function resetFailedItems(campaignId: string): Promise<number> {
  const { data, error } = await table("batch_items")
    .update({ status: "pending" })
    .eq("campaign_id", campaignId)
    .eq("status", "failed")
    .lt("retry_count", 3)
    .select("id")

  if (error) throw new Error(`Failed to reset failed items: ${error.message}`)
  return data?.length || 0
}

/**
 * Get campaign progress summary.
 */
export async function getCampaignProgress(campaignId: string): Promise<{
  completed: number
  failed: number
  running: number
  pending: number
  total: number
}> {
  const items = await getBatchItems(campaignId)

  return {
    completed: items.filter(i => i.status === "completed").length,
    failed: items.filter(i => i.status === "failed").length,
    running: items.filter(i => i.status === "running").length,
    pending: items.filter(i => i.status === "pending").length,
    total: items.length,
  }
}
