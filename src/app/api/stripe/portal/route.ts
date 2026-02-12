import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPortalSession } from "@/lib/stripe"
import { getSubscription } from "@/lib/supabase/db"

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const subscription = await getSubscription(user.id)
    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found" }, { status: 404 })
    }

    const session = await createPortalSession(subscription.stripe_customer_id)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Portal error:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
