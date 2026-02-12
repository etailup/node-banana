"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface ApiKeyDisplay {
  id: string
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showNewKey, setShowNewKey] = useState<string | null>(null)
  const [error, setError] = useState("")

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/keys")
      if (!res.ok) throw new Error("Failed to fetch keys")
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch {
      setError("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    setError("")

    try {
      const res = await fetch("/api/dashboard/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create key")
      }
      const data = await res.json()
      setShowNewKey(data.key)
      setNewKeyName("")
      await fetchKeys()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return

    try {
      const res = await fetch(`/api/dashboard/keys?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to revoke key")
      await fetchKeys()
    } catch {
      setError("Failed to revoke key")
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-base-100">
      <header className="navbar bg-base-200 border-b border-base-300">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl font-bold">
            Node Banana
          </Link>
        </div>
        <div className="flex-none gap-2">
          <Link href="/dashboard" className="btn btn-ghost btn-sm">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">API Keys</h1>
          <p className="text-base-content/70">
            Manage your API keys for headless workflow execution.
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-6 text-sm">
            <span>{error}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setError("")}>Dismiss</button>
          </div>
        )}

        {/* New key reveal */}
        {showNewKey && (
          <div className="alert alert-success mb-6">
            <div className="flex-1">
              <p className="font-medium mb-1">API key created! Copy it now — you won&apos;t see it again.</p>
              <div className="flex items-center gap-2">
                <code className="bg-base-100/20 px-3 py-1 rounded font-mono text-sm break-all">{showNewKey}</code>
                <button className="btn btn-ghost btn-xs" onClick={() => handleCopy(showNewKey)}>
                  Copy
                </button>
              </div>
            </div>
            <button className="btn btn-ghost btn-xs" onClick={() => setShowNewKey(null)}>Done</button>
          </div>
        )}

        {/* Create new key */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title">Create New Key</h2>
            <form onSubmit={handleCreate} className="flex gap-3 mt-2">
              <input
                type="text"
                placeholder="Key name (e.g. production, staging)"
                className="input input-bordered flex-1"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={creating || !newKeyName.trim()}
              >
                {creating ? <span className="loading loading-spinner loading-xs" /> : "Create"}
              </button>
            </form>
          </div>
        </div>

        {/* Existing keys */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h2 className="card-title">Your API Keys</h2>
            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : keys.length === 0 ? (
              <p className="text-base-content/60 py-4">No API keys yet. Create one above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Key</th>
                      <th>Created</th>
                      <th>Last Used</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((key) => (
                      <tr key={key.id}>
                        <td className="font-medium">{key.name}</td>
                        <td>
                          <code className="text-sm text-base-content/60">{key.key_prefix}...</code>
                        </td>
                        <td className="text-sm text-base-content/60">
                          {new Date(key.created_at).toLocaleDateString()}
                        </td>
                        <td className="text-sm text-base-content/60">
                          {key.last_used_at
                            ? new Date(key.last_used_at).toLocaleDateString()
                            : "Never"}
                        </td>
                        <td>
                          <button
                            className="btn btn-error btn-outline btn-xs"
                            onClick={() => handleRevoke(key.id)}
                          >
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
