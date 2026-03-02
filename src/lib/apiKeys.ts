import { createClient } from "@supabase/supabase-js"
import { createHash, randomBytes } from "crypto"
import type { ApiKey } from "@/types"

// Service-role client for server-side API key operations
let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

// Helper to bypass strict table typing for custom tables without generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string) {
  return getSupabase().from(name) as any
}

/**
 * Generate a new API key with hash and prefix.
 * Returns the raw key (shown to user once), its SHA-256 hash, and a prefix for display.
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = randomBytes(32).toString("hex")
  const key = `nb_live_${raw}`
  const hash = hashApiKey(key)
  const prefix = key.slice(0, 16) // "nb_live_" + first 8 hex chars
  return { key, hash, prefix }
}

/**
 * SHA-256 hash of an API key for storage.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/**
 * Validate an API key by looking up its hash.
 * Returns the user_id if valid, null otherwise.
 * Updates last_used_at on successful validation.
 */
export async function validateApiKey(key: string): Promise<string | null> {
  const hash = hashApiKey(key)

  const { data, error } = await table("api_keys")
    .select("id, user_id")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .single()

  if (error || !data) return null

  // Update last_used_at (fire-and-forget)
  table("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then()

  return data.user_id
}

/**
 * Create a new API key for a user.
 * Returns the full key (shown to user once) and the stored record.
 */
export async function createApiKey(
  userId: string,
  name: string
): Promise<{ key: string; record: ApiKey }> {
  const { key, hash, prefix } = generateApiKey()

  const { data, error } = await table("api_keys")
    .insert({
      user_id: userId,
      name,
      key_hash: hash,
      key_prefix: prefix,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create API key: ${error.message}`)
  return { key, record: data as ApiKey }
}

/**
 * List non-revoked API keys for a user.
 */
export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  const { data, error } = await table("api_keys")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list API keys: ${error.message}`)
  return (data || []) as ApiKey[]
}

/**
 * Revoke an API key by setting revoked_at.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { error } = await table("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)

  if (error) throw new Error(`Failed to revoke API key: ${error.message}`)
}

/**
 * Count non-revoked API keys for a user.
 */
export async function countUserApiKeys(userId: string): Promise<number> {
  const { count, error } = await table("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null)

  if (error) {
    console.error("Failed to count API keys:", error)
    return 0
  }
  return count || 0
}
