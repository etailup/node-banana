"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export function Header() {
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const setup = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return
          setUser(session?.user ? { email: session.user.email || "" } : null)
          setLoading(false)
        })

        return () => {
          mounted = false
          subscription.unsubscribe()
        }
      } catch {
        // Supabase not configured — treat as logged out
        if (mounted) setLoading(false)
        return () => { mounted = false }
      }
    }

    const cleanupPromise = setup()
    return () => {
      mounted = false
      cleanupPromise.then(cleanup => cleanup?.())
    }
  }, [])

  const handleSignOut = async () => {
    const form = document.createElement("form")
    form.method = "POST"
    form.action = "/api/auth/signout"
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-base-100/80 border-b border-base-content/5">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span>Node Banana</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {user && (
              <Link href="/dashboard" className="px-4 py-2 text-sm text-base-content/70 hover:text-base-content transition-colors">
                Dashboard
              </Link>
            )}
            <Link href="/pricing" className="px-4 py-2 text-sm text-base-content/70 hover:text-base-content transition-colors">
              Pricing
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="btn btn-ghost btn-sm loading" />
            ) : user ? (
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-sm" role="button" aria-haspopup="true">
                  {user.email}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </label>
                <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-200 rounded-box w-52 p-2 shadow-lg mt-2" role="menu">
                  <li role="menuitem"><Link href="/dashboard">Dashboard</Link></li>
                  <li role="menuitem"><Link href="/dashboard/settings">Settings</Link></li>
                  <li role="menuitem"><Link href="/editor">Open Editor</Link></li>
                  <li className="border-t border-base-300 mt-1 pt-1" role="menuitem">
                    <button onClick={handleSignOut}>Sign Out</button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm hidden sm:flex">
                  Sign In
                </Link>
                <Link href="/login" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile Menu */}
            <div className="dropdown dropdown-end md:hidden">
              <label tabIndex={0} className="btn btn-ghost btn-sm btn-square" role="button" aria-haspopup="true" aria-label="Menu">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </label>
              <ul tabIndex={0} className="dropdown-content menu menu-sm bg-base-200 rounded-box w-52 p-2 shadow-lg mt-2" role="menu">
                <li role="menuitem"><Link href="/pricing">Pricing</Link></li>
                {user ? (
                  <>
                    <li role="menuitem"><Link href="/dashboard">Dashboard</Link></li>
                    <li role="menuitem"><Link href="/editor">Open Editor</Link></li>
                    <li role="menuitem"><Link href="/dashboard/settings">Settings</Link></li>
                    <li className="border-t border-base-300 mt-1 pt-1" role="menuitem">
                      <button onClick={handleSignOut}>Sign Out</button>
                    </li>
                  </>
                ) : (
                  <li role="menuitem"><Link href="/login">Sign In</Link></li>
                )}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </header>
  )
}
