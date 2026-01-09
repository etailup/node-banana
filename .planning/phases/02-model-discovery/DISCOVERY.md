# Phase 2 Discovery: Model Discovery APIs

**Date:** 2026-01-09
**Level:** 2 - Standard Research

## Research Objectives

1. Replicate model listing API endpoints and response schema
2. fal.ai model discovery endpoints and response schema
3. Pagination approaches for both providers
4. Authentication header formats

## Findings

### Replicate API

**Endpoint:** `GET https://api.replicate.com/v1/models`

**Authentication:**
```
Authorization: Bearer $REPLICATE_API_TOKEN
```

**Query Parameters:**
- `sort_by`: Sort field (default: `latest_version_created_at`)
- `sort_direction`: `asc` or `desc`

**Response Schema:**
```typescript
interface ReplicateModelsResponse {
  next: string | null;      // URL to next page
  previous: string | null;  // URL to previous page
  results: ReplicateModel[];
}

interface ReplicateModel {
  url: string;              // Web page link
  owner: string;            // Username/organization
  name: string;             // Model identifier
  description: string;      // Text summary
  visibility: "public" | "private";
  github_url?: string;
  paper_url?: string;
  license_url?: string;
  run_count: number;        // Usage statistics
  cover_image_url?: string; // Thumbnail
  default_example?: object; // Sample prediction
  latest_version?: {
    id: string;
    openapi_schema: object; // Input/output specs
  };
}
```

**Pagination:** Cursor-based via `next`/`previous` URLs. Follow `next` URL until null.

**Search Endpoint (Beta):**
```
GET https://api.replicate.com/v1/search?query=...
```
Returns broader search results across models.

### fal.ai API

**Endpoint:** `GET https://api.fal.ai/v1/models`

**Authentication (Optional - higher rate limits):**
```
Authorization: Key $FAL_KEY
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return |
| `cursor` | string | Pagination cursor from previous response |
| `endpoint_id` | string/array | Specific endpoint ID(s) to retrieve |
| `q` | string | Free-text search query |
| `category` | string | Filter by category (e.g., 'text-to-image') |
| `status` | enum | `active` or `deprecated` |
| `expand` | string | Include `openapi-3.0` for full schema |

**Response Schema:**
```typescript
interface FalModelsResponse {
  models: FalModel[];
  next_cursor: string | null;
  has_more: boolean;
}

interface FalModel {
  endpoint_id: string;      // e.g., "fal-ai/flux/dev"
  metadata: {
    display_name: string;
    category: string;       // e.g., "text-to-image"
    description: string;
    status: "active" | "deprecated";
    tags: string[];
    updated_at: string;     // ISO8601
    is_favorited: boolean | null;
    thumbnail_url: string;
    model_url: string;
    date: string;           // ISO8601
    highlighted: boolean;
    pinned: boolean;
    thumbnail_animated_url?: string;
    github_url?: string;
    license_type?: "commercial" | "research" | "private";
  };
  openapi?: object;         // When expand=openapi-3.0
}
```

**Pagination:** Cursor-based. Use `next_cursor` value as `cursor` param. Stop when `has_more` is false.

**Categories of Interest:**
- `text-to-image`
- `image-to-image`
- `text-to-video`
- `image-to-video`

## Mapping to ProviderModel

Both APIs need to be normalized to our `ProviderModel` interface:

```typescript
interface ProviderModel {
  id: string;                    // Replicate: `${owner}/${name}`, fal: endpoint_id
  name: string;                  // Replicate: name, fal: display_name
  description: string | null;    // Replicate: description, fal: metadata.description
  provider: ProviderType;        // "replicate" | "fal"
  capabilities: ModelCapability[];// Derived from run type or fal category
  coverImage?: string;           // Replicate: cover_image_url, fal: thumbnail_url
  pricing?: { type, amount, currency };
}
```

**Capability Mapping:**
- fal.ai: Direct from `category` field
- Replicate: Infer from model name/description or openapi_schema input/output types

## Implementation Approach

### Provider Module Pattern

Each provider implements `ProviderInterface` and self-registers:

```typescript
// src/lib/providers/replicate.ts
const replicateProvider: ProviderInterface = {
  id: "replicate",
  name: "Replicate",
  listModels: async () => { /* fetch and map */ },
  searchModels: async (query) => { /* use search endpoint */ },
  getModel: async (id) => { /* fetch specific model */ },
  generate: async (input) => { /* create prediction */ },
  isConfigured: () => !!getApiKey(),
  getApiKey: () => /* from store or env */,
};

registerProvider(replicateProvider);
```

### API Route Pattern

Expose via Next.js API routes for client access:

```typescript
// src/app/api/providers/[provider]/models/route.ts
// GET /api/providers/replicate/models?search=flux
```

### Caching Strategy

Cache model lists in memory with TTL:
- **Duration:** 5-15 minutes (models don't change frequently)
- **Key:** `${provider}:models` or `${provider}:search:${query}`
- **Invalidation:** Manual refresh button in UI

## Decisions

1. **No SDK usage** - Direct fetch calls to REST APIs as per project constraints
2. **Server-side fetching** - API routes proxy requests (hides API keys from client)
3. **Initial page only** - First API call fetches ~50-100 models, pagination on-demand for search
4. **Category filtering** - Filter to image/video capabilities only (no audio, 3D, etc.)

## Next Steps

1. Create Replicate provider implementation with model fetching
2. Create fal.ai provider implementation with model fetching
3. Add API routes for client access to model lists
4. Implement simple in-memory caching with TTL

## Sources

- [Replicate HTTP API Reference](https://replicate.com/docs/reference/http)
- [fal.ai Model Search API](https://docs.fal.ai/platform-apis/v1/models)
