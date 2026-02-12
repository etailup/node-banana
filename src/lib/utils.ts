/**
 * Sanitize a redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with "/" and blocks protocol-relative URLs.
 */
export function sanitizeRedirect(redirect: string | null): string {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/dashboard"
  }
  return redirect
}
