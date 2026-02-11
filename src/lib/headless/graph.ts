/**
 * Headless Graph Utilities
 *
 * Pure re-implementations of workflow graph functions for server-side use.
 * No Zustand, no React — operates on plain JSON workflow data.
 */

import type {
  WorkflowNodeJSON,
  WorkflowEdgeJSON,
  WorkflowFileJSON,
  LevelGroup,
  ResolvedNodeInputs,
  ParameterOverrides,
} from "./types";

// ---------------------------------------------------------------------------
// groupNodesByLevel — Kahn's algorithm (mirrors workflowStore)
// ---------------------------------------------------------------------------

/**
 * Groups nodes by dependency level using topological sort.
 * Level 0 = nodes with no incoming edges (roots).
 * Nodes at the same level can be executed in parallel.
 */
export function groupNodesByLevel(
  nodes: WorkflowNodeJSON[],
  edges: WorkflowEdgeJSON[],
): LevelGroup[] {
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adjList.set(n.id, []);
  }

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    adjList.get(e.source)?.push(e.target);
  }

  const levels: LevelGroup[] = [];
  let currentLevel = nodes
    .filter((n) => inDegree.get(n.id) === 0)
    .map((n) => n.id);

  let levelNum = 0;
  while (currentLevel.length > 0) {
    levels.push({ level: levelNum, nodeIds: [...currentLevel] });

    const nextLevel: string[] = [];
    for (const nodeId of currentLevel) {
      for (const child of adjList.get(nodeId) || []) {
        const newDegree = (inDegree.get(child) || 1) - 1;
        inDegree.set(child, newDegree);
        if (newDegree === 0) {
          nextLevel.push(child);
        }
      }
    }

    currentLevel = nextLevel;
    levelNum++;
  }

  return levels;
}

// ---------------------------------------------------------------------------
// getConnectedInputs — server-side (no Zustand)
// ---------------------------------------------------------------------------

/** Map of node ID -> executed output data (images/text produced by that node). */
export type NodeOutputMap = Map<
  string,
  { image?: string; text?: string; video?: string }
>;

/**
 * Resolves the inputs for a given node by walking its incoming edges.
 * Uses `nodeOutputs` (populated during execution) instead of Zustand state.
 */
export function getConnectedInputs(
  nodeId: string,
  nodes: WorkflowNodeJSON[],
  edges: WorkflowEdgeJSON[],
  nodeOutputs: NodeOutputMap,
): ResolvedNodeInputs {
  const images: string[] = [];
  let text: string | null = null;

  const incomingEdges = edges.filter((e) => e.target === nodeId);

  for (const edge of incomingEdges) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;

    // First check runtime outputs from execution
    const runtimeOutput = nodeOutputs.get(edge.source);

    // Determine what the source node produces
    let outputImage: string | undefined;
    let outputText: string | undefined;

    if (runtimeOutput) {
      outputImage = runtimeOutput.image;
      outputText = runtimeOutput.text;
    } else {
      // Fall back to node data (for imageInput/prompt nodes that have static data)
      outputImage = extractStaticImage(sourceNode);
      outputText = extractStaticText(sourceNode);
    }

    // Route to appropriate input based on handle type
    const handleId = edge.targetHandle;
    const isTextTarget = handleId === "text" || handleId?.startsWith("text-");

    if (isTextTarget && outputText) {
      text = outputText;
    } else if (outputImage) {
      images.push(outputImage);
    } else if (outputText && !isTextTarget) {
      // Text connected to non-text handle (unusual but handle gracefully)
      text = outputText;
    }
  }

  return { images, text };
}

/** Extract static image from node data (for pre-resolved imageInput nodes). */
function extractStaticImage(node: WorkflowNodeJSON): string | undefined {
  const d = node.data;
  switch (node.type) {
    case "imageInput":
      return (d.image as string) || undefined;
    case "annotation":
      return (d.outputImage as string) || undefined;
    case "nanoBanana":
      return (d.outputImage as string) || undefined;
    default:
      return undefined;
  }
}

