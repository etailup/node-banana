/**
 * Batch Content Engine
 *
 * Orchestrates processing of batch campaigns: picks pending items,
 * submits to headless engine, polls for completion, updates status.
 */

import { executeWorkflow } from "@/lib/headless/engine"
import { getWorkflow } from "@/lib/headless/storage"
import { getJob } from "@/lib/headless/storage"
import {
  getCampaign,
  updateCampaignStatus,
  getNextPendingItems,
  updateBatchItem,
  getCampaignProgress,
} from "./batchStorage"
import { updateAgentJob } from "./storage"
import { reviewImage } from "./qualityReview"
import { checkAgentLimits } from "./limits"
import type { ParameterOverrides } from "@/lib/headless/types"

// ---------------------------------------------------------------------------
// Main Campaign Orchestration
// ---------------------------------------------------------------------------

export interface BatchEngineConfig {
  campaignId: string
  agentJobId: string
  planId?: string
  callbackUrl?: string
  autoQualityReview?: boolean
  qualityThreshold?: number
}

/**
 * Run the batch processing loop for a campaign.
 * Picks pending items up to concurrency limit, submits each,
 * polls for completion, and updates statuses.
 */
export async function runBatchCampaign(config: BatchEngineConfig): Promise<void> {
  const campaign = await getCampaign(config.campaignId)
  if (!campaign) throw new Error(`Campaign not found: ${config.campaignId}`)

  const workflow = await getWorkflow(campaign.workflow_id)
  if (!workflow) throw new Error(`Workflow not found: ${campaign.workflow_id}`)

  await updateCampaignStatus(config.campaignId, "running")
  await updateAgentJob(config.agentJobId, {
    status: "running",
    started_at: new Date().toISOString(),
  })

  const concurrency = campaign.concurrency

  try {
    // Process items in batches
    while (true) {
      // Re-check campaign status (may have been paused/cancelled)
      const currentCampaign = await getCampaign(config.campaignId)
      if (!currentCampaign || currentCampaign.status === "paused" || currentCampaign.status === "failed") {
        break
      }

      // Check quota before processing next batch
      const quotaCheck = await checkAgentLimits(
        campaign.user_id,
        "batch",
        config.planId || "free",
        concurrency
      )
      if (!quotaCheck.allowed) {
        await updateCampaignStatus(config.campaignId, "paused")
        await updateAgentJob(config.agentJobId, {
          result: {
            progress: await getCampaignProgress(config.campaignId),
            pauseReason: `Batch item quota exceeded (${quotaCheck.current}/${quotaCheck.limit} used this month). Upgrade your plan or wait for the next billing cycle to resume.`,
          },
        })
        break
      }

      const pendingItems = await getNextPendingItems(config.campaignId, concurrency)
      if (pendingItems.length === 0) break

      // Submit batch of items in parallel
      const promises = pendingItems.map(async (item) => {
        try {
          await updateBatchItem(item.id, { status: "running" })

          // Build parameter overrides from row data + variable map
          const parameters = buildParameters(
            item.row_data,
            campaign.variable_map
          )

          // Execute workflow
          const jobId = await executeWorkflow(
            workflow.definition,
            parameters,
            undefined,
            workflow.id,
            { userId: campaign.user_id }
          )

          await updateBatchItem(item.id, { headless_job_id: jobId })

          // Poll for job completion
          const result = await pollJobCompletion(jobId, 300000) // 5 min timeout

          if (result.status === "completed") {
            const outputUrls = Object.values(result.outputs || {})
              .map(o => o.imageUrl)
              .filter(Boolean) as string[]

            // Auto quality review if enabled
            let qualityResults: Record<string, unknown> | undefined
            if (config.autoQualityReview && outputUrls.length > 0) {
              try {
                const reviews = await Promise.all(
                  outputUrls.map(url => reviewImage(url, "", undefined, config.qualityThreshold ?? 0.70))
                )
                qualityResults = {
                  reviews: reviews.map(r => ({
                    grade: r.grade,
                    overall: r.scores.overall,
                    passed: r.passed,
                    issues: r.issues,
                  })),
                  allPassed: reviews.every(r => r.passed),
                }
              } catch {
                // Quality review failure shouldn't fail the batch item
              }
            }

            await updateBatchItem(item.id, {
              status: "completed",
              output_urls: outputUrls,
              completed_at: new Date().toISOString(),
              ...(qualityResults ? { quality_results: qualityResults } : {}),
            })
          } else {
            const errorMsg = result.errors?.[0]?.message || "Job failed"
            await updateBatchItem(item.id, {
              status: "failed",
              error: errorMsg,
              retry_count: item.retry_count + 1,
            })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          await updateBatchItem(item.id, {
            status: "failed",
            error: message,
            retry_count: item.retry_count + 1,
          })
        }
      })

      await Promise.allSettled(promises)

      // Update progress on agent job
      const progress = await getCampaignProgress(config.campaignId)
      await updateAgentJob(config.agentJobId, {
        result: { progress },
      })
    }

    // Final status
    const finalProgress = await getCampaignProgress(config.campaignId)
    const finalStatus = finalProgress.failed > 0 && finalProgress.completed === 0
      ? "failed" as const
      : "completed" as const

    await updateCampaignStatus(config.campaignId, finalStatus)
    await updateAgentJob(config.agentJobId, {
      status: finalStatus,
      result: { progress: finalProgress },
      completed_at: new Date().toISOString(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await updateCampaignStatus(config.campaignId, "failed")
    await updateAgentJob(config.agentJobId, {
      status: "failed",
      error: message,
      completed_at: new Date().toISOString(),
    })
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build parameter overrides from a CSV row using the variable map.
 */
function buildParameters(
  rowData: Record<string, unknown>,
  variableMap: Record<string, string>
): ParameterOverrides {
  const images: Record<string, string> = {}
  const prompts: Record<string, string> = {}

  for (const [variableName, dataField] of Object.entries(variableMap)) {
    const value = rowData[dataField]
    if (value === undefined || value === null) continue

    const strValue = String(value)

    // Heuristic: URLs that look like images go to images, else prompts
    if (strValue.match(/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif)/i) || strValue.startsWith("data:image/")) {
      images[variableName] = strValue
    } else {
      prompts[variableName] = strValue
    }
  }

  return { images, prompts }
}

/**
 * Poll a headless job until it completes or times out.
 */
async function pollJobCompletion(
  jobId: string,
  timeoutMs: number
): Promise<{ status: string; outputs?: Record<string, { imageUrl?: string }>; errors?: { message: string }[] }> {
  const startTime = Date.now()
  const pollInterval = 3000

  while (Date.now() - startTime < timeoutMs) {
    const job = await getJob(jobId)
    if (!job) throw new Error(`Job not found: ${jobId}`)

    if (job.status === "completed" || job.status === "failed") {
      return {
        status: job.status,
        outputs: job.outputs,
        errors: job.errors,
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  return { status: "failed", errors: [{ message: "Job timed out" }] }
}
