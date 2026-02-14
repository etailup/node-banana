/**
 * Prompt Optimizer Agent
 *
 * Generates N prompt variations, runs each through image generation,
 * then uses a vision LLM to score results and rank by quality.
 */

import { createClient } from "@supabase/supabase-js"
import type { PromptVariation, VariationScores } from "./types"

// Singleton service-role client
let _supabase: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
    }
    _supabase = createClient(url, key)
  }
  return _supabase
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function table(name: string) {
  return getSupabase().from(name) as any
}

// ---------------------------------------------------------------------------
// Prompt Variation Storage
// ---------------------------------------------------------------------------

export async function createVariations(
  agentJobId: string,
  prompts: string[]
): Promise<PromptVariation[]> {
  const rows = prompts.map((prompt, i) => ({
    agent_job_id: agentJobId,
    variation_index: i,
    prompt,
    status: "pending",
  }))

  const { data, error } = await table("prompt_variations")
    .insert(rows)
    .select()

  if (error) throw new Error(`Failed to create variations: ${error.message}`)
  return (data || []) as PromptVariation[]
}

export async function updateVariation(
  id: string,
  updates: Partial<Pick<PromptVariation, "status" | "headless_job_id" | "image_url" | "scores">>
): Promise<void> {
  const { error } = await table("prompt_variations")
    .update(updates)
    .eq("id", id)

  if (error) throw new Error(`Failed to update variation: ${error.message}`)
}

export async function getVariations(agentJobId: string): Promise<PromptVariation[]> {
  const { data, error } = await table("prompt_variations")
    .select("*")
    .eq("agent_job_id", agentJobId)
    .order("variation_index", { ascending: true })

  if (error) throw new Error(`Failed to get variations: ${error.message}`)
  return (data || []) as PromptVariation[]
}

// ---------------------------------------------------------------------------
// LLM: Generate Prompt Variations
// ---------------------------------------------------------------------------

const VARIATION_SYSTEM_PROMPT = `You are an expert prompt engineer for AI image generation.
Given a base prompt, generate creative variations that explore different angles while maintaining the core intent.

Return ONLY a JSON array of prompt strings. Each should:
- Maintain the core subject/intent
- Vary style descriptors, composition, lighting, or mood
- Be self-contained (no references to other variations)
- Be detailed and descriptive for best image generation results`

