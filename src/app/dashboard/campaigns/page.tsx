"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

interface Campaign {
  id: string
  name: string
  workflow_id: string
  total_items: number
  concurrency: number
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  running: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  paused: "bg-orange-500/20 text-orange-400",
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await fetch("/api/agents?type=batch")
        if (res.ok) {
          const data = await res.json()
          // Agent jobs contain campaign info in config
          setCampaigns(
            (data.jobs || []).map((job: Record<string, unknown>) => ({
              id: (job.config as Record<string, unknown>)?.campaignId || job.id,
              name: (job.config as Record<string, unknown>)?.name || "Campaign",
              workflow_id: (job.config as Record<string, unknown>)?.workflowId || "",
              total_items: (job.config as Record<string, unknown>)?.totalItems || 0,
              concurrency: (job.config as Record<string, unknown>)?.concurrency || 1,
              status: job.status as string,
              created_at: job.created_at as string,
            }))
          )
        }
      } catch (err) {
        console.error("Failed to fetch campaigns:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Batch Campaigns</h1>
          <Link
            href="/dashboard/campaigns/new"
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            New Campaign
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <p className="text-lg mb-2">No campaigns yet</p>
            <p className="text-sm">Create a batch campaign to process multiple items at once.</p>
          </div>
        ) : (
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-700 text-left text-xs text-neutral-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-neutral-700/50 hover:bg-neutral-700/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {campaign.total_items}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLORS[campaign.status] || "bg-neutral-600 text-neutral-300"}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-400">
                      {new Date(campaign.created_at).toLocaleDateString()}
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
