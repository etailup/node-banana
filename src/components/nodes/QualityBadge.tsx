"use client"

interface QualityBadgeProps {
  grade: "A" | "B" | "C" | "F"
  score: number
  onClick?: () => void
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500 text-white",
  B: "bg-yellow-500 text-black",
  C: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
}

export function QualityBadge({ grade, score, onClick }: QualityBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-1 right-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer hover:opacity-90 transition-opacity z-10 ${
        GRADE_COLORS[grade] || GRADE_COLORS.F
      }`}
      title={`Quality: ${grade} (${Math.round(score * 100)}%) — Click for details`}
    >
      {grade}
    </button>
  )
}
