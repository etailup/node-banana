import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMonthlyUsage } from "@/lib/usage"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanName } from "@/lib/plans"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [usage, subscription] = await Promise.all([
    getMonthlyUsage(user.id),
    getSubscription(user.id),
  ])

  return NextResponse.json({
    jobsThisMonth: usage,
    plan: getPlanName(subscription?.stripe_price_id ?? null),
    workflowCount: 0, // TODO: count when user_id column exists on headless_workflows
    apiKeyCount: 0, // TODO: count API keys
  })
}
