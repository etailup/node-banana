import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { toErrorResponse } from "@/lib/errors"

/**
 * Wraps a dashboard API route handler with Supabase auth.
 * Passes the authenticated user ID to the handler.
 */
export function withAuth(
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      return await handler(user.id, request)
    } catch (error) {
      const { message, statusCode } = toErrorResponse(error)
      return NextResponse.json({ error: message }, { status: statusCode })
    }
  }
}
