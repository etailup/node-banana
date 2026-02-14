import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getMonthlyUsage } from "@/lib/usage"
import { getSubscription } from "@/lib/supabase/db"
import { getPlanName } from "@/lib/plans"
import { countUserApiKeys } from "@/lib/apiKeys"
import { countUserWorkflows } from "@/lib/headless/storage"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [usage, subscription, apiKeyCount, workflowCount] = await Promise.all([
    getMonthlyUsage(user.id),
    getSubscription(user.id),
    countUserApiKeys(user.id),
    countUserWorkflows(user.id),
  ])

  return NextResponse.json({
    jobsThisMonth: usage,
    plan: getPlanName(subscription?.stripe_price_id ?? null),
    workflowCount,
    apiKeyCount,
  })
}
