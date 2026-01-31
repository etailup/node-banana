/**
 * Subgraph Extractor
 *
 * Splits a workflow into a detailed selected subgraph and a summary of the rest,
 * based on React Flow's node.selected property. When users select nodes before
 * chatting, the LLM gets focused context on the selection with a lightweight
 * summary of the surrounding workflow.
 */

import type { WorkflowNode } from "@/types/nodes";
import type { WorkflowEdge } from "@/types/workflow";

/**
 * Boundary connection between selected and unselected nodes
 */
export interface BoundaryConnection {
  direction: "incoming" | "outgoing";
  selectedNodeId: string;
  otherNodeId: string;
  handleType: string;
}

/**
 * Result of subgraph extraction
 */
export interface SubgraphResult {
  // When selectedNodeIds is empty, these are ALL nodes/edges (no scoping)
  selectedNodes: WorkflowNode[];
  selectedEdges: WorkflowEdge[];
  // Summary of unselected nodes (null when no selection)
  restSummary: {
    nodeCount: number;
    typeBreakdown: Record<string, number>;
    boundaryConnections: BoundaryConnection[];
  } | null;
  isScoped: boolean; // true when selectedNodeIds is non-empty
}

/**
 * Extract subgraph based on selected node IDs
 *
 * @param nodes - All workflow nodes
 * @param edges - All workflow edges
 * @param selectedNodeIds - IDs of selected nodes
 * @returns Subgraph result with selected nodes/edges and rest summary
 */
export function extractSubgraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  selectedNodeIds: string[]
): SubgraphResult {
  // TODO: Implement
  throw new Error("Not implemented");
}
