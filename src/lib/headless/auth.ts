/**
 * Headless API Authentication
 *
 * Validates X-API-Key header against HEADLESS_API_KEY env var.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Validate the API key from the request headers.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiKey = process.env.HEADLESS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Headless API not configured (HEADLESS_API_KEY not set)" },
      { status: 503 },
    );
  }

  const provided = request.headers.get("X-API-Key");
  if (!provided || provided !== apiKey) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401 },
    );
  }

  return null; // Valid
}
