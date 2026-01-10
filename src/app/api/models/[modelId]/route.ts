/**
 * Model Schema API Endpoint
 *
 * Fetches parameter schema for a specific model from its provider.
 * Returns simplified parameter list for UI rendering.
 *
 * GET /api/models/:modelId?provider=replicate|fal
 *
 * Headers:
 *   - X-Replicate-Key: Required for Replicate models
 *   - X-Fal-Key: Optional for fal.ai models
 *
 * Response:
 *   {
 *     success: true,
 *     parameters: ModelParameter[],
 *     cached: boolean
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { ProviderType } from "@/types";
import { ModelParameter } from "@/lib/providers/types";

// Cache for model schemas (10 minute TTL)
const schemaCache = new Map<string, { parameters: ModelParameter[]; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Parameters to filter out (internal/system params)
const EXCLUDED_PARAMS = new Set([
  "webhook",
  "webhook_events_filter",
  "sync_mode",
  "disable_safety_checker",
  "go_fast",
  "enable_safety_checker",
  "output_format",
  "output_quality",
  "request_id",
]);

// Parameters we want to surface (user-relevant)
const PRIORITY_PARAMS = new Set([
  "seed",
  "num_inference_steps",
  "inference_steps",
  "steps",
  "guidance_scale",
  "guidance",
  "negative_prompt",
  "width",
  "height",
  "num_outputs",
  "num_images",
  "scheduler",
  "strength",
  "cfg_scale",
  "lora_scale",
]);

interface SchemaSuccessResponse {
  success: true;
  parameters: ModelParameter[];
  cached: boolean;
}

interface SchemaErrorResponse {
  success: false;
  error: string;
}

type SchemaResponse = SchemaSuccessResponse | SchemaErrorResponse;

/**
 * Convert OpenAPI schema property to ModelParameter
 */
function convertSchemaProperty(
  name: string,
  prop: Record<string, unknown>,
  required: string[]
): ModelParameter | null {
  // Skip excluded parameters
  if (EXCLUDED_PARAMS.has(name)) {
    return null;
  }

  // Determine type
  let type: ModelParameter["type"] = "string";
  const schemaType = prop.type as string | undefined;
  const allOf = prop.allOf as Array<Record<string, unknown>> | undefined;

  if (schemaType === "integer") {
    type = "integer";
  } else if (schemaType === "number") {
    type = "number";
  } else if (schemaType === "boolean") {
    type = "boolean";
  } else if (schemaType === "array") {
    type = "array";
  } else if (allOf && allOf.length > 0) {
    // Handle allOf with enum reference
    type = "string";
  }

  const parameter: ModelParameter = {
    name,
    type,
    description: prop.description as string | undefined,
    default: prop.default,
    required: required.includes(name),
  };

  // Add constraints
  if (typeof prop.minimum === "number") {
    parameter.minimum = prop.minimum;
  }
  if (typeof prop.maximum === "number") {
    parameter.maximum = prop.maximum;
  }
  if (Array.isArray(prop.enum)) {
    parameter.enum = prop.enum;
  }

  return parameter;
}

/**
 * Fetch and parse schema from Replicate
 */
async function fetchReplicateSchema(
  modelId: string,
  apiKey: string
): Promise<ModelParameter[]> {
  const [owner, name] = modelId.split("/");

  const response = await fetch(
    `https://api.replicate.com/v1/models/${owner}/${name}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status}`);
  }

  const data = await response.json();

  // Extract schema from latest_version.openapi_schema
  const openApiSchema = data.latest_version?.openapi_schema;
  if (!openApiSchema) {
    return [];
  }

  // Navigate to Input schema
  const inputSchema = openApiSchema.components?.schemas?.Input;
  if (!inputSchema || typeof inputSchema !== "object") {
    return [];
  }

  const properties = (inputSchema as Record<string, unknown>).properties as Record<string, Record<string, unknown>> | undefined;
  const required = ((inputSchema as Record<string, unknown>).required as string[]) || [];

  if (!properties) {
    return [];
  }

  const parameters: ModelParameter[] = [];

  for (const [name, prop] of Object.entries(properties)) {
    // Skip prompt as it's handled separately
    if (name === "prompt") continue;

    const param = convertSchemaProperty(name, prop, required);
    if (param) {
      parameters.push(param);
    }
  }

  // Sort: priority params first, then alphabetically
  parameters.sort((a, b) => {
    const aIsPriority = PRIORITY_PARAMS.has(a.name);
    const bIsPriority = PRIORITY_PARAMS.has(b.name);
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return a.name.localeCompare(b.name);
  });

  return parameters;
}

