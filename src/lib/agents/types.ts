/**
 * AI Agent System Types
 *
 * Shared types for all agent operations: workflow builder,
 * prompt optimizer, batch content, and quality review.
 */

// ---------------------------------------------------------------------------
// Agent Job (parent record for all agent operations)
// ---------------------------------------------------------------------------

export type AgentType = "workflow_builder" | "prompt_optimizer" | "batch" | "quality_review"

export type AgentJobStatus = "pending" | "running" | "completed" | "failed" | "paused"

export interface AgentJob {
  id: string
  user_id: string
  agent_type: AgentType
  status: AgentJobStatus
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface CreateAgentJobParams {
  userId: string
  agentType: AgentType
  config: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Prompt Optimizer
// ---------------------------------------------------------------------------

export type VariationStatus = "pending" | "generating" | "scoring" | "completed" | "failed"

export interface PromptVariation {
  id: string
  agent_job_id: string
  variation_index: number
  prompt: string
  headless_job_id: string | null
  image_url: string | null
  scores: VariationScores | null
  status: VariationStatus
  created_at: string
}

export interface VariationScores {
  overall: number
  prompt_adherence: number
  aesthetics: number
  artifacts: number
  coherence: number
  reference_similarity?: number
}

// ---------------------------------------------------------------------------
// Batch Campaign
// ---------------------------------------------------------------------------

export type CampaignStatus = "pending" | "running" | "paused" | "completed" | "failed"

export interface BatchCampaign {
  id: string
  user_id: string
  agent_job_id: string
  name: string
  workflow_id: string
  variable_map: Record<string, string>
  total_items: number
  concurrency: number
  status: CampaignStatus
  created_at: string
  updated_at: string
}

export type BatchItemStatus = "pending" | "running" | "completed" | "failed" | "skipped"

export interface BatchItem {
  id: string
  campaign_id: string
  row_index: number
  row_data: Record<string, unknown>
  headless_job_id: string | null
  status: BatchItemStatus
  output_urls: string[]
  error: string | null
  retry_count: number
  created_at: string
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Quality Review
// ---------------------------------------------------------------------------

export type QualityGrade = "A" | "B" | "C" | "F"

export interface QualityScores {
  artifacts: number
  text_readability: number
  composition: number
  prompt_alignment: number
  overall: number
}

export interface QualityReview {
  id: string
  user_id: string
  agent_job_id: string | null
  image_url: string
  source_job_id: string | null
  source_prompt: string | null
  scores: QualityScores
  grade: QualityGrade
  passed: boolean
  issues: string[]
  suggestion?: string
  user_override: boolean
  created_at: string
}
