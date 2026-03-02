"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { CampaignProgress } from "@/components/campaigns/CampaignProgress"
import { CampaignItemsTable } from "@/components/campaigns/CampaignItemsTable"

interface CampaignData {
  campaign: {
    id: string
    name: string
    status: string
    total_items: number
    concurrency: number
    workflow_id: string
    created_at: string
  }
  progress: {
    completed: number
    failed: number
    running: number
    pending: number
    total: number
  }
  items: {
    id: string
    rowIndex: number
    rowData: Record<string, unknown>
    status: string
    outputUrls: string[]
    error: string | null
    retryCount: number
  }[]
}

export default function CampaignDetailPage() {
  const params = useParams()
  const campaignId = params.id as string

  const [data, setData] = useState<CampaignData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/batch/${campaignId}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (err) {
      console.error("Failed to fetch campaign:", err)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll while running
  useEffect(() => {
    if (!data?.campaign || data.campaign.status !== "running") return

    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [data?.campaign?.status, fetchData])

  const handleAction = async (action: string) => {
    setActionLoading(true)
    try {
      await fetch(`/api/agents/batch/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await fetchData()
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-200 flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-neutral-900 text-neutral-200 flex items-center justify-center">
        Campaign not found
      </div>
    )
  }

  const { campaign, progress, items } = data
  const isRunning = campaign.status === "running"
  const isPaused = campaign.status === "paused"
  const isFinished = campaign.status === "completed" || campaign.status === "failed"

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-200">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {campaign.total_items} items &middot; Concurrency: {campaign.concurrency}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isRunning && (
              <button
                onClick={() => handleAction("pause")}
                disabled={actionLoading}
                className="bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                Pause
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => handleAction("resume")}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                Resume
              </button>
            )}
            {(isRunning || isPaused) && (
              <button
                onClick={() => handleAction("cancel")}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            {progress.failed > 0 && (
              <button
                onClick={() => handleAction("retry_failed")}
                disabled={actionLoading}
                className="bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
              >
                Retry Failed ({progress.failed})
              </button>
            )}
            {progress.completed > 0 && (
              <a
                href={`/api/agents/batch/${campaignId}/outputs?status=completed`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm inline-block"
              >
                Download ({progress.completed})
              </a>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <CampaignProgress {...progress} />
        </div>

        {/* Status badge */}
        {isFinished && (
          <div className={`mb-6 p-4 rounded-lg ${
            campaign.status === "completed"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}>
            Campaign {campaign.status}
          </div>
        )}

        {/* Items table */}
        <CampaignItemsTable items={items} />
      </div>
    </div>
  )
}
