/**
 * Cloud-specific extensions for the workflow store.
 *
 * Extracted from workflowStore.ts to reduce merge conflict surface
 * with upstream (shrimbly/node-banana). These functions are only
 * called when isCloud === true.
 */

import { useToast } from "@/components/Toast";
import type { WorkflowFile } from "./workflowStore";
import type {
  WorkflowNode,
  ImageInputNodeData,
  AnnotationNodeData,
  NanoBananaNodeData,
  LLMGenerateNodeData,
  GenerateVideoNodeData,
  SplitGridNodeData,
  OutputNodeData,
} from "@/types";

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
 * Externalize a single node's base64 images to R2, replacing them with CDN URLs.
 */
async function cloudExternalizeNode(
  node: WorkflowNode,
  workflowId: string,
  cdnCache: Map<string, string>,
): Promise<WorkflowNode> {
  switch (node.type) {
    case "imageInput": {
      const d = node.data as ImageInputNodeData;
      if (!isBase64DataUrl(d.image)) return node;
      const url = await uploadImageToR2(workflowId, d.image, "inputs", cdnCache);
      return { ...node, data: { ...d, image: url } } as WorkflowNode;
    }

    case "annotation": {
      const d = node.data as AnnotationNodeData;
      let sourceImage = d.sourceImage;
      let outputImage = d.outputImage;
      if (isBase64DataUrl(sourceImage)) {
        sourceImage = await uploadImageToR2(workflowId, sourceImage, "inputs", cdnCache);
      }
      if (isBase64DataUrl(outputImage)) {
        outputImage = await uploadImageToR2(workflowId, outputImage, "inputs", cdnCache);
      }
      if (sourceImage === d.sourceImage && outputImage === d.outputImage) return node;
      return { ...node, data: { ...d, sourceImage, outputImage } } as WorkflowNode;
    }

    case "nanoBanana": {
      const d = node.data as NanoBananaNodeData;
      let outputImage: string | null = d.outputImage;
      let inputImages = d.inputImages;
      let changed = false;

      if (isBase64DataUrl(outputImage)) {
        outputImage = await uploadImageToR2(workflowId, outputImage, "generations", cdnCache);
        changed = true;
      }
      if (inputImages?.some(isBase64DataUrl)) {
        inputImages = await Promise.all(
          inputImages.map((img) =>
            isBase64DataUrl(img) ? uploadImageToR2(workflowId, img, "inputs", cdnCache) : img
          ),
        );
        changed = true;
      }
      if (!changed) return node;
      return { ...node, data: { ...d, outputImage, inputImages } } as WorkflowNode;
    }

    case "llmGenerate": {
      const d = node.data as LLMGenerateNodeData;
      if (!d.inputImages?.some(isBase64DataUrl)) return node;
      const inputImages = await Promise.all(
        d.inputImages.map((img) =>
          isBase64DataUrl(img) ? uploadImageToR2(workflowId, img, "inputs", cdnCache) : img
        ),
      );
      return { ...node, data: { ...d, inputImages } } as WorkflowNode;
    }

    case "generateVideo": {
      const d = node.data as GenerateVideoNodeData;
      if (!d.inputImages?.some(isBase64DataUrl)) return node;
      const inputImages = await Promise.all(
        d.inputImages.map((img) =>
          isBase64DataUrl(img) ? uploadImageToR2(workflowId, img, "inputs", cdnCache) : img
        ),
      );
      return { ...node, data: { ...d, inputImages } } as WorkflowNode;
    }

    case "splitGrid": {
      const d = node.data as SplitGridNodeData;
      if (!isBase64DataUrl(d.sourceImage)) return node;
      const sourceImage = await uploadImageToR2(workflowId, d.sourceImage, "inputs", cdnCache);
      return { ...node, data: { ...d, sourceImage } } as WorkflowNode;
    }

    case "output": {
      const d = node.data as OutputNodeData;
      // Clear output images — they're regenerated on each run
      if (isBase64DataUrl(d.image)) {
        return { ...node, data: { ...d, image: null, video: null } } as WorkflowNode;
      }
      return node;
    }

    default:
      return node;
  }
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
      batch.map((node, batchIdx) =>
        cloudExternalizeNode(node, workflowId, cdnCache).then((n) => ({
          index: i + batchIdx,
          node: n,
        })),
      ),
    );
    for (const { index, node } of processed) {
      result[index] = node;
    }
  }

  return { ...workflow, nodes: result };
}
