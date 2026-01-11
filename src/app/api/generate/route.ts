import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { GenerateRequest, GenerateResponse, ModelType, SelectedModel, ProviderType } from "@/types";
import { GenerationInput, GenerationOutput, ProviderModel } from "@/lib/providers/types";
import { uploadImageForUrl, shouldUseImageUrl, deleteImages } from "@/lib/images";

export const maxDuration = 300; // 5 minute timeout for API calls
export const dynamic = 'force-dynamic'; // Ensure this route is always dynamic

// Map model types to Gemini model IDs
const MODEL_MAP: Record<ModelType, string> = {
  "nano-banana": "gemini-2.5-flash-image", // Updated to correct model name
  "nano-banana-pro": "gemini-3-pro-image-preview",
};

/**
 * Extended request format that supports both legacy and multi-provider requests
 */
interface MultiProviderGenerateRequest extends GenerateRequest {
  selectedModel?: SelectedModel;
  parameters?: Record<string, unknown>;
  /** Dynamic inputs from schema-based connections (e.g., image_url, tail_image_url, prompt) */
  dynamicInputs?: Record<string, string>;
}

/**
 * Generate image using Gemini API (legacy/default path)
 */
async function generateWithGemini(
  requestId: string,
  apiKey: string,
  prompt: string,
  images: string[],
  model: ModelType,
  aspectRatio?: string,
  resolution?: string,
  useGoogleSearch?: boolean
): Promise<NextResponse<GenerateResponse>> {
  console.log(`[API:${requestId}] Request parameters:`);
  console.log(`[API:${requestId}]   - Model: ${model} -> ${MODEL_MAP[model]}`);
  console.log(`[API:${requestId}]   - Images count: ${images?.length || 0}`);
  console.log(`[API:${requestId}]   - Prompt length: ${prompt?.length || 0} chars`);
  console.log(`[API:${requestId}]   - Aspect Ratio: ${aspectRatio || 'default'}`);
  console.log(`[API:${requestId}]   - Resolution: ${resolution || 'default'}`);
  console.log(`[API:${requestId}]   - Google Search: ${useGoogleSearch || false}`);

  console.log(`[API:${requestId}] Extracting image data...`);
  // Extract base64 data and MIME types from data URLs
  const imageData = (images || []).map((image, idx) => {
    if (image.includes("base64,")) {
      const [header, data] = image.split("base64,");
      // Extract MIME type from header (e.g., "data:image/png;" -> "image/png")
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      console.log(`[API:${requestId}]   Image ${idx + 1}: ${mimeType}, ${(data.length / 1024).toFixed(2)}KB base64`);
      return { data, mimeType };
    }
    console.log(`[API:${requestId}]   Image ${idx + 1}: No base64 header, assuming PNG, ${(image.length / 1024).toFixed(2)}KB`);
    return { data: image, mimeType: "image/png" };
  });

  // Initialize Gemini client
  console.log(`[API:${requestId}] Initializing Gemini client...`);
  const ai = new GoogleGenAI({ apiKey });

  // Build request parts array with prompt and all images
  console.log(`[API:${requestId}] Building request parts...`);
  const requestParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: prompt },
    ...imageData.map(({ data, mimeType }) => ({
      inlineData: {
        mimeType,
        data,
      },
    })),
  ];
  console.log(`[API:${requestId}] Request parts count: ${requestParts.length} (1 text + ${imageData.length} images)`);

  // Build config object based on model capabilities
  console.log(`[API:${requestId}] Building generation config...`);
  const config: Record<string, unknown> = {
    responseModalities: ["IMAGE", "TEXT"],
  };

  // Add imageConfig for both models (both support aspect ratio)
  if (aspectRatio) {
    config.imageConfig = {
      aspectRatio,
    };
    console.log(`[API:${requestId}]   Added aspect ratio: ${aspectRatio}`);
  }

  // Add resolution only for Nano Banana Pro
  if (model === "nano-banana-pro" && resolution) {
    if (!config.imageConfig) {
      config.imageConfig = {};
    }
    (config.imageConfig as Record<string, unknown>).imageSize = resolution;
    console.log(`[API:${requestId}]   Added resolution: ${resolution}`);
  }

  // Add tools array for Google Search (only Nano Banana Pro)
  const tools = [];
  if (model === "nano-banana-pro" && useGoogleSearch) {
    tools.push({ googleSearch: {} });
    console.log(`[API:${requestId}]   Added Google Search tool`);
  }

  console.log(`[API:${requestId}] Final config:`, JSON.stringify(config, null, 2));
  if (tools.length > 0) {
    console.log(`[API:${requestId}] Tools:`, JSON.stringify(tools, null, 2));
  }

  // Make request to Gemini
  console.log(`[API:${requestId}] Calling Gemini API...`);
  const geminiStartTime = Date.now();

  const response = await ai.models.generateContent({
    model: MODEL_MAP[model],
    contents: [
      {
        role: "user",
        parts: requestParts,
      },
    ],
    config,
    ...(tools.length > 0 && { tools }),
  });

  const geminiDuration = Date.now() - geminiStartTime;
  console.log(`[API:${requestId}] Gemini API call completed in ${geminiDuration}ms`);

  // Extract image from response
  console.log(`[API:${requestId}] Processing response...`);
  const candidates = response.candidates;
  console.log(`[API:${requestId}] Candidates count: ${candidates?.length || 0}`);

  if (!candidates || candidates.length === 0) {
    console.error(`[API:${requestId}] No candidates in response`);
    console.error(`[API:${requestId}] Full response:`, JSON.stringify(response, null, 2));
    return NextResponse.json<GenerateResponse>(
      {
        success: false,
        error: "No response from AI model",
      },
      { status: 500 }
    );
  }

  const parts = candidates[0].content?.parts;
  console.log(`[API:${requestId}] Parts count in first candidate: ${parts?.length || 0}`);

  if (!parts) {
    console.error(`[API:${requestId}] No parts in candidate content`);
    console.error(`[API:${requestId}] Candidate:`, JSON.stringify(candidates[0], null, 2));
    return NextResponse.json<GenerateResponse>(
      {
        success: false,
        error: "No content in response",
      },
      { status: 500 }
    );
  }

  // Log all parts
  parts.forEach((part, idx) => {
    const partKeys = Object.keys(part);
    console.log(`[API:${requestId}] Part ${idx + 1}: ${partKeys.join(', ')}`);
  });

  // Find image part in response
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      const mimeType = part.inlineData.mimeType || "image/png";
      const imgData = part.inlineData.data;
      const imageSizeKB = (imgData.length / 1024).toFixed(2);
      console.log(`[API:${requestId}] Found image in response: ${mimeType}, ${imageSizeKB}KB base64`);

      const dataUrl = `data:${mimeType};base64,${imgData}`;
      const dataUrlSizeKB = (dataUrl.length / 1024).toFixed(2);
      console.log(`[API:${requestId}] Data URL size: ${dataUrlSizeKB}KB`);

      const responsePayload = { success: true, image: dataUrl };
      const responseSize = JSON.stringify(responsePayload).length;
      const responseSizeMB = (responseSize / (1024 * 1024)).toFixed(2);
      console.log(`[API:${requestId}] Total response payload size: ${responseSizeMB}MB`);

      if (responseSize > 4.5 * 1024 * 1024) {
        console.warn(`[API:${requestId}] Response size (${responseSizeMB}MB) is approaching Next.js 5MB limit!`);
      }

      console.log(`[API:${requestId}] SUCCESS - Returning image`);

      // Create response with explicit headers to handle large payloads
      const resp = NextResponse.json<GenerateResponse>(responsePayload);
      resp.headers.set('Content-Type', 'application/json');
      resp.headers.set('Content-Length', responseSize.toString());

      console.log(`[API:${requestId}] Response headers set, returning...`);
      return resp;
    }
  }

  // If no image found, check for text error
  console.warn(`[API:${requestId}] No image found in parts, checking for text...`);
  for (const part of parts) {
    if (part.text) {
      console.error(`[API:${requestId}] Model returned text instead of image`);
      console.error(`[API:${requestId}] Text preview: "${part.text.substring(0, 200)}"`);
      return NextResponse.json<GenerateResponse>(
        {
          success: false,
          error: `Model returned text instead of image: ${part.text.substring(0, 200)}`,
        },
        { status: 500 }
      );
    }
  }

  console.error(`[API:${requestId}] No image or text found in response`);
  console.error(`[API:${requestId}] All parts:`, JSON.stringify(parts, null, 2));
  return NextResponse.json<GenerateResponse>(
    {
      success: false,
      error: "No image in response",
    },
    { status: 500 }
  );
}

