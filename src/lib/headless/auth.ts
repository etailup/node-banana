/**
 * Headless API Authentication
 *
 * Dual auth: tries per-user API keys (nb_live_*) first,
 * falls back to legacy HEADLESS_API_KEY env var.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { validateApiKey as validateDbApiKey } from "@/lib/apiKeys";

export type AuthResult = {
  userId: string | null; // null for legacy env-var auth
};

/**
 * Validate the API key from request headers.
 * Returns null error (+ AuthResult) if valid, or NextResponse error if invalid.
 */
export async function validateApiKey(
  request: NextRequest,
): Promise<{ error: NextResponse | null; auth: AuthResult }> {
  const provided = request.headers.get("X-API-Key");
  if (!provided) {
    return {
      error: NextResponse.json(
        { error: "Missing API key" },
        { status: 401 },
      ),
      auth: { userId: null },
    };
  }

  // Try per-user API key (nb_live_* format) first
  if (provided.startsWith("nb_live_")) {
    const userId = await validateDbApiKey(provided);
    if (userId) {
      return { error: null, auth: { userId } };
    }
    return {
      error: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
      auth: { userId: null },
    };
  }

  // Fall back to legacy HEADLESS_API_KEY env var
  const legacyKey = process.env.HEADLESS_API_KEY;
  if (!legacyKey) {
    return {
      error: NextResponse.json(
        { error: "Headless API not configured" },
        { status: 503 },
      ),
      auth: { userId: null },
    };
  }

  if (
    provided.length !== legacyKey.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(legacyKey))
  ) {
    return {
      error: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
      auth: { userId: null },
    };
  }

  return { error: null, auth: { userId: null } }; // Legacy auth, no user context
}
