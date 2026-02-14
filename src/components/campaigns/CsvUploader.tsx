"use client"

import { useState, useRef } from "react"

interface CsvUploaderProps {
  onDataLoaded: (data: Record<string, unknown>[], columns: string[]) => void
}

export function CsvUploader({ onDataLoaded }: CsvUploaderProps) {
  const [preview, setPreview] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): { data: Record<string, unknown>[]; columns: string[] } => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row")

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
    const data: Record<string, unknown>[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""))
      if (values.length !== headers.length) continue

      const row: Record<string, unknown> = {}
      headers.forEach((header, j) => {
        row[header] = values[j]
      })
      data.push(row)
    }

    return { data, columns: headers }
  }

  const handleFile = async (file: File) => {
    setError(null)

    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)")
      return
    }

    try {
      const text = await file.text()
      const { data, columns: cols } = parseCSV(text)

      if (data.length === 0) {
        setError("CSV has no data rows")
        return
      }

      setColumns(cols)
      setPreview(data.slice(0, 3))
      setFileName(file.name)
      onDataLoaded(data, cols)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV")
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-neutral-600 rounded-lg p-6 text-center cursor-pointer hover:border-neutral-500 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {fileName ? (
          <div>
            <p className="text-sm text-neutral-200">{fileName}</p>
            <p className="text-xs text-neutral-400 mt-1">{preview.length > 0 ? `${columns.length} columns detected` : ""}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-300">Click to upload CSV</p>
            <p className="text-xs text-neutral-500 mt-1">Max 5MB</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {preview.length > 0 && (
        <div className="bg-neutral-700/30 border border-neutral-600 rounded-lg overflow-hidden">
          <div className="px-3 py-2 text-xs text-neutral-400 border-b border-neutral-600">
            Preview (first 3 rows)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-600">
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2 text-left text-neutral-400">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-neutral-700/50">
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 text-neutral-300 max-w-[150px] truncate">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
