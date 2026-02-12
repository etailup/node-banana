"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sanitizeRedirect } from "@/lib/utils"

export default function CallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <Suspense fallback={<LoadingSpinner />}>
        <CallbackHandler />
      </Suspense>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="text-center">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="mt-4 text-base-content/70">Signing you in...</p>
    </div>
  )
}

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = sanitizeRedirect(searchParams.get("redirect"))

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const code = new URL(window.location.href).searchParams.get("code")
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        router.push(redirect)
      } catch (error) {
        console.error("Auth callback error:", error)
        router.push("/login?error=auth_failed")
      }
    }

    handleCallback()
  }, [router, redirect])

  return <LoadingSpinner />
}
