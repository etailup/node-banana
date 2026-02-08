/**
 * Replicate Provider for Generate API Route
 *
 * Handles image/video generation using Replicate's prediction API.
 */

import { GenerationInput, GenerationOutput } from "@/lib/providers/types";
import {
  getParameterTypesFromSchema,
  coerceParameterTypes,
  getInputMappingFromSchema,
} from "../schemaUtils";

/**
 * Generate image using Replicate API
 */
export async function generateWithReplicate(
  requestId: string,
  apiKey: string,
  input: GenerationInput
): Promise<GenerationOutput> {
  console.log(`[API:${requestId}] Replicate generation - Model: ${input.model.id}, Images: ${input.images?.length || 0}, Prompt: ${input.prompt.length} chars`);

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
  console.log(`[API:${requestId}] Model version: ${version}, Dynamic inputs: ${hasDynamicInputs ? Object.keys(input.dynamicInputs!).join(", ") : "none"}`);

  // Get schema for type coercion and input mapping
  const schema = modelData.latest_version?.openapi_schema as Record<string, unknown> | undefined;
  const parameterTypes = getParameterTypesFromSchema(schema);

  // Build input for the prediction, coercing parameter types from schema
  const predictionInput: Record<string, unknown> = {
    ...coerceParameterTypes(input.parameters, parameterTypes),
  };

  // Add dynamic inputs if provided (these come from schema-mapped connections)
  if (hasDynamicInputs) {
    const { schemaArrayParams } = getInputMappingFromSchema(schema);

    // Apply array wrapping based on schema type
    for (const [key, value] of Object.entries(input.dynamicInputs!)) {
      if (value !== null && value !== undefined && value !== '') {
        if (schemaArrayParams.has(key) && !Array.isArray(value)) {
          predictionInput[key] = [value];  // Wrap in array
        } else {
          predictionInput[key] = value;
        }
      }
    }
  } else {
    // Fallback: use schema to map generic input names to model-specific parameter names
    const { paramMap, arrayParams } = getInputMappingFromSchema(schema);

    // Map prompt input
    if (input.prompt) {
      const promptParam = paramMap.prompt || "prompt";
      predictionInput[promptParam] = input.prompt;
    }

    // Map image input - use array or string format based on schema
    if (input.images && input.images.length > 0) {
      const imageParam = paramMap.image || "image";
      if (arrayParams.has("image")) {
        predictionInput[imageParam] = input.images;
      } else {
        predictionInput[imageParam] = input.images[0];
      }
    }

    // Map any parameters that might need renaming (use coerced values)
    const coercedParams = coerceParameterTypes(input.parameters, parameterTypes);
    for (const [key, value] of Object.entries(coercedParams)) {
      const mappedKey = paramMap[key] || key;
      predictionInput[mappedKey] = value;
    }
  }

  // Create a prediction
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
  console.log(`[API:${requestId}] Prediction created: ${prediction.id}`);

  // Poll for completion
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 1000; // 1 second
  const startTime = Date.now();

  let currentPrediction = prediction;
  let lastStatus = "";

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
    if (currentPrediction.status !== lastStatus) {
      console.log(`[API:${requestId}] Prediction status: ${currentPrediction.status}`);
      lastStatus = currentPrediction.status;
    }
  }

  if (currentPrediction.status === "failed") {
    const failureReason = currentPrediction.error || "Prediction failed";
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
  console.log(`[API:${requestId}] Fetching output from: ${mediaUrl.substring(0, 80)}...`);
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

  console.log(`[API:${requestId}] Output: ${contentType}, ${mediaSizeMB.toFixed(2)}MB`);

  // For very large videos (>20MB), return URL directly instead of base64
  if (isVideo && mediaSizeMB > 20) {
    console.log(`[API:${requestId}] SUCCESS - Returning URL for large video`);
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
  console.log(`[API:${requestId}] SUCCESS - Returning ${isVideo ? "video" : "image"}`);

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
