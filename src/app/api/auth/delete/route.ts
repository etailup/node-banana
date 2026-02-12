import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/supabase/db"
import { cancelSubscription } from "@/lib/stripe"

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const subscription = await getSubscription(user.id)
    if (subscription?.stripe_subscription_id && subscription.status === "active") {
      try {
        await cancelSubscription(subscription.stripe_subscription_id)
      } catch (stripeError) {
        console.error("Failed to cancel Stripe subscription:", stripeError)
      }
    }

    const admin = createAdminClient()
    await admin.from("api_keys").delete().eq("user_id", user.id)
    await admin.from("usage_records").delete().eq("user_id", user.id)
    await admin.from("subscriptions").delete().eq("user_id", user.id)
    await admin.from("users").delete().eq("id", user.id)

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error("Failed to delete auth user:", error)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Account deletion error:", error)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
