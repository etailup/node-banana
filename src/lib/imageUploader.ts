/**
 * Client-side image pre-upload utility.
 *
 * Uploads base64 images to provider CDNs *before* sending the generate
 * request, so the /api/generate body only contains lightweight URLs.
 * This prevents "JSON payload too large" errors when many images are attached.
 */

type SupportedProvider = "kie";

/** Providers that require pre-upload (accept URLs, not inline base64). */
const PROVIDERS_REQUIRING_UPLOAD = new Set<string>(["kie"]);

/** Returns true if the given provider needs base64 images pre-uploaded. */
export function needsImagePreUpload(provider: string): boolean {
  return PROVIDERS_REQUIRING_UPLOAD.has(provider);
}

/** Returns true if a string is a base64 data URL (not an http URL). */
function isBase64(value: string): boolean {
  return value.startsWith("data:");
}

/**
 * Upload a single base64 image via /api/upload-image and return the CDN URL.
 * If the image is already a URL, returns it as-is.
 */
async function uploadOne(
  image: string,
  provider: SupportedProvider,
  headers: Record<string, string>,
): Promise<string> {
  if (!isBase64(image)) return image;

  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ image, provider }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success || !data.url) {
    throw new Error(data.error || "Upload returned no URL");
  }

  return data.url;
}

/**
 * Pre-upload all base64 images in an array, returning URLs.
 * Uploads run in parallel (max 4 concurrent) to keep it fast.
 */
export async function uploadImages(
  images: string[],
  provider: SupportedProvider,
  headers: Record<string, string>,
): Promise<string[]> {
  if (images.length === 0) return [];

  // Upload up to 4 at a time
  const CONCURRENCY = 4;
  const results: string[] = new Array(images.length);
  let i = 0;

  while (i < images.length) {
    const batch = images.slice(i, i + CONCURRENCY);
    const urls = await Promise.all(
      batch.map((img) => uploadOne(img, provider, headers)),
    );
    for (let j = 0; j < urls.length; j++) {
      results[i + j] = urls[j];
    }
    i += CONCURRENCY;
  }

  return results;
}

/**
 * Pre-upload base64 images inside a dynamicInputs map.
 * Only processes values that look like base64 data URLs.
 */
export async function uploadDynamicInputImages(
  dynamicInputs: Record<string, string | string[]>,
  provider: SupportedProvider,
  headers: Record<string, string>,
): Promise<Record<string, string | string[]>> {
  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(dynamicInputs)) {
    if (Array.isArray(value)) {
      const hasBase64 = value.some(isBase64);
      if (hasBase64) {
        result[key] = await uploadImages(value, provider, headers);
      } else {
        result[key] = value;
      }
    } else if (isBase64(value)) {
      result[key] = await uploadOne(value, provider, headers);
    } else {
      result[key] = value;
    }
  }

  return result;
}
