/**
 * Cloud-specific extensions for the workflow store.
 *
 * Extracted from workflowStore.ts to reduce merge conflict surface
 * with upstream (shrimbly/node-banana). These functions are only
 * called when isCloud === true.
 */

import { useToast } from "@/components/Toast";
import type { WorkflowFile } from "./workflowStore";

/**
 * Save a workflow to Supabase (cloud mode).
 * Returns true on success, false on failure.
 */
export async function cloudSaveWorkflow(
  workflowId: string,
  workflow: WorkflowFile,
): Promise<boolean> {
  const response = await fetch("/api/workflow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, workflow }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    useToast.getState().show(`Cloud save failed (${response.status}): ${text.slice(0, 100)}`, "error");
    return false;
  }

  const result = await response.json();

  if (result.success) {
    return true;
  } else {
    useToast.getState().show(`Cloud save failed: ${result.error}`, "error");
    return false;
  }
}

/**
 * Check if the workflow can be saved given its current state.
 * Cloud mode only requires workflowId + workflowName.
 * Local mode additionally requires saveDirectoryPath.
 */
export function canSaveWorkflow(state: {
  workflowId: string | null;
  workflowName: string | null;
  saveDirectoryPath: string | null;
  isCloud: boolean;
}): boolean {
  if (!state.workflowId || !state.workflowName) return false;
  if (!state.isCloud && !state.saveDirectoryPath) return false;
  return true;
}

/**
 * Check if auto-save should trigger.
 * Cloud mode skips the saveDirectoryPath requirement.
 */
export function shouldAutoSave(state: {
  autoSaveEnabled: boolean;
  hasUnsavedChanges: boolean;
  workflowId: string | null;
  workflowName: string | null;
  isSaving: boolean;
  isCloud: boolean;
  saveDirectoryPath: string | null;
}): boolean {
  return !!(
    state.autoSaveEnabled &&
    state.hasUnsavedChanges &&
    state.workflowId &&
    state.workflowName &&
    !state.isSaving &&
    (state.isCloud || state.saveDirectoryPath)
  );
}

/**
 * Check if image hydration should be skipped.
 * Cloud images use CDN URLs and don't need filesystem hydration.
 */
export function shouldSkipHydration(isCloud: boolean): boolean {
  return isCloud;
}
