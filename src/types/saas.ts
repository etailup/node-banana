/**
 * SaaS types for auth, subscriptions, API keys, and usage tracking
 */

export type User = {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type UserProfile = Pick<User, "id" | "name" | "avatar_url">

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "incomplete"

export type Subscription = {
  id: string
  user_id: string
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export type ApiKey = {
  id: string
  user_id: string
  name: string
  key_hash: string
  key_prefix: string
  last_used_at: string | null
  revoked_at: string | null
  created_at: string
}

export type UsageRecord = {
  id: string
  user_id: string
  month: string // YYYY-MM format
  job_count: number
  created_at: string
  updated_at: string
}

export type PlanLimits = {
  runsPerMonth: number
  maxConcurrent: number
  maxWorkflows: number
  maxApiKeys: number
}

export type ApiResponse<T> = {
  data: T | null
  error: string | null
}