/**
 * Fetch and parse schema from fal.ai
 */
async function fetchFalSchema(
  modelId: string,
  apiKey: string | null
): Promise<ModelParameter[]> {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["Authorization"] = `Key ${apiKey}`;
  }

  // Fetch OpenAPI spec from /api endpoint
  // Note: Not all fal.ai models expose this endpoint, so 404 is expected for some
  const response = await fetch(`https://fal.run/${modelId}/api`, { headers });

  if (!response.ok) {
    // 404 is common - many fal.ai models don't expose OpenAPI schema
    // Return empty params rather than error so generation can still work
    if (response.status === 404) {
      console.log(`[fetchFalSchema] Model ${modelId} does not expose OpenAPI schema (404)`);
      return [];
    }
    throw new Error(`fal.ai API error: ${response.status}`);
  }

  const spec = await response.json();

  // Navigate to request body schema
  // Path: paths["/"]["post"].requestBody.content["application/json"].schema
  const requestBodySchema = spec.paths?.["/"]?.post?.requestBody?.content?.["application/json"]?.schema;

  if (!requestBodySchema) {
    return [];
  }

  const properties = requestBodySchema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = (requestBodySchema.required as string[]) || [];

  if (!properties) {
    return [];
  }

  const parameters: ModelParameter[] = [];

  for (const [name, prop] of Object.entries(properties)) {
    // Skip prompt and image_url as they're handled separately
    if (name === "prompt" || name === "image_url") continue;

    const param = convertSchemaProperty(name, prop, required);
    if (param) {
      parameters.push(param);
    }
  }

  // Sort: priority params first, then alphabetically
  parameters.sort((a, b) => {
    const aIsPriority = PRIORITY_PARAMS.has(a.name);
    const bIsPriority = PRIORITY_PARAMS.has(b.name);
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return a.name.localeCompare(b.name);
  });

  return parameters;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
): Promise<NextResponse<SchemaResponse>> {
  const requestId = Math.random().toString(36).substring(7);

  // Await params before accessing properties
  const { modelId } = await params;
  const decodedModelId = decodeURIComponent(modelId);
  const provider = request.nextUrl.searchParams.get("provider") as ProviderType | null;

  console.log(`[ModelSchema:${requestId}] Fetching schema for ${decodedModelId} (provider: ${provider})`);

  if (!provider || (provider !== "replicate" && provider !== "fal")) {
    return NextResponse.json<SchemaErrorResponse>(
      {
        success: false,
        error: "Invalid or missing provider. Use ?provider=replicate or ?provider=fal",
      },
      { status: 400 }
    );
  }

  // Check cache
  const cacheKey = `${provider}:${decodedModelId}`;
  const cached = schemaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[ModelSchema:${requestId}] Cache hit, returning ${cached.parameters.length} parameters`);
    return NextResponse.json<SchemaSuccessResponse>({
      success: true,
      parameters: cached.parameters,
      cached: true,
    });
  }

  try {
    let parameters: ModelParameter[];

    if (provider === "replicate") {
      const apiKey = request.headers.get("X-Replicate-Key");
      if (!apiKey) {
        return NextResponse.json<SchemaErrorResponse>(
          {
            success: false,
            error: "Replicate API key required. Include X-Replicate-Key header.",
          },
          { status: 401 }
        );
      }
      parameters = await fetchReplicateSchema(decodedModelId, apiKey);
    } else {
      const apiKey = request.headers.get("X-Fal-Key");
      parameters = await fetchFalSchema(decodedModelId, apiKey);
    }

    // Cache the result
    schemaCache.set(cacheKey, { parameters, timestamp: Date.now() });

    console.log(`[ModelSchema:${requestId}] Returning ${parameters.length} parameters`);
    return NextResponse.json<SchemaSuccessResponse>({
      success: true,
      parameters,
      cached: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[ModelSchema:${requestId}] Error: ${errorMessage}`);
    return NextResponse.json<SchemaErrorResponse>(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