/** Extract static text from node data (for pre-resolved prompt nodes). */
function extractStaticText(node: WorkflowNodeJSON): string | undefined {
  const d = node.data;
  switch (node.type) {
    case "prompt":
      return (d.prompt as string) || undefined;
    case "promptConstructor":
      return (d.outputText as string) || (d.template as string) || undefined;
    case "llmGenerate":
      return (d.outputText as string) || undefined;
    default:
      return undefined;
  }
}

// ---------------------------------------------------------------------------
// Variable Resolution
// ---------------------------------------------------------------------------

/** Regex to match {{variableName}} slots. */
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

/**
 * Resolve a single template string, replacing {{var}} with override values.
 */
export function resolveTemplate(
  template: string,
  overrides: Record<string, string>,
): string {
  return template.replace(VARIABLE_PATTERN, (match, varName) => {
    return overrides[varName] !== undefined ? overrides[varName] : match;
  });
}

/**
 * Apply parameter overrides to workflow nodes.
 *
 * Resolution order for images:
 *   parameters.images[variableName] -> node.data.imageUrl (fetch later) -> node.data.image
 *
 * Resolution order for prompts:
 *   parameters.prompts[variableName] -> node.data.prompt
 *
 * Returns a new workflow with variables filled in. Does not mutate the input.
 */
export function resolveVariables(
  workflow: WorkflowFileJSON,
  parameters?: ParameterOverrides,
): WorkflowFileJSON {
  if (!parameters) return workflow;

  const imageOverrides = parameters.images || {};
  const promptOverrides = parameters.prompts || {};

  const resolvedNodes = workflow.nodes.map((node) => {
    const data = { ...node.data };
    // Variable name is either explicit or defaults to node ID
    const varName = (data.variableName as string) || node.id;

    switch (node.type) {
      case "imageInput": {
        // Image override: parameter -> imageUrl -> embedded image
        if (imageOverrides[varName]) {
          data.imageUrl = imageOverrides[varName];
          // Clear embedded image so engine fetches from URL
          data.image = null;
        } else if (typeof data.imageUrl === "string" && data.imageUrl.startsWith("{{")) {
          // Resolve template in imageUrl field
          const resolved = resolveTemplate(data.imageUrl, imageOverrides);
          if (resolved !== data.imageUrl) {
            data.imageUrl = resolved;
            data.image = null;
          }
        }
        break;
      }

      case "prompt": {
        // Prompt override: parameter -> embedded prompt
        if (promptOverrides[varName]) {
          data.prompt = promptOverrides[varName];
        } else if (typeof data.prompt === "string") {
          data.prompt = resolveTemplate(data.prompt, promptOverrides);
        }
        break;
      }

      case "promptConstructor": {
        // Resolve {{vars}} in the template
        if (typeof data.template === "string") {
          data.template = resolveTemplate(data.template, promptOverrides);
        }
        break;
      }

      default:
        break;
    }

    return { ...node, data };
  });

  return { ...workflow, nodes: resolvedNodes };
}

/**
 * Extract variable names referenced in a workflow's nodes.
 * Useful for building the variable schema from a workflow definition.
 */
export function extractVariableNames(workflow: WorkflowFileJSON): string[] {
  const vars = new Set<string>();

  for (const node of workflow.nodes) {
    const d = node.data;

    // Check imageUrl for {{var}} patterns
    if (typeof d.imageUrl === "string") {
      for (const match of d.imageUrl.matchAll(VARIABLE_PATTERN)) {
        vars.add(match[1]);
      }
    }

    // Check prompt for {{var}} patterns
    if (typeof d.prompt === "string") {
      for (const match of d.prompt.matchAll(VARIABLE_PATTERN)) {
        vars.add(match[1]);
      }
    }

    // Check template for {{var}} patterns
    if (typeof d.template === "string") {
      for (const match of d.template.matchAll(VARIABLE_PATTERN)) {
        vars.add(match[1]);
      }
    }
  }

  return [...vars];
}

// ---------------------------------------------------------------------------
// Utility: chunk array for concurrency batching
// ---------------------------------------------------------------------------

export function chunk<T>(array: T[], size: number): T[][] {
  if (!Number.isFinite(size) || size <= 0) {
    throw new RangeError(`chunk size must be > 0, got ${size}`);
  }
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
