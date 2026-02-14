"use client"

interface QualityScores {
  artifacts: number
  text_readability: number
  composition: number
  prompt_alignment: number
  overall: number
}

interface QualityDetailModalProps {
  grade: "A" | "B" | "C" | "F"
  scores: QualityScores
  issues: string[]
  suggestion: string
  onClose: () => void
  onAcceptAnyway?: () => void
  onRegenerateWithFix?: (suggestion: string) => void
}

const SCORE_LABELS: Record<string, string> = {
  artifacts: "Artifacts",
  text_readability: "Text Readability",
  composition: "Composition",
  prompt_alignment: "Prompt Alignment",
}

const GRADE_COLORS: Record<string, string> = {
  A: "text-green-400",
  B: "text-yellow-400",
  C: "text-orange-400",
  F: "text-red-400",
}

export function QualityDetailModal({
  grade,
  scores,
  issues,
  suggestion,
  onClose,
  onAcceptAnyway,
  onRegenerateWithFix,
}: QualityDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-medium text-neutral-200">Quality Review</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200 p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Overall grade */}
          <div className="text-center">
            <span className={`text-3xl font-bold ${GRADE_COLORS[grade] || "text-neutral-400"}`}>
              {grade}
            </span>
            <span className="text-lg text-neutral-400 ml-2">
              ({Math.round(scores.overall * 100)}%)
            </span>
          </div>

          {/* Score bars */}
          <div className="space-y-2">
            {Object.entries(SCORE_LABELS).map(([key, label]) => {
              const score = scores[key as keyof QualityScores]
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400 w-28">{label}</span>
                  <div className="flex-1 bg-neutral-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        score >= 0.85 ? "bg-green-500" :
                        score >= 0.70 ? "bg-yellow-500" :
                        score >= 0.50 ? "bg-orange-500" :
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

          {/* Issues */}
          {issues.length > 0 && (
            <div>
              <div className="text-xs text-neutral-400 mb-1">Issues:</div>
              <ul className="space-y-1">
                {issues.map((issue, i) => (
                  <li key={i} className="text-sm text-neutral-300 flex items-start gap-1.5">
                    <span className="text-neutral-500 mt-0.5">&#x2022;</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestion */}
          {suggestion && (
            <div className="bg-neutral-700/30 border border-neutral-600 rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-1">Suggestion:</div>
              <p className="text-sm text-neutral-200">{suggestion}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {onAcceptAnyway && (
              <button
                onClick={onAcceptAnyway}
                className="flex-1 text-sm bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg px-4 py-2"
              >
                Accept Anyway
              </button>
            )}
            {onRegenerateWithFix && suggestion && (
              <button
                onClick={() => onRegenerateWithFix(suggestion)}
                className="flex-1 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2"
              >
                Regenerate with Fix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
