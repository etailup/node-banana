/**
 * Agent Usage Limit Checks
 *
 * Enforces per-agent usage quotas based on the user's plan tier.
 */

import { getPlanLimits } from "@/lib/plans"
import { countMonthlyAgentJobs } from "./storage"
import type { AgentType } from "./types"

/**
 * Map agent types to their corresponding PlanLimits field.
 */
const AGENT_LIMIT_KEYS: Record<AgentType, string> = {
  workflow_builder: "runsPerMonth", // uses standard run quota
  prompt_optimizer: "agentOptimizations",
  batch: "agentBatchItems",
  quality_review: "agentQualityReviews",
}

/**
 * Check if a user is within their plan's agent-specific limits.
 *
 * @param userId - The user's ID
 * @param agentType - Which agent is being used
 * @param planId - The user's plan ID (free, pro, enterprise)
 * @param quantity - Number of items being requested (default: 1)
 */
export async function checkAgentLimits(
  userId: string,
  agentType: AgentType,
  planId: string,
  quantity: number = 1
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = getPlanLimits(planId)
  const limitKey = AGENT_LIMIT_KEYS[agentType]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const limit = (limits as any)[limitKey] as number | undefined

  // If no specific limit defined, fall back to runsPerMonth
  if (limit === undefined) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  // Infinite limit (enterprise)
  if (!Number.isFinite(limit)) {
    return { allowed: true, current: 0, limit: Infinity }
  }

  const current = await countMonthlyAgentJobs(userId, agentType)

  return {
    allowed: current + quantity <= limit,
    current,
    limit,
  }
}
