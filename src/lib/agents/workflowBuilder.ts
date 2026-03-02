/**
 * Workflow Builder Agent
 *
 * Uses an LLM to generate workflow definitions from natural language descriptions.
 * Produces valid node graphs with auto-layout positioning.
 */

import type {
  WorkflowNodeJSON,
  WorkflowEdgeJSON,
  WorkflowFileJSON,
  WorkflowVariableMap,
} from "@/lib/headless/types"
import { groupNodesByLevel } from "@/lib/headless/graph"

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const BUILDER_SYSTEM_PROMPT = `You are a workflow builder for Node Banana, an AI image generation tool.
Given a user description, generate a workflow as a JSON object with nodes and edges.

## Available Node Types

- imageInput: Upload/load images. Output handle: "image".
  Data: { variableName?: "string" } — set variableName for template variables like {{productImage}}.

- prompt: Text prompt for generation. Output handle: "text".
  Data: { prompt: "the prompt text", variableName?: "string" }.

- nanoBanana: AI image generation. Input handles: "image" (optional, multiple), "text" (required). Output handle: "image".
  Data: { model: "nano-banana" | "nano-banana-pro", aspectRatio: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9", resolution: "1K" | "2K" | "4K" }.

- llmGenerate: AI text generation. Input handles: "text" (required), "image" (optional). Output handle: "text".
  Data: { model: "gemini-2.5-flash", temperature: 0.7 }.

- output: Final result display. Input handles: "image". No output.
  Data: {}.

## Connection Rules
- image outputs connect to image inputs
- text outputs connect to text inputs
- Each edge needs: id, source, target, sourceHandle, targetHandle

## Template Variables
- Use {{variableName}} syntax in prompt text or imageInput variableName for parameterized workflows
- Return detected variables in the "variables" field

## Response Format
Return ONLY a JSON object (no markdown, no explanation):
{
  "nodes": [{ "id": "node-1", "type": "imageInput", "data": {} }, ...],
  "edges": [{ "id": "edge-1", "source": "node-1", "target": "node-3", "sourceHandle": "image", "targetHandle": "image" }, ...],
  "variables": { "productImage": { "type": "image", "description": "Product photo" } }
}

## Common Patterns
- Simple generation: imageInput → prompt → nanoBanana → output
- Multiple variations: imageInput → [prompt1, prompt2, prompt3] → [gen1, gen2, gen3] → [out1, out2, out3]
- Text-enhanced: prompt → llmGenerate (expand prompt) → nanoBanana → output
- Template: imageInput(variableName) + prompt({{var}}) → nanoBanana → output`

// ---------------------------------------------------------------------------
// Auto-Layout
// ---------------------------------------------------------------------------

const X_GAP = 280
const Y_GAP = 120

/**
 * Position nodes in a left-to-right layout based on dependency levels.
 */
export function autoLayoutNodes(
  nodes: WorkflowNodeJSON[],
  edges: WorkflowEdgeJSON[]
): WorkflowNodeJSON[] {
  const levels = groupNodesByLevel(nodes, edges)
  let x = 100

  for (const level of levels) {
    const startY = -(level.nodeIds.length - 1) * Y_GAP / 2
    level.nodeIds.forEach((nodeId, i) => {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        node.position = { x, y: startY + i * Y_GAP }
      }
    })
    x += X_GAP
  }

  return nodes
}

// ---------------------------------------------------------------------------
// Build Workflow
// ---------------------------------------------------------------------------

export interface BuildWorkflowResult {
  workflow: WorkflowFileJSON
  variables: WorkflowVariableMap
}

/**
 * Generate a workflow from a natural language description using LLM.
 */
export async function buildWorkflow(
  description: string,
  model: string = "gemini-2.5-flash"
): Promise<BuildWorkflowResult> {
  const baseUrl = process.env.HEADLESS_BASE_URL || "http://localhost:3000"

  const response = await fetch(`${baseUrl}/api/llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: `Build a workflow for: ${description}`,
      provider: "google",
      model,
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt: BUILDER_SYSTEM_PROMPT,
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

  // Parse JSON from LLM response (may be wrapped in markdown code fences)
  const jsonText = extractJson(result.text)
  let parsed: { nodes?: unknown[]; edges?: unknown[]; variables?: Record<string, unknown> }

  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error("Failed to parse workflow JSON from LLM response")
  }

  if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
    throw new Error("LLM returned empty or invalid nodes array")
  }

  // Normalize nodes (ensure positions exist before layout)
  const rawNodes = parsed.nodes as Record<string, unknown>[]
  const nodes: WorkflowNodeJSON[] = rawNodes.map((n, i) => ({
    id: (n.id as string) || `node-${i + 1}`,
    type: (n.type as string) || "prompt",
    position: { x: 0, y: 0 },
    data: (n.data as Record<string, unknown>) || {},
  }))

  const rawEdges = (parsed.edges || []) as Record<string, unknown>[]
  const edges: WorkflowEdgeJSON[] = rawEdges.map((e, i) => ({
    id: (e.id as string) || `edge-${i + 1}`,
    source: e.source as string,
    target: e.target as string,
    sourceHandle: (e.sourceHandle as string) || null,
    targetHandle: (e.targetHandle as string) || null,
  }))

  // Filter out edges that reference non-existent nodes
  const nodeIds = new Set(nodes.map(n => n.id))
  const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

  // Auto-layout
  autoLayoutNodes(nodes, validEdges)

  // Extract variables
  const variables: WorkflowVariableMap = {}
  if (parsed.variables && typeof parsed.variables === "object") {
    for (const [key, val] of Object.entries(parsed.variables)) {
      const v = val as Record<string, unknown>
      variables[key] = {
        type: (v.type as "image" | "text") || "text",
        description: (v.description as string) || undefined,
      }
    }
  }

  return {
    workflow: { nodes, edges: validEdges },
    variables,
  }
}

/**
 * Extract JSON from a string that may contain markdown code fences.
 */
function extractJson(text: string): string {
  // Try to extract from ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  // Try to find a JSON object directly
  const objectMatch = text.match(/\{[\s\S]*\}/)
  if (objectMatch) return objectMatch[0]

  return text.trim()
}
