import { WorkflowNode } from "@/types";
import { WorkflowEdge } from "@/types/workflow";
import type {
  NanoBananaNodeData,
  GenerateVideoNodeData,
} from "@/types";

/**
 * Lightweight workflow context for LLM consumption.
 * Strips all base64 image data, history arrays, and internal state.
 */
export interface WorkflowContext {
  nodeCount: number;
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    model?: string;
  }>;
  connections: Array<{
    from: string;
    to: string;
    type: string;
  }>;
  isEmpty: boolean;
}

/**
 * Builds a lightweight workflow context from nodes and edges.
 * Omits all base64 image data, history arrays, and internal state.
 *
 * @param nodes - Current workflow nodes
 * @param edges - Current workflow edges
 * @returns Lightweight workflow context suitable for LLM injection
 */
export function buildWorkflowContext(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowContext {
  const isEmpty = nodes.length === 0;

  // Map nodes to lightweight summaries
  const nodeSummaries = nodes.map((node) => {
    // Extract title: use customTitle if available, otherwise generate from type
    const title =
      (node.data as { customTitle?: string }).customTitle ||
      generateNodeTitle(node.type);

    // For nanoBanana and generateVideo nodes, include model name
    let model: string | undefined;
    if (node.type === "nanoBanana" || node.type === "generateVideo") {
      const nodeData = node.data as NanoBananaNodeData | GenerateVideoNodeData;
      model = nodeData.selectedModel?.displayName;
    }

    return {
      id: node.id,
      type: node.type,
      title,
      ...(model && { model }),
    };
  });

  // Map edges to connection summaries
  const connections = edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    type: edge.sourceHandle || "unknown",
  }));

  return {
    nodeCount: nodes.length,
    nodes: nodeSummaries,
    connections,
    isEmpty,
  };
}

/**
 * Formats workflow context as a readable string for injection into LLM system prompt.
 *
 * @param context - Workflow context
 * @returns Formatted string suitable for system prompt
 */
export function formatContextForPrompt(context: WorkflowContext): string {
  if (context.isEmpty) {
    return "The canvas is currently empty.";
  }

  const lines: string[] = [];

  // List nodes
  lines.push(`Current workflow has ${context.nodeCount} node(s):`);
  for (const node of context.nodes) {
    const modelInfo = node.model ? ` (${node.model})` : "";
    lines.push(`  - ${node.id}: ${node.title}${modelInfo}`);
  }

  // List connections
  if (context.connections.length > 0) {
    lines.push("");
    lines.push("Connections:");
    for (const conn of context.connections) {
      lines.push(`  - ${conn.from} → ${conn.to} (${conn.type})`);
    }
  }

  return lines.join("\n");
}

/**
 * Generates a human-readable title from a node type.
 */
function generateNodeTitle(type: string): string {
  const titles: Record<string, string> = {
    imageInput: "Image Input",
    annotation: "Annotation",
    prompt: "Prompt",
    nanoBanana: "Generate Image",
    generateVideo: "Generate Video",
    llmGenerate: "LLM Generate",
    splitGrid: "Split Grid",
    output: "Output",
  };
  return titles[type] || type;
}
