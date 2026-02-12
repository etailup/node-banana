function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) throw new Error(`Missing required environment variable: ${key}`)
  return value
}

function optionalEnv(key: string, fallback: string = ""): string {
  return process.env[key] || fallback
}

export const env = {
  // Supabase
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),

  // Stripe (optional — SaaS billing not required to run the editor)
  stripeSecretKey: optionalEnv("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),

  // Resend (optional — emails not required for core functionality)
  resendApiKey: optionalEnv("RESEND_API_KEY"),
  resendFromEmail: optionalEnv("RESEND_FROM_EMAIL", "Node Banana <noreply@nodebanana.com>"),

  // AI providers
  geminiApiKey: optionalEnv("GEMINI_API_KEY"),

  // App
  appUrl: optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Headless API
  headlessApiKey: optionalEnv("HEADLESS_API_KEY"),
}