/**
 * Generate image using Replicate API
 */
async function generateWithReplicate(
  requestId: string,
  apiKey: string,
  input: GenerationInput
): Promise<GenerationOutput> {
  console.log(`[API:${requestId}] Generating with Replicate...`);
  console.log(`[API:${requestId}]   - Model: ${input.model.id}`);
  console.log(`[API:${requestId}]   - Prompt length: ${input.prompt.length} chars`);
  console.log(`[API:${requestId}]   - Images count: ${input.images?.length || 0}`);

  const REPLICATE_API_BASE = "https://api.replicate.com/v1";

  // Get the latest version of the model
  const modelId = input.model.id;
  const [owner, name] = modelId.split("/");

  // First, get the model to find the latest version
  const modelResponse = await fetch(
    `${REPLICATE_API_BASE}/models/${owner}/${name}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!modelResponse.ok) {
    return {
      success: false,
      error: `Failed to get model info: ${modelResponse.status}`,
    };
  }

  const modelData = await modelResponse.json();
  const version = modelData.latest_version?.id;

  if (!version) {
    return {
      success: false,
      error: "Model has no available version",
    };
  }

  const hasDynamicInputs = input.dynamicInputs && Object.keys(input.dynamicInputs).length > 0;

  // Build input for the prediction
  const predictionInput: Record<string, unknown> = {
    ...input.parameters,
  };

  // Add dynamic inputs if provided (these come from schema-mapped connections)
  if (hasDynamicInputs) {
    Object.assign(predictionInput, input.dynamicInputs);
    console.log(`[API:${requestId}] Using dynamic inputs:`, Object.keys(input.dynamicInputs!).join(", "));
  } else {
    // Fallback to legacy behavior
    predictionInput.prompt = input.prompt;

    // Add image input if provided (for img2img workflows)
    // Note: Different Replicate models use different parameter names
    // Using 'image' as it's most common for img2img models
    if (input.images && input.images.length > 0) {
      predictionInput.image = input.images[0];
      console.log(`[API:${requestId}] Added image input to prediction (${input.images[0].substring(0, 50)}...)`);
    }
  }

  // Log parameters being passed
  if (input.parameters && Object.keys(input.parameters).length > 0) {
    console.log(`[API:${requestId}] Custom parameters:`, JSON.stringify(input.parameters));
  }

  // Create a prediction
  console.log(`[API:${requestId}] Creating Replicate prediction...`);
  const createResponse = await fetch(`${REPLICATE_API_BASE}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version,
      input: predictionInput,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    let errorDetail = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetail = errorJson.detail || errorJson.message || errorJson.error || errorText;
    } catch {
      // Keep original text if not JSON
    }

    // Handle rate limits
    if (createResponse.status === 429) {
      return {
        success: false,
        error: `${input.model.name}: Rate limit exceeded. Try again in a moment.`,
      };
    }

    return {
      success: false,
      error: `${input.model.name}: ${errorDetail}`,
    };
  }

  const prediction = await createResponse.json();

  // Poll for completion
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 1000; // 1 second
  const startTime = Date.now();

  let currentPrediction = prediction;

  while (
    currentPrediction.status !== "succeeded" &&
    currentPrediction.status !== "failed" &&
    currentPrediction.status !== "canceled"
  ) {
    if (Date.now() - startTime > maxWaitTime) {
      return {
        success: false,
        error: `${input.model.name}: Generation timed out after 5 minutes. Video models may take longer - try again.`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    const pollResponse = await fetch(
      `${REPLICATE_API_BASE}/predictions/${currentPrediction.id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!pollResponse.ok) {
      return {
        success: false,
        error: `Failed to poll prediction: ${pollResponse.status}`,
      };
    }

    currentPrediction = await pollResponse.json();
    console.log(`[API:${requestId}] Prediction status: ${currentPrediction.status}`);
  }

  if (currentPrediction.status === "failed") {
    const failureReason = currentPrediction.error || "Prediction failed";
    console.error(`[API:${requestId}] Replicate prediction failed: ${failureReason}`);
    return {
      success: false,
      error: `${input.model.name}: ${failureReason}`,
    };
  }

  if (currentPrediction.status === "canceled") {
    return {
      success: false,
      error: "Prediction was canceled",
    };
  }

  // Extract output
  const output = currentPrediction.output;
  if (!output) {
    return {
      success: false,
      error: "No output from prediction",
    };
  }

  // Output can be a single URL string or an array of URLs
  const outputUrls: string[] = Array.isArray(output) ? output : [output];

  if (outputUrls.length === 0) {
    return {
      success: false,
      error: "No output from prediction",
    };
  }

  // Fetch the first output and convert to base64
  const mediaUrl = outputUrls[0];
  console.log(`[API:${requestId}] Fetching output from: ${mediaUrl}`);
  const mediaResponse = await fetch(mediaUrl);

  if (!mediaResponse.ok) {
    return {
      success: false,
      error: `Failed to fetch output: ${mediaResponse.status}`,
    };
  }

  // Determine MIME type from response
  const contentType = mediaResponse.headers.get("content-type") || "image/png";
  const isVideo = contentType.startsWith("video/");

  const mediaArrayBuffer = await mediaResponse.arrayBuffer();
  const mediaSizeBytes = mediaArrayBuffer.byteLength;
  const mediaSizeMB = mediaSizeBytes / (1024 * 1024);

  // Log warning for large files
  if (mediaSizeMB > 10) {
    console.warn(`[API:${requestId}] Large output file: ${mediaSizeMB.toFixed(2)}MB`);
  }

  // For very large videos (>20MB), return URL directly instead of base64
  if (isVideo && mediaSizeMB > 20) {
    console.log(`[API:${requestId}] Replicate video generation successful (URL only, too large for base64)`);
    return {
      success: true,
      outputs: [
        {
          type: "video",
          data: mediaUrl, // Return URL directly for very large videos
          url: mediaUrl,
        },
      ],
    };
  }

  const mediaBase64 = Buffer.from(mediaArrayBuffer).toString("base64");

  console.log(`[API:${requestId}] Replicate ${isVideo ? "video" : "image"} generation successful`);
  return {
    success: true,
    outputs: [
      {
        type: isVideo ? "video" : "image",
        data: `data:${contentType};base64,${mediaBase64}`,
        url: mediaUrl,
      },
    ],
  };
}

/**
 * Generate image using fal.ai API
 */
async function generateWithFal(
  requestId: string,
  apiKey: string | null,
  input: GenerationInput
): Promise<GenerationOutput> {
  console.log(`[API:${requestId}] Generating with fal.ai...`);
  console.log(`[API:${requestId}]   - Model: ${input.model.id}`);
  console.log(`[API:${requestId}]   - Prompt length: ${input.prompt.length} chars`);
  console.log(`[API:${requestId}]   - Images count: ${input.images?.length || 0}`);
  console.log(`[API:${requestId}]   - Dynamic inputs: ${input.dynamicInputs ? Object.keys(input.dynamicInputs).join(", ") : "none"}`);
  console.log(`[API:${requestId}]   - API key: ${apiKey ? "provided" : "not provided (using rate-limited access)"}`);

  const modelId = input.model.id;
  const hasDynamicInputs = input.dynamicInputs && Object.keys(input.dynamicInputs).length > 0;

  // Build request body
  // If we have dynamic inputs, they take precedence (they already contain prompt, image_url, etc.)
  const requestBody: Record<string, unknown> = {
    ...input.parameters,
  };

  // Add dynamic inputs if provided (these come from schema-mapped connections)
  if (hasDynamicInputs) {
    Object.assign(requestBody, input.dynamicInputs);
    console.log(`[API:${requestId}] Using dynamic inputs:`, Object.keys(input.dynamicInputs!).join(", "));
  } else {
    // Fallback to legacy behavior: use prompt and images array
    requestBody.prompt = input.prompt;

    // Add image_url if provided (for img2img workflows)
    // fal.ai accepts both URLs and data URIs in this field
    if (input.images && input.images.length > 0) {
      requestBody.image_url = input.images[0];
      console.log(`[API:${requestId}] Added image_url to request (${input.images[0].substring(0, 50)}...)`);
    }
  }

  // Log parameters being passed
  if (input.parameters && Object.keys(input.parameters).length > 0) {
    console.log(`[API:${requestId}] Custom parameters:`, JSON.stringify(input.parameters));
  }

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Key ${apiKey}`;
  }

  // POST to fal.run/{modelId}
  console.log(`[API:${requestId}] Calling fal.ai API...`);
  const response = await fetch(`https://fal.run/${modelId}`, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetail = errorJson.detail || errorJson.message || errorJson.error || errorText;
    } catch {
      // Keep original text if not JSON
    }

    // Handle rate limits
    if (response.status === 429) {
      return {
        success: false,
        error: `${input.model.name}: Rate limit exceeded. ${apiKey ? "Try again in a moment." : "Add an API key in settings for higher limits."}`,
      };
    }

    return {
      success: false,
      error: `${input.model.name}: ${errorDetail}`,
    };
  }

  const result = await response.json();

  // fal.ai response can have different structures:
  // - images: array with url field (image models)
  // - image: object with url field (image models)
  // - video: object with url field (video models)
  // - output: string URL (some models)
  let mediaUrl: string | null = null;
  let isVideoModel = false;

  // Check for video output first (video models)
  if (result.video && result.video.url) {
    mediaUrl = result.video.url;
    isVideoModel = true;
    console.log(`[API:${requestId}] Found video URL in response`);
  } else if (result.images && Array.isArray(result.images) && result.images.length > 0) {
    mediaUrl = result.images[0].url;
  } else if (result.image && result.image.url) {
    mediaUrl = result.image.url;
  } else if (result.output && typeof result.output === "string") {
    // Some models return URL directly in output
    mediaUrl = result.output;
  }

  if (!mediaUrl) {
    console.error(`[API:${requestId}] No media URL found in fal.ai response:`, JSON.stringify(result, null, 2));
    return {
      success: false,
      error: "No media URL in response",
    };
  }

  // Fetch the media and convert to base64
  console.log(`[API:${requestId}] Fetching output from: ${mediaUrl}`);
  const mediaResponse = await fetch(mediaUrl);

  if (!mediaResponse.ok) {
    return {
      success: false,
      error: `Failed to fetch output: ${mediaResponse.status}`,
    };
  }

  // Determine MIME type from response
  const contentType = mediaResponse.headers.get("content-type") || (isVideoModel ? "video/mp4" : "image/png");
  const isVideo = contentType.startsWith("video/") || isVideoModel;

  const mediaArrayBuffer = await mediaResponse.arrayBuffer();
  const mediaSizeBytes = mediaArrayBuffer.byteLength;
  const mediaSizeMB = mediaSizeBytes / (1024 * 1024);

  // Log warning for large files
  if (mediaSizeMB > 10) {
    console.warn(`[API:${requestId}] Large output file: ${mediaSizeMB.toFixed(2)}MB`);
  }

  // For very large videos (>20MB), return URL directly instead of base64
  if (isVideo && mediaSizeMB > 20) {
    console.log(`[API:${requestId}] fal.ai video generation successful (URL only, too large for base64)`);
    return {
      success: true,
      outputs: [
        {
          type: "video",
          data: mediaUrl, // Return URL directly for very large videos
          url: mediaUrl,
        },
      ],
    };
  }

  const mediaBase64 = Buffer.from(mediaArrayBuffer).toString("base64");

  console.log(`[API:${requestId}] fal.ai ${isVideo ? "video" : "image"} generation successful`);
  return {
    success: true,
    outputs: [
      {
        type: isVideo ? "video" : "image",
        data: `data:${contentType};base64,${mediaBase64}`,
        url: mediaUrl,
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`\n[API:${requestId}] ========== NEW GENERATE REQUEST ==========`);
  console.log(`[API:${requestId}] Timestamp: ${new Date().toISOString()}`);

  try {
    console.log(`[API:${requestId}] Parsing request body...`);
    const body: MultiProviderGenerateRequest = await request.json();
    const {
      images,
      prompt,
      model = "nano-banana-pro",
      aspectRatio,
      resolution,
      useGoogleSearch,
      selectedModel,
      parameters,
      dynamicInputs,
    } = body;

    // Prompt is required unless provided via dynamicInputs
    const hasPrompt = prompt || (dynamicInputs && dynamicInputs.prompt);
    if (!hasPrompt) {
      console.error(`[API:${requestId}] Validation failed: missing prompt`);
      return NextResponse.json<GenerateResponse>(
        {
          success: false,
          error: "Prompt is required",
        },
        { status: 400 }
      );
    }

    // Determine which provider to use
    const provider: ProviderType = selectedModel?.provider || "gemini";
    console.log(`[API:${requestId}] Provider: ${provider}`);

    // Route to appropriate provider
    if (provider === "replicate") {
      // Get Replicate API key from request headers
      const replicateApiKey = request.headers.get("X-Replicate-API-Key");
      if (!replicateApiKey) {
        return NextResponse.json<GenerateResponse>(
          {
            success: false,
            error: "Replicate API key not provided. Include X-Replicate-API-Key header.",
          },
          { status: 401 }
        );
      }

      // Process images: convert large images to URLs for provider to fetch
      const baseUrl = new URL(request.url).origin;
      const uploadedImageIds: string[] = [];
      const processedImages: string[] = [];

      if (images && images.length > 0) {
        for (const image of images) {
          if (shouldUseImageUrl(image)) {
            const { url, id } = uploadImageForUrl(image, baseUrl);
            uploadedImageIds.push(id);
            processedImages.push(url);
            console.log(`[API:${requestId}] Converted large image to URL: ${url}`);
          } else {
            processedImages.push(image);
            console.log(`[API:${requestId}] Using base64 directly (small image)`);
          }
        }
      }

      // Process dynamicInputs: convert large images in image-type inputs to URLs
      const processedDynamicInputs: Record<string, string> | undefined = dynamicInputs
        ? { ...dynamicInputs }
        : undefined;

      if (processedDynamicInputs) {
        // Image input names that might contain base64 data
        const imageInputNames = ["image", "image_url", "tail_image_url", "first_frame", "last_frame",
          "start_image", "end_image", "reference_image", "init_image", "mask_image", "control_image"];

        for (const key of Object.keys(processedDynamicInputs)) {
          const value = processedDynamicInputs[key];
          // Check if this is an image input with base64 data
          if (imageInputNames.some(name => key.toLowerCase().includes(name.toLowerCase())) &&
              value && value.startsWith("data:image")) {
            if (shouldUseImageUrl(value)) {
              const { url, id } = uploadImageForUrl(value, baseUrl);
              uploadedImageIds.push(id);
              processedDynamicInputs[key] = url;
              console.log(`[API:${requestId}] Converted large dynamic input '${key}' to URL: ${url}`);
            }
          }
        }
      }

      try {
        // Build generation input
        const genInput: GenerationInput = {
          model: {
            id: selectedModel!.modelId,
            name: selectedModel!.displayName,
            provider: "replicate",
            capabilities: ["text-to-image"],
            description: null,
          },
          prompt: prompt || "",
          images: processedImages,
          parameters,
          dynamicInputs: processedDynamicInputs,
        };

        const result = await generateWithReplicate(requestId, replicateApiKey, genInput);

        if (!result.success) {
          return NextResponse.json<GenerateResponse>(
            {
              success: false,
              error: result.error || "Generation failed",
            },
            { status: 500 }
          );
        }

        // Return first output (image or video)
        const output = result.outputs?.[0];
        if (!output?.data) {
          return NextResponse.json<GenerateResponse>(
            {
              success: false,
              error: "No output in generation result",
            },
            { status: 500 }
          );
        }

        // Return appropriate fields based on output type
        if (output.type === "video") {
          // Check if data is a URL (for large videos) or base64
          const isUrl = output.data.startsWith("http");
          return NextResponse.json<GenerateResponse>({
            success: true,
            video: isUrl ? undefined : output.data,
            videoUrl: isUrl ? output.data : undefined,
            contentType: "video",
          });
        }

        return NextResponse.json<GenerateResponse>({
          success: true,
          image: output.data,
          contentType: "image",
        });
      } finally {
        // Clean up uploaded images
        if (uploadedImageIds.length > 0) {
          deleteImages(uploadedImageIds);
          console.log(`[API:${requestId}] Cleaned up ${uploadedImageIds.length} uploaded images`);
        }
      }
    }

    if (provider === "fal") {
      // Get fal.ai API key from request headers (optional - fal.ai works without key but rate limited)
      const falApiKey = request.headers.get("X-Fal-API-Key");

      // Process images: convert large images to URLs for provider to fetch
      const baseUrl = new URL(request.url).origin;
      const uploadedImageIds: string[] = [];
      const processedImages: string[] = [];

      if (images && images.length > 0) {
        for (const image of images) {
          if (shouldUseImageUrl(image)) {
            const { url, id } = uploadImageForUrl(image, baseUrl);
            uploadedImageIds.push(id);
            processedImages.push(url);
            console.log(`[API:${requestId}] Converted large image to URL: ${url}`);
          } else {
            processedImages.push(image);
            console.log(`[API:${requestId}] Using base64 directly (small image)`);
          }
        }
      }

      // Process dynamicInputs: convert large images in image-type inputs to URLs
      const processedDynamicInputs: Record<string, string> | undefined = dynamicInputs
        ? { ...dynamicInputs }
        : undefined;

      if (processedDynamicInputs) {
        // Image input names that might contain base64 data
        const imageInputNames = ["image_url", "tail_image_url", "first_frame", "last_frame",
          "start_image", "end_image", "reference_image", "init_image", "mask_image", "control_image"];

        for (const key of Object.keys(processedDynamicInputs)) {
          const value = processedDynamicInputs[key];
          // Check if this is an image input with base64 data
          if (imageInputNames.some(name => key.toLowerCase().includes(name.toLowerCase())) &&
              value && value.startsWith("data:image")) {
            if (shouldUseImageUrl(value)) {
              const { url, id } = uploadImageForUrl(value, baseUrl);
              uploadedImageIds.push(id);
              processedDynamicInputs[key] = url;
              console.log(`[API:${requestId}] Converted large dynamic input '${key}' to URL: ${url}`);
            }
          }
        }
      }

      try {
        // Build generation input
        const genInput: GenerationInput = {
          model: {
            id: selectedModel!.modelId,
            name: selectedModel!.displayName,
            provider: "fal",
            capabilities: ["text-to-image"],
            description: null,
          },
          prompt: prompt || "",
          images: processedImages,
          parameters,
          dynamicInputs: processedDynamicInputs,
        };

        const result = await generateWithFal(requestId, falApiKey, genInput);

        if (!result.success) {
          return NextResponse.json<GenerateResponse>(
            {
              success: false,
              error: result.error || "Generation failed",
            },
            { status: 500 }
          );
        }

        // Return first output (image or video)
        const output = result.outputs?.[0];
        if (!output?.data) {
          return NextResponse.json<GenerateResponse>(
            {
              success: false,
              error: "No output in generation result",
            },
            { status: 500 }
          );
        }

        // Return appropriate fields based on output type
        if (output.type === "video") {
          // Check if data is a URL (for large videos) or base64
          const isUrl = output.data.startsWith("http");
          return NextResponse.json<GenerateResponse>({
            success: true,
            video: isUrl ? undefined : output.data,
            videoUrl: isUrl ? output.data : undefined,
            contentType: "video",
          });
        }

        return NextResponse.json<GenerateResponse>({
          success: true,
          image: output.data,
          contentType: "image",
        });
      } finally {
        // Clean up uploaded images
        if (uploadedImageIds.length > 0) {
          deleteImages(uploadedImageIds);
          console.log(`[API:${requestId}] Cleaned up ${uploadedImageIds.length} uploaded images`);
        }
      }
    }

    // Default: Use Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      console.error(`[API:${requestId}] No Gemini API key configured`);
      return NextResponse.json<GenerateResponse>(
        {
          success: false,
          error: "API key not configured. Add GEMINI_API_KEY to .env.local",
        },
        { status: 500 }
      );
    }

    return await generateWithGemini(
      requestId,
      geminiApiKey,
      prompt,
      images || [],
      model,
      aspectRatio,
      resolution,
      useGoogleSearch
    );
  } catch (error) {
    console.error(`[API:${requestId}] EXCEPTION CAUGHT IN API ROUTE`);
    console.error(`[API:${requestId}] Error type:`, error?.constructor?.name);
    console.error(`[API:${requestId}] Error toString:`, String(error));

    // Extract detailed error information
    let errorMessage = "Generation failed";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      console.error(`[API:${requestId}] Error message:`, errorMessage);
      console.error(`[API:${requestId}] Error stack:`, error.stack);

      // Check for specific error types
      if ("cause" in error && error.cause) {
        console.error(`[API:${requestId}] Error cause:`, error.cause);
        errorDetails += `\nCause: ${JSON.stringify(error.cause)}`;
      }
    }

    // Try to extract more details from API errors
    if (error && typeof error === "object") {
      const apiError = error as Record<string, unknown>;
      console.error(`[API:${requestId}] Error object keys:`, Object.keys(apiError));

      if (apiError.status) {
        console.error(`[API:${requestId}] Error status:`, apiError.status);
        errorDetails += `\nStatus: ${apiError.status}`;
      }
      if (apiError.statusText) {
        console.error(`[API:${requestId}] Error statusText:`, apiError.statusText);
        errorDetails += `\nStatusText: ${apiError.statusText}`;
      }
      if (apiError.errorDetails) {
        console.error(`[API:${requestId}] Error errorDetails:`, apiError.errorDetails);
        errorDetails += `\nDetails: ${JSON.stringify(apiError.errorDetails)}`;
      }
      if (apiError.response) {
        try {
          console.error(`[API:${requestId}] Error response:`, apiError.response);
          errorDetails += `\nResponse: ${JSON.stringify(apiError.response)}`;
        } catch {
          errorDetails += `\nResponse: [unable to stringify]`;
        }
      }

      // Log entire error object for debugging
      try {
        console.error(`[API:${requestId}] Full error object:`, JSON.stringify(apiError, null, 2));
      } catch {
        console.error(`[API:${requestId}] Could not stringify full error object`);
      }
    }

    console.error(`[API:${requestId}] Compiled error details:`, errorDetails);

    // Handle rate limiting
    if (errorMessage.includes("429")) {
      console.error(`[API:${requestId}] Rate limit error detected`);
      return NextResponse.json<GenerateResponse>(
        {
          success: false,
          error: "Rate limit reached. Please wait and try again.",
        },
        { status: 429 }
      );
    }

    console.error(`[API:${requestId}] Returning 500 error response`);
    return NextResponse.json<GenerateResponse>(
      {
        success: false,
        error: `${errorMessage}${errorDetails ? ` | Details: ${errorDetails.substring(0, 500)}` : ""}`,
      },
      { status: 500 }
    );
  }
}
