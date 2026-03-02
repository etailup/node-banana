/**
 * Cloud-specific extensions for the workflow store.
 *
 * Extracted from workflowStore.ts to reduce merge conflict surface
 * with upstream (shrimbly/node-banana). These functions are only
 * called when isCloud === true.
 */

import { useToast } from "@/components/Toast";
import type { WorkflowFile } from "./workflowStore";
import type { WorkflowNode, OutputNodeData } from "@/types";

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

// ---------------------------------------------------------------------------
// Cloud image externalization
// ---------------------------------------------------------------------------

function isBase64DataUrl(str: string | null | undefined): str is string {
  return typeof str === "string" && str.startsWith("data:");
}

function generateCloudImageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `img-${timestamp}-${random}`;
}

/**
 * Upload a single base64 image to R2 via /api/workflow-images.
 * Returns the CDN URL on success, or the original data on failure.
 */
async function uploadImageToR2(
  workflowId: string,
  imageData: string,
  folder: "inputs" | "generations",
  cdnCache: Map<string, string>,
): Promise<string> {
  // Dedup: if we already uploaded identical data in this batch, reuse the URL
  const cacheKey = imageData.slice(0, 200) + imageData.length;
  const cached = cdnCache.get(cacheKey);
  if (cached) return cached;

  const imageId = generateCloudImageId();

  const res = await fetch("/api/workflow-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflowId, imageId, imageData, folder }),
  });

  if (!res.ok) {
    console.warn(`[cloud-externalize] upload failed (${res.status}) for ${imageId}`);
    return imageData; // fallback: keep base64 inline
  }

  const json = await res.json();
  if (json.success && json.cdnUrl) {
    cdnCache.set(cacheKey, json.cdnUrl);
    return json.cdnUrl;
  }
  return imageData;
}

/**
 * Recursively walk an object/array, uploading any base64 data URL strings to R2.
 * Returns a new object with base64 strings replaced by CDN URLs.
 */
async function replaceBase64InValue(
  value: unknown,
  workflowId: string,
  cdnCache: Map<string, string>,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (value.startsWith("data:")) {
      return uploadImageToR2(workflowId, value, "inputs", cdnCache);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((v) => replaceBase64InValue(v, workflowId, cdnCache)),
    );
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const resolved = await Promise.all(
      entries.map(async ([k, v]) =>
        [k, await replaceBase64InValue(v, workflowId, cdnCache)] as const
      ),
    );
    return Object.fromEntries(resolved);
  }
  return value; // number, boolean, etc.
}

/**
 * Externalize all base64 images in a workflow to R2 CDN URLs (cloud mode).
 *
 * Mirrors the local `externalizeWorkflowImages()` pattern but uploads to R2
 * via `/api/workflow-images` instead of writing to the filesystem.
 * Processes nodes in batches of 3 for controlled concurrency.
 */
export async function cloudExternalizeWorkflowImages(
  workflowId: string,
  workflow: WorkflowFile,
): Promise<WorkflowFile> {
  const cdnCache = new Map<string, string>();
  const BATCH_SIZE = 3;
  const result: WorkflowNode[] = new Array(workflow.nodes.length);

  for (let i = 0; i < workflow.nodes.length; i += BATCH_SIZE) {
    const batch = workflow.nodes.slice(i, i + BATCH_SIZE);
    const processed = await Promise.all(
      batch.map(async (node, batchIdx) => {
        let externalized: WorkflowNode;
        if (node.type === "output") {
          // Clear output images — they're regenerated on each run
          const d = node.data as OutputNodeData;
          if (isBase64DataUrl(d.image)) {
            externalized = { ...node, data: { ...d, image: null, video: null } } as WorkflowNode;
          } else {
            externalized = node;
          }
        } else {
          const data = await replaceBase64InValue(node.data, workflowId, cdnCache);
          externalized = { ...node, data } as WorkflowNode;
        }
        return { index: i + batchIdx, node: externalized };
      }),
    );
    for (const { index, node } of processed) {
      result[index] = node;
    }
  }

  return { ...workflow, nodes: result };
}
