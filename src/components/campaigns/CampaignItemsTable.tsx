"use client"

interface BatchItemRow {
  id: string
  rowIndex: number
  rowData: Record<string, unknown>
  status: string
  outputUrls: string[]
  error: string | null
  retryCount: number
}

interface CampaignItemsTableProps {
  items: BatchItemRow[]
  onRetryItem?: (itemId: string) => void
}

const STATUS_ICONS: Record<string, string> = {
  completed: "\u2705",
  running: "\u23F3",
  failed: "\u274C",
  pending: "\u23F8\uFE0F",
  skipped: "\u23ED\uFE0F",
}

export function CampaignItemsTable({ items, onRetryItem }: CampaignItemsTableProps) {
  // Extract column names from first item's row data
  const columns = items.length > 0
    ? Object.keys(items[0].rowData).slice(0, 4) // Show max 4 data columns
    : []

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-700 text-left text-xs text-neutral-400 uppercase tracking-wider">
              <th className="px-4 py-3 w-12">#</th>
              {columns.map(col => (
                <th key={col} className="px-4 py-3">{col}</th>
              ))}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Output</th>
              <th className="px-4 py-3 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-b border-neutral-700/50 hover:bg-neutral-700/30"
              >
                <td className="px-4 py-3 text-sm text-neutral-400">{item.rowIndex + 1}</td>
                {columns.map(col => (
                  <td key={col} className="px-4 py-3 text-sm text-neutral-300 max-w-[200px] truncate">
                    {String(item.rowData[col] ?? "-")}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <span className="text-sm">
                    {STATUS_ICONS[item.status] || ""} {item.status}
                  </span>
                  {item.error && (
                    <p className="text-xs text-red-400 mt-0.5 truncate max-w-[200px]" title={item.error}>
                      {item.error}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.outputUrls.length > 0 ? (
                    <a
                      href={item.outputUrls[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-sm text-neutral-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {item.status === "failed" && item.retryCount < 3 && onRetryItem && (
                    <button
                      onClick={() => onRetryItem(item.id)}
                      className="text-xs text-yellow-400 hover:text-yellow-300"
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
