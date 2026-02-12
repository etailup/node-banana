/**
 * Simple in-memory rate limiter for API routes.
 * For production with multiple instances, use Redis-backed rate limiting.
 *
 * Usage:
 *   const limiter = createRateLimiter({ interval: 60_000, limit: 10 })
 *
 *   export async function POST(request: NextRequest) {
 *     const ip = request.headers.get("x-forwarded-for") || "unknown"
 *     const { success } = limiter.check(ip)
 *     if (!success) {
 *       return NextResponse.json({ error: "Too many requests" }, { status: 429 })
 *     }
 *     // ... handle request
 *   }
 */

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimiterOptions = {
  /** Time window in milliseconds (default: 60 seconds) */
  interval?: number
  /** Max requests per interval (default: 10) */
  limit?: number
}

export function createRateLimiter({ interval = 60_000, limit = 10 }: RateLimiterOptions = {}) {
  const cache = new Map<string, RateLimitEntry>()

  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now()
      const entry = cache.get(key)

      // Clean up expired entries periodically
      if (cache.size > 1000) {
        for (const [k, v] of cache) {
          if (v.resetAt < now) cache.delete(k)
        }
      }

      if (!entry || entry.resetAt < now) {
        cache.set(key, { count: 1, resetAt: now + interval })
        return { success: true, remaining: limit - 1 }
      }

      if (entry.count >= limit) {
        return { success: false, remaining: 0 }
      }

      entry.count++
      return { success: true, remaining: limit - entry.count }
    },
  }
}