export async function generateVariations(
  basePrompt: string,
  count: number,
  referenceImage?: string
): Promise<string[]> {
  const baseUrl = process.env.HEADLESS_BASE_URL || "http://localhost:3000"

  const prompt = `Generate ${count} creative variations of this prompt:\n\n"${basePrompt}"\n\n${referenceImage ? "A reference image is provided for style/content guidance." : ""}Return a JSON array of ${count} prompt strings.`

  const response = await fetch(`${baseUrl}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      images: referenceImage ? [referenceImage] : undefined,
      provider: "google",
      model: "gemini-2.5-flash",
      temperature: 0.8,
      maxTokens: 4096,
      systemPrompt: VARIATION_SYSTEM_PROMPT,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`LLM API failed: HTTP ${response.status}`)
  }

  const result = await response.json()
  if (!result.success || !result.text) {
    throw new Error(result.error || "LLM returned no text")
  }

  // Parse JSON array from response
  const jsonText = extractJsonArray(result.text)
  const parsed = JSON.parse(jsonText)

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("LLM returned invalid variations array")
  }

  return parsed.slice(0, count).map(String)
}

// ---------------------------------------------------------------------------
// Vision LLM: Score Image
// ---------------------------------------------------------------------------

export async function scoreImage(
  imageUrl: string,
  prompt: string,
  referenceImage?: string
): Promise<{ scores: VariationScores; issues: string[]; suggestion: string }> {
  const baseUrl = process.env.HEADLESS_BASE_URL || "http://localhost:3000"

  const scoringPrompt = `Score this AI-generated image on a scale of 0.0 to 1.0 for each dimension:

1. prompt_adherence: Does the image match the prompt "${prompt}"?
2. aesthetics: Is the image visually appealing? Good composition, lighting, color?
3. artifacts: Are there visual artifacts, distortions, or anomalies? (1.0 = no artifacts)
4. coherence: Is the image internally consistent? No anatomical errors, impossible physics?
${referenceImage ? '5. reference_similarity: How similar is this to the reference image in style/content?' : ''}

Also identify any specific issues and provide a brief improvement suggestion.

Respond with JSON:
{
  "scores": { "prompt_adherence": 0.X, "aesthetics": 0.X, "artifacts": 0.X, "coherence": 0.X, "overall": 0.X${referenceImage ? ', "reference_similarity": 0.X' : ''} },
  "issues": ["issue 1", "issue 2"],
  "suggestion": "brief suggestion"
}`

  const images = [imageUrl]
  if (referenceImage) images.push(referenceImage)

  const response = await fetch(`${baseUrl}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: scoringPrompt,
      images,
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

  const jsonText = extractJsonObject(result.text)
  const parsed = JSON.parse(jsonText)

  return {
    scores: parsed.scores as VariationScores,
    issues: parsed.issues || [],
    suggestion: parsed.suggestion || "",
  }
}

// ---------------------------------------------------------------------------
// Cost Estimation
// ---------------------------------------------------------------------------

export function estimateOptimizerCost(
  count: number,
  model: string = "nano-banana"
): { generations: number; llmCalls: number; estimatedCost: string } {
  const genCosts: Record<string, number> = {
    "nano-banana": 0.05,
    "nano-banana-pro": 0.10,
  }
  const genCost = (genCosts[model] || 0.05) * count
  const scoreCost = 0.01 * count
  const variationCost = 0.005

  return {
    generations: count,
    llmCalls: count + 1,
    estimatedCost: `$${(genCost + scoreCost + variationCost).toFixed(2)}`,
  }
}

// ---------------------------------------------------------------------------
// Main Optimization Loop
// ---------------------------------------------------------------------------

export interface OptimizeConfig {
  agentJobId: string
  basePrompt: string
  count: number
  model?: string
  referenceImage?: string
  workflowId?: string
  aspectRatio?: string
}

/**
 * Run the full optimization pipeline:
 * 1. Generate prompt variations via LLM
 * 2. Generate images for each variation
 * 3. Score each image with vision LLM
 * 4. Store results and return ranked
 */
export async function runOptimization(config: OptimizeConfig): Promise<void> {
  const baseUrl = process.env.HEADLESS_BASE_URL || "http://localhost:3000"
  const model = config.model || "nano-banana"

  // 1. Generate variations
  const prompts = await generateVariations(
    config.basePrompt,
    config.count,
    config.referenceImage
  )

  // 2. Create variation records
  const variations = await createVariations(config.agentJobId, prompts)

  // 3. Generate image for each variation
  for (const variation of variations) {
    try {
      await updateVariation(variation.id, { status: "generating" })

      const genResponse = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: config.referenceImage ? [config.referenceImage] : [],
          prompt: variation.prompt,
          model,
          aspectRatio: config.aspectRatio || "1:1",
        }),
        signal: AbortSignal.timeout(300000),
      })

      if (!genResponse.ok) {
        await updateVariation(variation.id, { status: "failed" })
        continue
      }

      const genResult = await genResponse.json()
      if (!genResult.success || !genResult.image) {
        await updateVariation(variation.id, { status: "failed" })
        continue
      }

      await updateVariation(variation.id, {
        image_url: genResult.image,
        status: "scoring",
      })

      // 4. Score the generated image
      try {
        const scoreResult = await scoreImage(
          genResult.image,
          variation.prompt,
          config.referenceImage
        )

        await updateVariation(variation.id, {
          scores: scoreResult.scores,
          status: "completed",
        })
      } catch {
        // Scoring failed but image was generated — mark completed without scores
        await updateVariation(variation.id, { status: "completed" })
      }
    } catch {
      await updateVariation(variation.id, { status: "failed" })
    }
  }
}

// ---------------------------------------------------------------------------
// JSON Extraction Helpers
// ---------------------------------------------------------------------------

function extractJsonArray(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const arrayMatch = text.match(/\[[\s\S]*\]/)
  if (arrayMatch) return arrayMatch[0]

  return text.trim()
}

function extractJsonObject(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) return objectMatch[0]

  return text.trim()
}
