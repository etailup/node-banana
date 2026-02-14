"use client"

import { useState } from "react"

interface OptimizerResult {
  rank: number
  variationId: string
  prompt: string
  imageUrl: string | null
  scores: {
    overall: number
    prompt_adherence: number
    aesthetics: number
    artifacts: number
    coherence: number
  } | null
  status: string
}

interface OptimizerResultsProps {
  results: OptimizerResult[]
  basePrompt: string
  progress: { completed: number; failed: number; total: number }
  status: string
  onApplyPrompt?: (prompt: string) => void
  onClose: () => void
}

const SCORE_LABELS: Record<string, string> = {
  prompt_adherence: "Adherence",
  aesthetics: "Aesthetics",
  artifacts: "Artifacts",
  coherence: "Coherence",
}

export function OptimizerResults({
  results,
  basePrompt,
  progress,
  status,
  onApplyPrompt,
  onClose,
}: OptimizerResultsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const selected = results[selectedIndex]

  const isRunning = status === "running"

  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
        <h3 className="text-sm font-medium text-neutral-200">
          Prompt Optimizer Results
        </h3>
        <div className="flex items-center gap-2">
          {results.length > 0 && onApplyPrompt && (
            <button
              onClick={() => onApplyPrompt(results[0].prompt)}
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded"
            >
              Apply Best
            </button>
          )}
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="px-4 py-2 bg-neutral-750">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
            <span>Generating & scoring...</span>
            <span>{progress.completed}/{progress.total}</span>
          </div>
          <div className="w-full bg-neutral-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Image gallery */}
      <div className="p-4">
        {results.length === 0 && isRunning && (
          <div className="text-center py-8 text-neutral-500 text-sm">
            Generating variations...
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {results.map((r, i) => (
                <button
                  key={r.variationId}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-colors ${
                    i === selectedIndex
                      ? "border-blue-500"
                      : "border-transparent hover:border-neutral-600"
                  }`}
                >
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt={`Variation ${r.rank}`}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-neutral-700 flex items-center justify-center text-neutral-500 text-xs">
                      No image
                    </div>
                  )}
                  {r.scores && (
                    <div className={`absolute top-1 right-1 text-xs font-bold px-1.5 py-0.5 rounded ${
                      r.scores.overall >= 0.85 ? "bg-green-500 text-white" :
                      r.scores.overall >= 0.70 ? "bg-yellow-500 text-black" :
                      "bg-red-500 text-white"
                    }`}>
                      {Math.round(r.scores.overall * 100)}%
                    </div>
                  )}
                  {i === 0 && (
                    <div className="absolute top-1 left-1 text-xs bg-yellow-500 text-black font-bold px-1.5 py-0.5 rounded">
                      Best
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Selected detail */}
            {selected && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-neutral-400 mb-1">Prompt:</div>
                  <p className="text-sm text-neutral-200 bg-neutral-700/50 rounded px-3 py-2">
                    {selected.prompt}
                  </p>
                </div>

                {selected.scores && (
                  <div className="space-y-1.5">
                    {Object.entries(SCORE_LABELS).map(([key, label]) => {
                      const score = selected.scores?.[key as keyof typeof selected.scores]
                      if (score === undefined) return null
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400 w-20">{label}</span>
                          <div className="flex-1 bg-neutral-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 0.85 ? "bg-green-500" :
                                score >= 0.70 ? "bg-yellow-500" :
                                "bg-red-500"
                              }`}
                              style={{ width: `${score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-300 w-10 text-right">
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {onApplyPrompt && (
                  <button
                    onClick={() => onApplyPrompt(selected.prompt)}
                    className="w-full text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2"
                  >
                    Apply This Prompt
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
