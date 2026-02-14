/**
 * Quality Review Agent
 *
 * Uses a vision LLM to score AI-generated images across multiple
 * quality dimensions and assign grades.
 */

import type { QualityGrade, QualityScores } from "./types"

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const SCORING_PROMPT = `You are an image quality analyst. Score this AI-generated image.

Scoring dimensions (0.0 to 1.0):
- artifacts: Visual defects, distortions, floating elements, unnatural textures. 1.0 = flawless.
- text_readability: If text is present, is it legible and properly rendered? If no text, score 1.0.
- composition: Balance, focal point, rule-of-thirds, visual hierarchy. 1.0 = excellent composition.
- prompt_alignment: How well does the image match this prompt: "{prompt}". 1.0 = perfect match.
- overall: Weighted average reflecting overall quality.

{brandGuidelines}

Respond with JSON only:
{
  "scores": { "artifacts": 0.X, "text_readability": 0.X, "composition": 0.X, "prompt_alignment": 0.X, "overall": 0.X },
  "issues": ["description of issue 1", "description of issue 2"],
  "suggestion": "brief suggestion to improve this image"
}`

export interface ReviewInput {
  url: string
  prompt?: string
}

export interface ReviewResult {
  imageUrl: string
  scores: QualityScores
  grade: QualityGrade
  passed: boolean
  issues: string[]
  suggestion: string
}

/**
 * Score a single image using vision LLM.
 */
export async function reviewImage(
  imageUrl: string,
  prompt: string = "",
  brandGuidelines?: string,
  threshold: number = 0.70
): Promise<ReviewResult> {
  const baseUrl = process.env.HEADLESS_BASE_URL || "http://localhost:3000"

  const scoringPrompt = SCORING_PROMPT
    .replace("{prompt}", prompt)
    .replace(
      "{brandGuidelines}",
      brandGuidelines
        ? `Brand guidelines to check against:\n${brandGuidelines}`
        : ""
    )

  const response = await fetch(`${baseUrl}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: scoringPrompt,
      images: [imageUrl],
      provider: "google",
      model: "gemini-2.5-flash",
      temperature: 0.2,
      maxTokens: 1024,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Vision LLM failed: HTTP ${response.status}`)
  }

  const result = await response.json()
  if (!result.success || !result.text) {
    throw new Error(result.error || "Vision LLM returned no text")
  }

  // Parse JSON
  const jsonText = extractJson(result.text)
  const parsed = JSON.parse(jsonText)

  const scores: QualityScores = {
    artifacts: clamp(parsed.scores?.artifacts ?? 0.5),
    text_readability: clamp(parsed.scores?.text_readability ?? 1.0),
    composition: clamp(parsed.scores?.composition ?? 0.5),
    prompt_alignment: clamp(parsed.scores?.prompt_alignment ?? 0.5),
    overall: clamp(parsed.scores?.overall ?? 0.5),
  }

  const grade = scoreToGrade(scores.overall)
  const passed = scores.overall >= threshold

  return {
    imageUrl,
    scores,
    grade,
    passed,
    issues: parsed.issues || [],
    suggestion: parsed.suggestion || "",
  }
}

/**
 * Review multiple images, returning results for all (including failures).
 */
export async function reviewImages(
  images: ReviewInput[],
  brandGuidelines?: string,
  threshold: number = 0.70
): Promise<ReviewResult[]> {
  const results: ReviewResult[] = []

  for (const img of images) {
    try {
      const result = await reviewImage(
        img.url,
        img.prompt || "",
        brandGuidelines,
        threshold
      )
      results.push(result)
    } catch (err) {
      // Return a failed review rather than throwing
      results.push({
        imageUrl: img.url,
        scores: { artifacts: 0, text_readability: 0, composition: 0, prompt_alignment: 0, overall: 0 },
        grade: "F",
        passed: false,
        issues: [`Review failed: ${err instanceof Error ? err.message : String(err)}`],
        suggestion: "",
      })
    }
  }

  return results
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreToGrade(overall: number): QualityGrade {
  if (overall >= 0.85) return "A"
  if (overall >= 0.70) return "B"
  if (overall >= 0.50) return "C"
  return "F"
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) return objectMatch[0]

  return text.trim()
}
