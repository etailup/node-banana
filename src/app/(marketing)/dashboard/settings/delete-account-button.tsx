"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function DeleteAccountButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/delete", { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete account")
      }
      router.push("/?deleted=true")
    } catch (error) {
      console.error("Account deletion failed:", error)
      setShowConfirm(false)
    } finally {
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-error">Are you sure? This is permanent.</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="btn btn-error btn-sm"
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "Yes, delete"
          )}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={loading}
          className="btn btn-ghost btn-sm"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="btn btn-error btn-outline btn-sm"
    >
      Delete Account
    </button>
  )
}
