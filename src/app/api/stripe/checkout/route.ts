import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCheckoutSession } from "@/lib/stripe"
import { getSubscription } from "@/lib/supabase/db"
import { plans } from "@/lib/plans"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { priceId } = await request.json()
    if (!priceId || typeof priceId !== "string") {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 })
    }

    // Validate price ID against known plans
    const validPlan = plans.find(p => p.priceId === priceId)
    if (!validPlan) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 })
    }

    // Check for existing active subscription
    const subscription = await getSubscription(user.id)
    if (subscription?.status === "active") {
      return NextResponse.json(
        { error: "You already have an active subscription. Use the billing portal to manage it." },
        { status: 409 }
      )
    }

    const session = await createCheckoutSession({
      priceId,
      userId: user.id,
      userEmail: user.email!,
      customerId: subscription?.stripe_customer_id ?? undefined,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
