"use client"

import { useEffect, useState } from "react"

interface AgentJob {
  id: string
  agent_type: string
  status: string
  config: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  created_at: string
  completed_at: string | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  running: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  paused: "bg-orange-500/20 text-orange-400",
}

const TYPE_LABELS: Record<string, string> = {
  workflow_builder: "Workflow Builder",
  prompt_optimizer: "Prompt Optimizer",
  batch: "Batch Content",
  quality_review: "Quality Review",
}

export default function AgentJobsPage() {
  const [jobs, setJobs] = useState<AgentJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchJobs() {
      try {
        const params = filter !== "all" ? `?type=${filter}` : ""
        const res = await fetch(`/api/agents${params}`)
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs || [])
        }
      } catch (err) {
        console.error("Failed to fetch agent jobs:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [filter])

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">AI Agents</h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="workflow_builder">Workflow Builder</option>
            <option value="prompt_optimizer">Prompt Optimizer</option>
            <option value="batch">Batch Content</option>
            <option value="quality_review">Quality Review</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg mb-2">No agent jobs yet</p>
            <p className="text-sm">Use the chat panel or API to start an agent task.</p>
          </div>
        ) : (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700 text-left text-xs text-neutral-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Config</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30">
                    <td className="px-4 py-3 text-sm font-medium">
                      {TYPE_LABELS[job.agent_type] || job.agent_type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[job.status] || "bg-neutral-600 text-neutral-300"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400 max-w-xs truncate">
                      {job.config.description ? String(job.config.description).slice(0, 80) : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {job.completed_at
                        ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.created_at).getTime()) / 1000)}s`
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
