"use client"

interface CampaignProgressProps {
  completed: number
  failed: number
  running: number
  pending: number
  total: number
}

export function CampaignProgress({ completed, failed, running, total }: CampaignProgressProps) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <div className="flex items-center gap-4">
          <span className="text-green-400">{completed} completed</span>
          {running > 0 && <span className="text-blue-400">{running} running</span>}
          {failed > 0 && <span className="text-red-400">{failed} failed</span>}
        </div>
        <span className="text-neutral-300 font-medium">{percent}%</span>
      </div>
      <div className="w-full bg-neutral-700 rounded-full h-3 overflow-hidden">
        <div className="h-full flex">
          <div
            className="bg-green-500 transition-all"
            style={{ width: `${(completed / Math.max(total, 1)) * 100}%` }}
          />
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${(running / Math.max(total, 1)) * 100}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${(failed / Math.max(total, 1)) * 100}%` }}
          />
        </div>
      </div>
      <div className="text-xs text-neutral-500 mt-1">
        {completed + failed}/{total} processed
      </div>
    </div>
  )
}
