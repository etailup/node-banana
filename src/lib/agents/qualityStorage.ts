/**
 * Quality Review Storage Layer
 *
 * CRUD operations for the quality_reviews table.
 */

import { createClient } from "@supabase/supabase-js"
import type { QualityReview, QualityScores, QualityGrade } from "./types"

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

export async function createQualityReview(params: {
  userId: string
  agentJobId?: string
  imageUrl: string
  sourceJobId?: string
  sourcePrompt?: string
  scores: QualityScores
  grade: QualityGrade
  passed: boolean
  issues: string[]
}): Promise<QualityReview> {
  const { data, error } = await table("quality_reviews")
    .insert({
      user_id: params.userId,
      agent_job_id: params.agentJobId || null,
      image_url: params.imageUrl,
      source_job_id: params.sourceJobId || null,
      source_prompt: params.sourcePrompt || null,
      scores: params.scores,
      grade: params.grade,
      passed: params.passed,
      issues: params.issues,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create quality review: ${error.message}`)
  return data as QualityReview
}

export async function getQualityReview(id: string): Promise<QualityReview | null> {
  const { data, error } = await table("quality_reviews")
    .select("*")
    .eq("id", id)
    .single()

  if (error?.code === "PGRST116") return null
  if (error) throw new Error(`Failed to get quality review: ${error.message}`)
  return data as QualityReview
}

export async function getReviewsByJobId(sourceJobId: string): Promise<QualityReview[]> {
  const { data, error } = await table("quality_reviews")
    .select("*")
    .eq("source_job_id", sourceJobId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to get reviews: ${error.message}`)
  return (data || []) as QualityReview[]
}

export async function listUserReviews(
  userId: string,
  limit: number = 50
): Promise<QualityReview[]> {
  const { data, error } = await table("quality_reviews")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to list reviews: ${error.message}`)
  return (data || []) as QualityReview[]
}

export async function setUserOverride(
  reviewId: string,
  override: boolean
): Promise<void> {
  const { error } = await table("quality_reviews")
    .update({ user_override: override })
    .eq("id", reviewId)

  if (error) throw new Error(`Failed to update review: ${error.message}`)
}
