/**
 * Agent Jobs Storage Layer
 *
 * CRUD operations for the agent_jobs table.
 * Uses service-role Supabase client (same pattern as apiKeys.ts / usage.ts).
 */

import { createClient } from "@supabase/supabase-js"
import type {
  AgentJob,
  AgentJobStatus,
  AgentType,
  CreateAgentJobParams,
} from "./types"

// Singleton service-role client
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
// Agent Jobs CRUD
// ---------------------------------------------------------------------------

export async function createAgentJob(params: CreateAgentJobParams): Promise<AgentJob> {
  const { data, error } = await table("agent_jobs")
    .insert({
      user_id: params.userId,
      agent_type: params.agentType,
      config: params.config,
      status: "pending",
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create agent job: ${error.message}`)
  return data as AgentJob
}

export async function getAgentJob(id: string): Promise<AgentJob | null> {
  const { data, error } = await table("agent_jobs")
    .select("*")
    .eq("id", id)
    .single()

  if (error?.code === "PGRST116") return null
  if (error) throw new Error(`Failed to get agent job: ${error.message}`)
  return data as AgentJob
}

export async function updateAgentJob(
  id: string,
  updates: Partial<Pick<AgentJob, "status" | "result" | "error" | "started_at" | "completed_at">>
): Promise<void> {
  const { error } = await table("agent_jobs")
    .update(updates)
    .eq("id", id)

  if (error) throw new Error(`Failed to update agent job: ${error.message}`)
}

export async function listAgentJobs(
  userId: string,
  type?: AgentType
): Promise<AgentJob[]> {
  let query = table("agent_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (type) {
    query = query.eq("agent_type", type)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to list agent jobs: ${error.message}`)
  return (data || []) as AgentJob[]
}

/**
 * Count agent jobs of a specific type in the current month for usage tracking.
 */
export async function countMonthlyAgentJobs(
  userId: string,
  agentType: AgentType
): Promise<number> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count, error } = await table("agent_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("agent_type", agentType)
    .gte("created_at", monthStart)

  if (error) {
    console.error("Failed to count agent jobs:", error)
    return 0
  }
  return count || 0
}
