import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get("page") || "1")
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50)
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  const { data: jobs, error, count } = await admin
    .from("headless_jobs")
    .select("id, workflow_id, status, progress, created_at, started_at, completed_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    // TODO: filter by user_id when column exists

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    jobs: jobs || [],
    total: count || 0,
    page,
    limit,
  })
}
