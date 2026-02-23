import type { WorkflowNode, WorkflowEdge, NodeGroup } from "@/types";
import type { EdgeStyle } from "./workflowStore";
import { hydrateWorkflowImages } from "@/utils/imageStorage";

/**
 * Mapping of binary data fields to their corresponding ref fields.
 * Only fields with a ref can be recovered from disk after undo/redo,
 * so only these are stripped from snapshots.
 *
 * Fields WITHOUT refs (imageA, imageB, capturedImage, video, images,
 * audioFile, glbUrl, output3dUrl, etc.) are kept in snapshots since
 * they're unrecoverable otherwise.
 */
export const BINARY_TO_REF: Record<string, string> = {
  image: "imageRef",
  outputImage: "outputImageRef",
  sourceImage: "sourceImageRef",
  inputImages: "inputImageRefs",
  outputVideo: "outputVideoRef",
  outputAudio: "outputAudioRef",
};

/**
 * Strips binary data from node data objects to reduce undo snapshot size.
 * Only strips fields that have a corresponding ref (recoverable from disk).
 * Fields without refs are kept in the snapshot since they can't be recovered.
 *
 * @param nodes - Array of workflow nodes
 * @returns New array of nodes with recoverable binary data stripped
 */
export function stripBinaryData(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map(node => {
    const data = node.data as Record<string, any>;
    const strippedData: Record<string, any> = {};

    for (const key of Object.keys(data)) {
      const refField = BINARY_TO_REF[key];
      if (refField && data[refField]) {
        // Has a ref → strip binary (recoverable from disk)
        continue;
      }
      strippedData[key] = data[key];
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

/**
 * Hydrate missing binary data from refs after undo/redo.
 * Uses the existing hydrateWorkflowImages() which checks `if (ref && !binary)`
 * before loading, so it only loads what's actually missing.
 */
async function hydrateAfterUndoRedo(store: typeof import("./workflowStore").useWorkflowStore): Promise<void> {
  const state = store.getState();
  const workflowPath = state.saveDirectoryPath;
  if (!workflowPath) return; // Unsaved workflow, no refs to hydrate

  try {
    const workflow = { version: 1 as const, name: "", nodes: state.nodes, edges: state.edges, edgeStyle: state.edgeStyle };
    const hydrated = await hydrateWorkflowImages(workflow, workflowPath);

    // Pause temporal so hydration doesn't create undo snapshots
    const temporal = store.temporal.getState();
    temporal.pause();
    store.setState({ nodes: hydrated.nodes });
    temporal.resume();
  } catch (err) {
    console.warn("Failed to hydrate after undo/redo:", err);
  }
}

/**
 * Undo with media hydration. Calls undo(), marks unsaved, then
 * asynchronously hydrates any binary data that was stripped from the snapshot.
 */
export function undoWithMedia(store: typeof import("./workflowStore").useWorkflowStore): void {
  const temporal = store.temporal.getState();
  if (temporal.pastStates.length === 0) return;
  temporal.undo();
  store.setState({ hasUnsavedChanges: true });
  hydrateAfterUndoRedo(store);
}

/**
 * Redo with media hydration. Calls redo(), marks unsaved, then
 * asynchronously hydrates any binary data that was stripped from the snapshot.
 */
export function redoWithMedia(store: typeof import("./workflowStore").useWorkflowStore): void {
  const temporal = store.temporal.getState();
  if (temporal.futureStates.length === 0) return;
  temporal.redo();
  store.setState({ hasUnsavedChanges: true });
  hydrateAfterUndoRedo(store);
}
