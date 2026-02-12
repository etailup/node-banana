import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { listApiKeys, createApiKey, revokeApiKey } from "@/lib/apiKeys"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const keys = await listApiKeys(user.id)
  return NextResponse.json({ keys })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await request.json()
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  // Check API key limit
  const keys = await listApiKeys(user.id)
  if (keys.length >= 10) {
    return NextResponse.json({ error: "API key limit reached" }, { status: 403 })
  }

  const result = await createApiKey(user.id, name)
  return NextResponse.json(result)
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { keyId } = await request.json()
  if (!keyId) return NextResponse.json({ error: "keyId required" }, { status: 400 })

  await revokeApiKey(user.id, keyId)
  return NextResponse.json({ success: true })
}
