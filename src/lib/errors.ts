/**
 * Application error class with HTTP status code support.
 */
export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404)
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Rate limit exceeded") {
    super(message, "RATE_LIMITED", 429)
  }
}

/**
 * Convert any error into a JSON-safe response payload.
 */
export function toErrorResponse(error: unknown): { message: string; code: string; statusCode: number } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, statusCode: error.statusCode }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { message, code: "INTERNAL_ERROR", statusCode: 500 }
}
