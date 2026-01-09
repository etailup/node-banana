/**
 * Unified Models API Endpoint
 *
 * Aggregates models from all configured providers (Replicate, fal.ai).
 * Uses in-memory caching to reduce external API calls.
 *
 * GET /api/models
 *
 * Query params:
 *   - provider: Optional, filter to specific provider ("replicate" | "fal")
 *   - search: Optional, search query
 *   - refresh: Optional, bypass cache if "true"
 *
 * Headers:
 *   - X-Replicate-Key: Replicate API key
 *   - X-Fal-Key: fal.ai API key (optional, works without but rate limited)
 *
 * Response:
 *   {
 *     success: true,
 *     models: ProviderModel[],
 *     cached: boolean,
 *     providers: { [provider]: { success, count, cached?, error? } },
 *     errors?: string[]
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { ProviderType } from "@/types";
import { ProviderModel, ModelCapability } from "@/lib/providers";
import {
  getCachedModels,
  setCachedModels,
  getCacheKey,
} from "@/lib/providers/cache";

// API base URLs
const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const FAL_API_BASE = "https://api.fal.ai/v1";

// Categories we care about for image/video generation (fal.ai)
const RELEVANT_CATEGORIES = [
  "text-to-image",
  "image-to-image",
  "text-to-video",
  "image-to-video",
];

// ============ Replicate Types ============

interface ReplicateModelsResponse {
  next: string | null;
  previous: string | null;
  results: ReplicateModel[];
}

interface ReplicateSearchResponse {
  next: string | null;
  results: ReplicateSearchResult[];
}

interface ReplicateSearchResult {
  model: ReplicateModel;
}

interface ReplicateModel {
  url: string;
  owner: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  run_count: number;
  cover_image_url?: string;
  default_example?: Record<string, unknown>;
  latest_version?: {
    id: string;
    openapi_schema?: Record<string, unknown>;
  };
}

// ============ Fal.ai Types ============

interface FalModelsResponse {
  models: FalModel[];
  next_cursor: string | null;
  has_more: boolean;
}

interface FalModel {
  endpoint_id: string;
  metadata: {
    display_name: string;
    category: string;
    description: string;
    status: "active" | "deprecated";
    tags: string[];
    updated_at: string;
    is_favorited: boolean | null;
    thumbnail_url: string;
    model_url: string;
    date: string;
    highlighted: boolean;
    pinned: boolean;
    thumbnail_animated_url?: string;
    github_url?: string;
    license_type?: "commercial" | "research" | "private";
  };
  openapi?: Record<string, unknown>;
}

// ============ Response Types ============

interface ProviderResult {
  success: boolean;
  count: number;
  cached?: boolean;
  error?: string;
}

interface ModelsSuccessResponse {
  success: true;
  models: ProviderModel[];
  cached: boolean;
  providers: Record<string, ProviderResult>;
  errors?: string[];
}

interface ModelsErrorResponse {
  success: false;
  error: string;
}

type ModelsResponse = ModelsSuccessResponse | ModelsErrorResponse;

// ============ Replicate Helpers ============

function inferReplicateCapabilities(model: ReplicateModel): ModelCapability[] {
  const capabilities: ModelCapability[] = ["text-to-image"];

  const searchText = `${model.name} ${model.description ?? ""}`.toLowerCase();

  if (
    searchText.includes("img2img") ||
    searchText.includes("image-to-image") ||
    searchText.includes("inpaint") ||
    searchText.includes("controlnet")
  ) {
    capabilities.push("image-to-image");
  }

  if (
    searchText.includes("video") ||
    searchText.includes("animate") ||
    searchText.includes("motion")
  ) {
    if (
      searchText.includes("img2vid") ||
      searchText.includes("image-to-video")
    ) {
      capabilities.push("image-to-video");
    } else {
      capabilities.push("text-to-video");
    }
  }

  return capabilities;
}

function mapReplicateModel(model: ReplicateModel): ProviderModel {
  return {
    id: `${model.owner}/${model.name}`,
    name: model.name,
    description: model.description,
    provider: "replicate",
    capabilities: inferReplicateCapabilities(model),
    coverImage: model.cover_image_url,
  };
}

async function fetchReplicateModels(
  apiKey: string,
  searchQuery?: string
): Promise<ProviderModel[]> {
  let url: string;
  let isSearchRequest = false;

  if (searchQuery) {
    url = `${REPLICATE_API_BASE}/search?query=${encodeURIComponent(searchQuery)}`;
    isSearchRequest = true;
  } else {
    url = `${REPLICATE_API_BASE}/models`;
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Replicate API error: ${response.status}`);
  }

  if (isSearchRequest) {
    const data: ReplicateSearchResponse = await response.json();
    if (!data.results) return [];
    return data.results.map((result) => mapReplicateModel(result.model));
  } else {
    const data: ReplicateModelsResponse = await response.json();
    if (!data.results) return [];
    return data.results.map(mapReplicateModel);
  }
}

// ============ Fal.ai Helpers ============

function mapFalCategory(category: string): ModelCapability | null {
  if (RELEVANT_CATEGORIES.includes(category)) {
    return category as ModelCapability;
  }
  return null;
}

function isRelevantFalModel(model: FalModel): boolean {
  return RELEVANT_CATEGORIES.includes(model.metadata.category);
}

function mapFalModel(model: FalModel): ProviderModel {
  const capability = mapFalCategory(model.metadata.category);

  return {
    id: model.endpoint_id,
    name: model.metadata.display_name,
    description: model.metadata.description,
    provider: "fal",
    capabilities: capability ? [capability] : [],
    coverImage: model.metadata.thumbnail_url,
  };
}

async function fetchFalModels(
  apiKey: string | null,
  searchQuery?: string
): Promise<ProviderModel[]> {
  let url = `${FAL_API_BASE}/models?status=active`;

  if (searchQuery) {
    url += `&q=${encodeURIComponent(searchQuery)}`;
  }

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["Authorization"] = `Key ${apiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`fal.ai API error: ${response.status}`);
  }

  const data: FalModelsResponse = await response.json();

  return data.models.filter(isRelevantFalModel).map(mapFalModel);
}

// ============ Main Handler ============

export async function GET(
  request: NextRequest
): Promise<NextResponse<ModelsResponse>> {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[Models:${requestId}] Unified models request started`);

  // Parse query params
  const providerFilter = request.nextUrl.searchParams.get("provider") as
    | ProviderType
    | null;
  const searchQuery = request.nextUrl.searchParams.get("search") || undefined;
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  // Get API keys from headers
  const replicateKey = request.headers.get("X-Replicate-Key");
  const falKey = request.headers.get("X-Fal-Key");

  console.log(
    `[Models:${requestId}] Provider filter: ${providerFilter || "all"}, Search: ${searchQuery || "none"}, Refresh: ${refresh}`
  );
  console.log(
    `[Models:${requestId}] Keys: Replicate=${replicateKey ? "yes" : "no"}, Fal=${falKey ? "yes" : "no"}`
  );

  // Determine which providers to fetch from
  const providersToFetch: ProviderType[] = [];

  if (providerFilter) {
    // Only fetch from specified provider if key is available (or fal which is optional)
    if (providerFilter === "replicate" && replicateKey) {
      providersToFetch.push("replicate");
    } else if (providerFilter === "fal") {
      // fal.ai works without key
      providersToFetch.push("fal");
    }
  } else {
    // Fetch from all providers with keys
    if (replicateKey) {
      providersToFetch.push("replicate");
    }
    // fal.ai always included (works without key)
    providersToFetch.push("fal");
  }

  if (providersToFetch.length === 0) {
    console.log(`[Models:${requestId}] No providers available`);
    return NextResponse.json<ModelsErrorResponse>(
      {
        success: false,
        error:
          "No providers available. Provide API keys via X-Replicate-Key or X-Fal-Key headers.",
      },
      { status: 400 }
    );
  }

  const allModels: ProviderModel[] = [];
  const providerResults: Record<string, ProviderResult> = {};
  const errors: string[] = [];
  let anyFromCache = false;
  let allFromCache = true;

  // Fetch from each provider
  for (const provider of providersToFetch) {
    const cacheKey = getCacheKey(provider, searchQuery);
    let models: ProviderModel[] | null = null;
    let fromCache = false;

    // Check cache first (unless refresh=true)
    if (!refresh) {
      const cached = getCachedModels(cacheKey);
      if (cached) {
        models = cached;
        fromCache = true;
        anyFromCache = true;
        console.log(
          `[Models:${requestId}] ${provider}: Using cached models (${cached.length})`
        );
      }
    }

    // Fetch from API if cache miss
    if (!models) {
      allFromCache = false;
      try {
        if (provider === "replicate") {
          models = await fetchReplicateModels(replicateKey!, searchQuery);
        } else if (provider === "fal") {
          models = await fetchFalModels(falKey, searchQuery);
        } else {
          models = [];
        }

        // Store in cache
        setCachedModels(cacheKey, models);
        console.log(
          `[Models:${requestId}] ${provider}: Fetched ${models.length} models from API`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`[Models:${requestId}] ${provider}: Error - ${errorMessage}`);
        errors.push(`${provider}: ${errorMessage}`);
        providerResults[provider] = {
          success: false,
          count: 0,
          error: errorMessage,
        };
        continue;
      }
    }

    // Add to results
    allModels.push(...models);
    providerResults[provider] = {
      success: true,
      count: models.length,
      cached: fromCache,
    };
  }

  // Check if we got any models
  if (allModels.length === 0 && errors.length === providersToFetch.length) {
    // All providers failed
    console.log(`[Models:${requestId}] All providers failed`);
    return NextResponse.json<ModelsErrorResponse>(
      {
        success: false,
        error: `All providers failed: ${errors.join("; ")}`,
      },
      { status: 500 }
    );
  }

  // Sort models by provider, then by name
  allModels.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return a.name.localeCompare(b.name);
  });

  console.log(
    `[Models:${requestId}] Returning ${allModels.length} models from ${Object.keys(providerResults).length} providers`
  );

  const response: ModelsSuccessResponse = {
    success: true,
    models: allModels,
    cached: anyFromCache && allFromCache,
    providers: providerResults,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  return NextResponse.json<ModelsSuccessResponse>(response);
}
