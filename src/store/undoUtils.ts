import type { WorkflowNode, WorkflowEdge, NodeGroup } from "@/types";
import type { EdgeStyle } from "./workflowStore";

/**
 * Binary data field names that must be excluded from undo snapshots.
 * These fields contain base64 data URLs that are large and unnecessary for undo/redo.
 */
export const BINARY_DATA_KEYS = new Set([
  // Image fields
  "image",
  "outputImage",
  "sourceImage",
  "inputImages",
  "images",
  "imageA",
  "imageB",
  "capturedImage",

  // Video fields
  "outputVideo",
  "video",

  // Audio fields
  "audioFile",
  "outputAudio",
  "audio",

  // 3D fields
  "glbUrl",
  "output3dUrl",

  // History arrays (can be large)
  "imageHistory",
  "videoHistory",
  "audioHistory",
  "globalImageHistory",

  // Thumbnail fields
  "thumbnail",
  "thumbnails",
]);

/**
 * Strips binary data from node data objects to reduce undo snapshot size.
 * Creates new node objects without mutating the originals.
 *
 * @param nodes - Array of workflow nodes
 * @returns New array of nodes with binary data fields removed from node.data
 */
export function stripBinaryData(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map(node => {
    const strippedData: Record<string, any> = {};

    // Copy all non-binary fields
    for (const key of Object.keys(node.data)) {
      if (!BINARY_DATA_KEYS.has(key)) {
        strippedData[key] = node.data[key];
      }
      // Binary fields are simply omitted (will be undefined in the result)
    }

    return {
      ...node,
      data: strippedData as typeof node.data,
    };
  });
}

/**
 * State shape tracked by undo/redo.
 * Only includes fields that affect the workflow graph structure.
 */
export type UndoState = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  edgeStyle: EdgeStyle;
  groups: Record<string, NodeGroup>;
};

/**
 * Partializes the store state for undo tracking.
 * Returns only the fields we want to track in undo history.
 *
 * @param state - Full workflow store state
 * @returns Partialized state with binary data stripped from nodes
 */
export function partializeForUndo(state: any): UndoState {
  return {
    nodes: stripBinaryData(state.nodes),
    edges: state.edges,
    edgeStyle: state.edgeStyle,
    groups: state.groups,
  };
}

/**
 * Fast equality check for undo states using referential comparison.
 * Zustand creates new object/array references on every mutation,
 * so we can use === checks instead of deep equality.
 *
 * @param past - Previous undo state
 * @param current - Current undo state
 * @returns true if states are equal (skip snapshot), false otherwise
 */
export function undoStateEquality(past: UndoState, current: UndoState): boolean {
  // Fast checks for primitive/reference changes
  if (past.edges !== current.edges) return false;
  if (past.edgeStyle !== current.edgeStyle) return false;
  if (past.groups !== current.groups) return false;

  // Check nodes array
  if (past.nodes.length !== current.nodes.length) return false;

  // Check each node reference (Zustand creates new refs on change)
  for (let i = 0; i < past.nodes.length; i++) {
    if (past.nodes[i] !== current.nodes[i]) return false;
  }

  // All checks passed - states are equal
  return true;
}
