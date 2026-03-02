/**
 * Upload Image API Route
 *
 * Accepts a single base64 image and uploads it to the provider's CDN,
 * returning a URL. This avoids sending large base64 payloads in the
 * /api/generate request body.
 *
 * Currently supports: kie (Kie.ai CDN)
 */
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface UploadRequest {
  image: string; // base64 data URL
  provider: "kie";
}

interface UploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

function detectImageType(buffer: Buffer): { mimeType: string; ext: string } {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mimeType: "image/png", ext: "png" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", ext: "jpg" };
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { mimeType: "image/webp", ext: "webp" };
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { mimeType: "image/gif", ext: "gif" };
  }
  return { mimeType: "image/png", ext: "png" };
}

async function uploadToKie(apiKey: string, base64Image: string): Promise<string> {
  let imageData = base64Image;

  if (base64Image.startsWith("data:")) {
    const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      imageData = matches[2];
    }
  }

  const binaryData = Buffer.from(imageData, "base64");
  const detected = detectImageType(binaryData);
  const filename = `upload_${Date.now()}.${detected.ext}`;
  const dataUrl = `data:${detected.mimeType};base64,${imageData}`;

  const response = await fetch("https://kieai.redpandaai.co/api/file-base64-upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base64Data: dataUrl,
      uploadPath: "images",
      fileName: filename,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.code && result.code !== 200 && !result.success) {
    throw new Error(`Upload failed: ${result.msg || "Unknown error"}`);
  }

  const downloadUrl = result.data?.downloadUrl || result.downloadUrl || result.url;
  if (!downloadUrl) {
    throw new Error("No download URL in upload response");
  }

  return downloadUrl;
}

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json();
    const { image, provider } = body;

    if (!image) {
      return NextResponse.json<UploadResponse>(
        { success: false, error: "Missing image" },
        { status: 400 },
      );
    }

    if (provider === "kie") {
      const apiKey = request.headers.get("X-Kie-Key") || process.env.KIE_API_KEY;
      if (!apiKey) {
        return NextResponse.json<UploadResponse>(
          { success: false, error: "Kie API key not configured" },
          { status: 401 },
        );
      }

      const url = await uploadToKie(apiKey, image);
      return NextResponse.json<UploadResponse>({ success: true, url });
    }

    return NextResponse.json<UploadResponse>(
      { success: false, error: `Unsupported provider: ${provider}` },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-image] Error:", message);
    return NextResponse.json<UploadResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
