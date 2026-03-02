function optionalEnv(key: string, fallback: string = ""): string {
  return process.env[key] || fallback
}

/**
 * Lazy environment access — values resolve at runtime, not import time.
 * This prevents build-time crashes when server-only vars aren't available.
 */
export const env = {
  // Supabase
  get supabaseUrl() {
    const v = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!v) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL")
    return v
  },
  get supabaseAnonKey() {
    const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!v) throw new Error("Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY")
    return v
  },
  get supabaseServiceRoleKey() {
    const v = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!v) throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY")
    return v
  },

  // Stripe (optional — SaaS billing not required to run the editor)
  get stripeSecretKey() { return optionalEnv("STRIPE_SECRET_KEY") },
  get stripeWebhookSecret() { return optionalEnv("STRIPE_WEBHOOK_SECRET") },

  // Resend (optional — emails not required for core functionality)
  get resendApiKey() { return optionalEnv("RESEND_API_KEY") },
  get resendFromEmail() { return optionalEnv("RESEND_FROM_EMAIL", "Node Banana <noreply@nodebanana.com>") },

  // AI providers
  get geminiApiKey() { return optionalEnv("GEMINI_API_KEY") },

  // App
  get appUrl() { return optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000") },

  // Headless API
  get headlessApiKey() { return optionalEnv("HEADLESS_API_KEY") },
}
