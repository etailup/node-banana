/**
 * Headless Workflow Engine
 *
 * Server-side execution of workflow graphs. Calls existing API routes
 * (/api/generate, /api/llm) via localhost HTTP to reuse all provider logic.
 */

import {
  groupNodesByLevel,
  getConnectedInputs,
  resolveVariables,
  chunk,
  type NodeOutputMap,
} from "./graph";
import { uploadToR2, updateJobStatus, createJob } from "./storage";
import { deliverCallback } from "./callback";
import type {
  WorkflowFileJSON,
  WorkflowNodeJSON,
  ParameterOverrides,
  HeadlessJob,
  JobProgress,
  JobOutputEntry,
  JobError,
  CallbackPayload,
  NodeExecutionResult,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return process.env.HEADLESS_BASE_URL || "http://localhost:3000";
}

function getMaxConcurrency(): number {
  const parsed = parseInt(process.env.HEADLESS_MAX_CONCURRENT || "5", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 5;
  return parsed;
}

// Supported node types for headless execution
const SUPPORTED_TYPES = new Set([
  "imageInput",
  "audioInput",
  "annotation",
  "prompt",
  "promptConstructor",
  "nanoBanana",
  "generateVideo",
  "llmGenerate",
  "splitGrid",
  "output",
  "outputGallery",
  "imageCompare",
]);

// ---------------------------------------------------------------------------
// Server-side Image Splitting (sharp — replaces browser Canvas)
// ---------------------------------------------------------------------------

/**
 * Parse a base64 data URL into a raw Buffer.
 * Handles both `data:image/...;base64,XXX` and raw base64 strings.
 */
function base64ToBuffer(dataUrl: string): Buffer {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  return Buffer.from(match ? match[1] : dataUrl, "base64");
}

/**
 * Convert a raw image Buffer to a PNG data URL.
 */
function bufferToDataUrl(buf: Buffer, mime = "image/png"): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Split a base64 image into a grid of cells using sharp.
 * Server-side equivalent of gridSplitter.ts splitWithDimensions().
 */
async function splitGridImage(
  imageBase64: string,
  rows: number,
  cols: number,
): Promise<string[]> {
  const sharp = (await import("sharp")).default;
  const buf = base64ToBuffer(imageBase64);
  const meta = await sharp(buf).metadata();
  const imgW = meta.width!;
  const imgH = meta.height!;

  const cellW = Math.floor(imgW / cols);
  const cellH = Math.floor(imgH / rows);

  const cells: string[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const extracted = await sharp(buf)
        .extract({
          left: col * cellW,
          top: row * cellH,
          width: cellW,
          height: cellH,
        })
        .png()
        .toBuffer();
      cells.push(bufferToDataUrl(extracted));
    }
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Image URL Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch an image from a URL and convert to base64 data URL.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

// ---------------------------------------------------------------------------
// Single Node Execution
// ---------------------------------------------------------------------------

async function executeNode(
  node: WorkflowNodeJSON,
  allNodes: WorkflowNodeJSON[],
  allEdges: WorkflowFileJSON["edges"],
  nodeOutputs: NodeOutputMap,
  baseUrl: string,
): Promise<NodeExecutionResult> {
  const result: NodeExecutionResult = { nodeId: node.id, nodeType: node.type };

  switch (node.type) {
    // ------------------------------------------------------------------
    // imageInput: resolve image from URL or embedded base64
    // ------------------------------------------------------------------
    case "imageInput": {
      // Check if already populated by upstream splitGrid node
      const prePopulated = nodeOutputs.get(node.id);
      if (prePopulated?.image) {
        result.outputImage = prePopulated.image;
        break;
      }

      let image: string | null = null;

      // Priority: imageUrl (possibly overridden) -> embedded base64
      const imageUrl = node.data.imageUrl as string | undefined;
      if (imageUrl && !imageUrl.startsWith("{{")) {
        image = await fetchImageAsBase64(imageUrl);
      } else {
        image = (node.data.image as string) || null;
      }

      if (image) {
        result.outputImage = image;
      } else {
        result.error = "No image source (URL or embedded) available";
      }
      break;
    }

    // ------------------------------------------------------------------
    // audioInput: load audio from URL or embedded base64
    // ------------------------------------------------------------------
    case "audioInput": {
      const audioUrl = node.data.audioUrl as string | undefined;
      const audioFile = node.data.audioFile as string | undefined;

      if (audioUrl && !audioUrl.startsWith("{{")) {
        // Fetch audio from URL (same pattern as imageInput)
        const response = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const contentType = response.headers.get("content-type") || "audio/mpeg";
          const base64 = Buffer.from(buffer).toString("base64");
          result.outputText = `data:${contentType};base64,${base64}`;
        } else {
          result.error = `Failed to fetch audio from ${audioUrl}: HTTP ${response.status}`;
        }
      } else if (audioFile) {
        result.outputText = audioFile;
      }
      // audioInput is a data source — no error if empty (may not be connected)
      break;
    }

    // ------------------------------------------------------------------
    // annotation: pass through connected image (annotations are pre-baked)
    // ------------------------------------------------------------------
    case "annotation": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      const image = inputs.images[0] || null;
      if (image) {
        // If outputImage already exists (pre-baked annotations), use it; otherwise pass through
        const existingOutput = (node.data.outputImage as string) || null;
        result.outputImage = existingOutput || image;
      }
      break;
    }

    // ------------------------------------------------------------------
    // prompt: static text (already resolved by resolveVariables)
    // ------------------------------------------------------------------
    case "prompt": {
      result.outputText = (node.data.prompt as string) || "";
      break;
    }

    // ------------------------------------------------------------------
    // promptConstructor: @variable interpolation from connected nodes
    // ------------------------------------------------------------------
    case "promptConstructor": {
      const template = (node.data.template as string) || "";

      // Build variable map from connected prompt/llmGenerate nodes
      const variableMap: Record<string, string> = {};
      const textEdges = allEdges.filter(
        (e) => e.target === node.id && e.targetHandle === "text",
      );

      for (const edge of textEdges) {
        const sourceNode = allNodes.find((n) => n.id === edge.source);
        if (!sourceNode) continue;

        const output = nodeOutputs.get(edge.source);
        const varName =
          (sourceNode.data.variableName as string) || sourceNode.id;

        if (sourceNode.type === "prompt") {
          variableMap[varName] =
            output?.text || (sourceNode.data.prompt as string) || "";
        } else if (sourceNode.type === "llmGenerate" && output?.text) {
          variableMap[varName] = output.text;
        }
      }

      // Replace @variables
      let resolvedText = template;
      const varPattern = /@(\w+)/g;
      for (const match of template.matchAll(varPattern)) {
        const varName = match[1];
        if (variableMap[varName] !== undefined) {
          resolvedText = resolvedText.replaceAll(`@${varName}`, variableMap[varName]);
        }
      }

      result.outputText = resolvedText;
      break;
    }

    // ------------------------------------------------------------------
    // nanoBanana: call /api/generate
    // ------------------------------------------------------------------
    case "nanoBanana": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      const promptText = inputs.text || (node.data.inputPrompt as string);

      if (!promptText) {
        result.error = "Missing text input for nanoBanana node";
        break;
      }

      const requestPayload = {
        images: inputs.images,
        prompt: promptText,
        aspectRatio: node.data.aspectRatio || "1:1",
        resolution: node.data.resolution || "1024x1024",
        model: node.data.model || "nano-banana",
        useGoogleSearch: node.data.useGoogleSearch || false,
        selectedModel: node.data.selectedModel,
        parameters: node.data.parameters,
      };

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(300000), // 5 min like the route's maxDuration
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        result.error = `Generate API failed: HTTP ${response.status} - ${errText.substring(0, 200)}`;
        break;
      }

      const genResult = await response.json();
      if (genResult.success && genResult.image) {
        result.outputImage = genResult.image;
      } else {
        result.error = genResult.error || "Generate API returned no image";
      }
      break;
    }

    // ------------------------------------------------------------------
    // generateVideo: call /api/generate with mediaType: "video"
    // ------------------------------------------------------------------
    case "generateVideo": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      const promptText = inputs.text || (node.data.inputPrompt as string);

      const selectedModel = node.data.selectedModel as
        | { modelId: string; provider: string; pricing?: unknown }
        | undefined;

      if (!selectedModel?.modelId) {
        result.error = "No model selected for generateVideo node";
        break;
      }

      const requestPayload = {
        images: inputs.images,
        prompt: promptText,
        selectedModel,
        parameters: node.data.parameters,
        mediaType: "video" as const,
      };

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(600000), // 10 min for video generation
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        result.error = `Generate Video API failed: HTTP ${response.status} - ${errText.substring(0, 200)}`;
        break;
      }

      const genResult = await response.json();
      const videoData = genResult.video || genResult.videoUrl;
      if (genResult.success && videoData) {
        result.outputVideo = videoData;
      } else if (genResult.success && genResult.image) {
        // Some models return image preview
        result.outputVideo = genResult.image;
      } else {
        result.error = genResult.error || "Generate Video API returned no video";
      }
      break;
    }

    // ------------------------------------------------------------------
    // llmGenerate: call /api/llm
    // ------------------------------------------------------------------
    case "llmGenerate": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      const promptText = inputs.text || (node.data.inputPrompt as string);

      if (!promptText) {
        result.error = "Missing text input for llmGenerate node";
        break;
      }

      const requestPayload = {
        prompt: promptText,
        images: inputs.images.length > 0 ? inputs.images : undefined,
        provider: node.data.provider || "google",
        model: node.data.model || "gemini-2.5-flash",
        temperature: node.data.temperature ?? 0.7,
        maxTokens: node.data.maxTokens ?? 2048,
      };

      const response = await fetch(`${baseUrl}/api/llm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        result.error = `LLM API failed: HTTP ${response.status} - ${errText.substring(0, 200)}`;
        break;
      }

      const llmResult = await response.json();
      if (llmResult.success && llmResult.text) {
        result.outputText = llmResult.text;
      } else {
        result.error = llmResult.error || "LLM API returned no text";
      }
      break;
    }

    // ------------------------------------------------------------------
    // splitGrid: split image into grid cells, populate child imageInputs
    // ------------------------------------------------------------------
    case "splitGrid": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      const sourceImage = inputs.images[0] || null;

      if (!sourceImage) {
        result.error = "No input image connected to splitGrid node";
        break;
      }

      const gridRows = (node.data.gridRows as number) || 2;
      const gridCols = (node.data.gridCols as number) || 3;
      const childNodeIds = node.data.childNodeIds as
        | Array<{ imageInput: string; prompt?: string; nanoBanana?: string }>
        | undefined;

      if (!childNodeIds || childNodeIds.length === 0) {
        result.error = "splitGrid node has no childNodeIds configured";
        break;
      }

      const splitImages = await splitGridImage(sourceImage, gridRows, gridCols);

      // Pre-populate child imageInput nodes in nodeOutputs so they
      // pick up the split data when they execute at a later level.
      for (let i = 0; i < childNodeIds.length; i++) {
        if (splitImages[i]) {
          nodeOutputs.set(childNodeIds[i].imageInput, {
            image: splitImages[i],
          });
        }
      }

      // splitGrid itself outputs the source image (for graph completeness)
      result.outputImage = sourceImage;
      break;
    }

    // ------------------------------------------------------------------
    // output: collect final image or video from upstream
    // ------------------------------------------------------------------
    case "output": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      if (inputs.videos.length > 0) {
        result.outputVideo = inputs.videos[0];
      } else if (inputs.images.length > 0) {
        // Check if image data is actually video content
        const content = inputs.images[0];
        const isVideo = content.startsWith("data:video/") ||
          content.includes(".mp4") || content.includes(".webm");
        if (isVideo) {
          result.outputVideo = content;
        } else {
          result.outputImage = content;
        }
      } else {
        result.error = "No image or video connected to output node";
      }
      break;
    }

    // ------------------------------------------------------------------
    // outputGallery: collect all connected images (upload each to R2)
    // ------------------------------------------------------------------
    case "outputGallery": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      if (inputs.images.length > 0) {
        // Store first image as the main output; all images are handled
        // in runExecution where outputGallery gets special treatment
        result.outputImage = inputs.images[0];
      }
      break;
    }

    // ------------------------------------------------------------------
    // imageCompare: collect two images (display-only, no uploadable output)
    // ------------------------------------------------------------------
    case "imageCompare": {
      const inputs = getConnectedInputs(node.id, allNodes, allEdges, nodeOutputs);
      // imageCompare is display-only; just mark it as executed
      if (inputs.images.length >= 2) {
        result.outputImage = inputs.images[0]; // Store for graph completeness
      }
      break;
    }

    default:
      result.error = `Unsupported node type: ${node.type}`;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main Engine
// ---------------------------------------------------------------------------

export interface EngineOptions {
  maxConcurrency?: number;
  /** Override the base URL for internal API calls (useful for testing). */
  baseUrl?: string;
  /** Override R2 upload (useful for testing). */
  uploadFn?: (jobId: string, nodeId: string, base64: string) => Promise<string>;
}

/**
 * Execute a workflow headlessly.
 *
 * 1. Resolve variables from parameter overrides
 * 2. Create a job record in Supabase
 * 3. Topological sort nodes into levels
 * 4. Execute levels sequentially, nodes within a level in parallel (batched)
 * 5. Upload output images to R2
 * 6. Fire callback webhook
 *
 * Returns the job ID. Execution runs in the background after the job is created.
 */
export async function executeWorkflow(
  workflow: WorkflowFileJSON,
  parameters?: ParameterOverrides,
  callbackUrl?: string,
  workflowId?: string,
  options?: EngineOptions,
): Promise<string> {
  const baseUrl = options?.baseUrl || getBaseUrl();
  const concurrency = options?.maxConcurrency || getMaxConcurrency();
  const upload = options?.uploadFn || uploadToR2;

  // 1. Resolve variables
  const resolved = resolveVariables(workflow, parameters);

  // 2. Create job record
  const job = await createJob(workflowId || null, parameters || {}, callbackUrl || null);
  const jobId = job.id;

  // 3. Topological sort
  const levels = groupNodesByLevel(resolved.nodes, resolved.edges);

  // Filter to supported nodes only (warn for unsupported)
  const unsupported = resolved.nodes.filter((n) => !SUPPORTED_TYPES.has(n.type));
  if (unsupported.length > 0) {
    console.warn(
      `[Engine:${jobId}] Skipping unsupported nodes: ${unsupported.map((n) => `${n.id}(${n.type})`).join(", ")}`,
    );
  }

  const totalNodes = levels.reduce(
    (sum, lvl) => sum + lvl.nodeIds.filter((id) => {
      const node = resolved.nodes.find((n) => n.id === id);
      return node && SUPPORTED_TYPES.has(node.type);
    }).length,
    0,
  );

  // 4. Start background execution
  await updateJobStatus(jobId, "running", {
    started_at: new Date().toISOString(),
    progress: { completed: 0, total: totalNodes, currentLevel: 0, totalLevels: levels.length },
  });

  // Run execution asynchronously (don't await — return jobId immediately)
  runExecution(jobId, resolved, levels, totalNodes, concurrency, baseUrl, upload, callbackUrl || null).catch(
    async (err) => {
      console.error(`[Engine:${jobId}] Fatal error:`, err);
      try {
        await updateJobStatus(jobId, "failed", {
          completed_at: new Date().toISOString(),
          errors: [{ message: `Fatal engine error: ${err instanceof Error ? err.message : String(err)}`, timestamp: new Date().toISOString() }],
        });
      } catch (updateErr) {
        console.error(`[Engine:${jobId}] Failed to update job status after fatal error:`, updateErr);
      }
    },
  );

  return jobId;
}

/**
 * Internal: run the execution loop. Called as a background task.
 */
async function runExecution(
  jobId: string,
  workflow: WorkflowFileJSON,
  levels: ReturnType<typeof groupNodesByLevel>,
  totalNodes: number,
  concurrency: number,
  baseUrl: string,
  upload: (jobId: string, nodeId: string, base64: string) => Promise<string>,
  callbackUrl: string | null,
): Promise<void> {
  const nodeOutputs: NodeOutputMap = new Map();
  const outputs: Record<string, JobOutputEntry> = {};
  const errors: JobError[] = [];
  let completed = 0;

  try {
    for (const level of levels) {
      const supportedIds = level.nodeIds.filter((id) => {
        const node = workflow.nodes.find((n) => n.id === id);
        return node && SUPPORTED_TYPES.has(node.type);
      });

      // Execute in batches for concurrency control
      const batches = chunk(supportedIds, concurrency);

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map(async (nodeId) => {
            const node = workflow.nodes.find((n) => n.id === nodeId)!;
            return executeNode(node, workflow.nodes, workflow.edges, nodeOutputs, baseUrl);
          }),
        );

        // Process results
        for (const settledResult of results) {
          if (settledResult.status === "fulfilled") {
            const res = settledResult.value;

            // Store output for downstream consumption
            if (res.outputImage || res.outputText || res.outputVideo) {
              nodeOutputs.set(res.nodeId, {
                image: res.outputImage,
                text: res.outputText,
                video: res.outputVideo,
              });
            }

            // Output nodes: upload to R2 and record
            if (res.nodeType === "output" && (res.outputImage || res.outputVideo)) {
              try {
                if (res.outputImage) {
                  const imageUrl = await upload(jobId, res.nodeId, res.outputImage);
                  outputs[res.nodeId] = { nodeId: res.nodeId, imageUrl };
                } else if (res.outputVideo) {
                  // Video may be a URL (from Kie/Fal) or base64
                  const isUrl = res.outputVideo.startsWith("http");
                  if (isUrl) {
                    outputs[res.nodeId] = { nodeId: res.nodeId, imageUrl: res.outputVideo };
                  } else {
                    const videoUrl = await upload(jobId, res.nodeId, res.outputVideo);
                    outputs[res.nodeId] = { nodeId: res.nodeId, imageUrl: videoUrl };
                  }
                }
              } catch (uploadErr) {
                const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
                errors.push({
                  nodeId: res.nodeId,
                  message: `R2 upload failed: ${msg}`,
                  timestamp: new Date().toISOString(),
                });
              }
            }

            // OutputGallery nodes: upload each connected image
            if (res.nodeType === "outputGallery") {
              const galleryInputs = getConnectedInputs(
                res.nodeId, workflow.nodes, workflow.edges, nodeOutputs,
              );
              for (let i = 0; i < galleryInputs.images.length; i++) {
                try {
                  const imageUrl = await upload(jobId, `${res.nodeId}-${i}`, galleryInputs.images[i]);
                  outputs[`${res.nodeId}-${i}`] = { nodeId: res.nodeId, imageUrl };
                } catch (uploadErr) {
                  const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
                  errors.push({
                    nodeId: res.nodeId,
                    message: `R2 upload failed for gallery image ${i}: ${msg}`,
                    timestamp: new Date().toISOString(),
                  });
                }
              }
            }

            // Record errors
            if (res.error) {
              errors.push({
                nodeId: res.nodeId,
                message: res.error,
                timestamp: new Date().toISOString(),
              });
            }
          } else {
            // Promise rejected (unexpected crash)
            errors.push({
              message: `Node execution crashed: ${settledResult.reason}`,
              timestamp: new Date().toISOString(),
            });
          }

          completed++;
        }

        // Update progress
        await updateJobStatus(jobId, "running", {
          progress: {
            completed,
            total: totalNodes,
            currentLevel: level.level,
            totalLevels: levels.length,
          },
          outputs,
          errors,
        });
      }
    }

    // 5. Mark complete
    const finalStatus = errors.length > 0 && Object.keys(outputs).length === 0
      ? "failed" as const
      : "completed" as const;

    await updateJobStatus(jobId, finalStatus, {
      completed_at: new Date().toISOString(),
      outputs,
      errors,
    });

    // 6. Fire callback
    if (callbackUrl) {
      const payload: CallbackPayload = {
        jobId,
        status: finalStatus,
        outputs,
        errors,
        completedAt: new Date().toISOString(),
      };
      await deliverCallback(jobId, callbackUrl, payload);
    }

    console.log(`[Engine:${jobId}] Completed with status: ${finalStatus}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Engine:${jobId}] Execution error:`, message);

    await updateJobStatus(jobId, "failed", {
      completed_at: new Date().toISOString(),
      errors: [
        ...errors,
        { message: `Engine error: ${message}`, timestamp: new Date().toISOString() },
      ],
    });

    if (callbackUrl) {
      await deliverCallback(jobId, callbackUrl, {
        jobId,
        status: "failed",
        outputs,
        errors: [
          ...errors,
          { message: `Engine error: ${message}`, timestamp: new Date().toISOString() },
        ],
        completedAt: new Date().toISOString(),
      });
    }
  }
}
