import { createClient } from "@supabase/supabase-js"
import { getPlanLimits } from "./plans"

// Service-role client for usage tracking
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

// Helper to bypass strict table typing for custom tables without generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string) {
  return getSupabase().from(name) as any
}

/**
 * Get the current month string in YYYY-MM format.
 */
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

/**
 * Get the number of jobs run this month for a user.
 */
export async function getMonthlyUsage(userId: string): Promise<number> {
  const month = getCurrentMonth()

  const { data, error } = await table("usage_records")
    .select("job_count")
    .eq("user_id", userId)
    .eq("month", month)
    .single()

  if (error) {
    if (error.code === "PGRST116") return 0 // No record yet
    console.error("Error fetching usage:", error)
    return 0
  }

  return data?.job_count ?? 0
}

/**
 * Increment the job count for the current month using atomic RPC.
 * Creates the record if it doesn't exist.
 */
export async function incrementUsage(userId: string): Promise<number> {
  const month = getCurrentMonth()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (getSupabase().rpc as any)("increment_usage", {
    p_user_id: userId,
    p_month: month,
  })

  if (error) {
    console.error("Error incrementing usage:", error)
    // Fallback: try client-side read + write
    const current = await getMonthlyUsage(userId)
    const newCount = current + 1

    await table("usage_records")
      .upsert(
        {
          user_id: userId,
          month,
          job_count: newCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,month" }
      )

    return newCount
  }

  return data ?? 1
}

/**
 * Check if a user is within their plan's usage limits.
 */
export async function checkUsageLimits(
  userId: string,
  planId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getPlanLimits(planId)
  const current = await getMonthlyUsage(userId)

  return {
    allowed: current < limits.runsPerMonth,
    current,
    limit: limits.runsPerMonth,
  }
}
