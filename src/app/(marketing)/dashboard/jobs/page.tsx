"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface Job {
  id: string
  workflow_name: string
  status: "pending" | "running" | "completed" | "failed"
  started_at: string
  duration_ms: number | null
}

const statusBadge: Record<string, string> = {
  pending: "badge-warning",
  running: "badge-info",
  completed: "badge-success",
  failed: "badge-error",
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 20

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/jobs?page=${page}&limit=${pageSize}`)
      if (!res.ok) throw new Error("Failed to fetch jobs")
      const data = await res.json()
      setJobs(data.jobs ?? [])
      setHasMore(data.hasMore ?? false)
    } catch {
      // Jobs endpoint may not exist yet — show empty state
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const formatDuration = (ms: number | null) => {
    if (ms === null) return "-"
    if (ms < 1000) return `${ms}ms`
    const sec = Math.round(ms / 1000)
    if (sec < 60) return `${sec}s`
    return `${Math.floor(sec / 60)}m ${sec % 60}s`
  }

  const truncateId = (id: string) => id.slice(0, 8)

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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Job History</h1>
          <p className="text-base-content/70">
            View your workflow execution history.
          </p>
        </div>

        <div className="card bg-base-200">
          <div className="card-body">
            {loading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-md" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base-content/60 mb-4">No jobs yet. Run a workflow via the API to see results here.</p>
                <Link href="/editor" className="btn btn-primary btn-sm">Open Editor</Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Workflow</th>
                        <th>Status</th>
                        <th>Started</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job.id}>
                          <td>
                            <code className="text-sm">{truncateId(job.id)}</code>
                          </td>
                          <td className="font-medium">{job.workflow_name || "Untitled"}</td>
                          <td>
                            <span className={`badge badge-sm ${statusBadge[job.status] ?? "badge-neutral"}`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="text-sm text-base-content/60">
                            {new Date(job.started_at).toLocaleString()}
                          </td>
                          <td className="text-sm text-base-content/60">
                            {formatDuration(job.duration_ms)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-center gap-2 mt-4">
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="btn btn-ghost btn-sm no-animation">Page {page}</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!hasMore}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
