/**
 * Cloud Editor Storage Layer
 *
 * R2 uploads for editor assets + Supabase CRUD for editor workflows.
 * Reuses the S3Client singleton pattern from headless/storage.ts.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { WorkflowFile } from "@/store/workflowStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if running in cloud mode (Vercel deployment)
 */
export function isCloudMode(): boolean {
  return !!process.env.VERCEL;
}

// ---------------------------------------------------------------------------
// S3 Client singleton (shared with headless storage via same env vars)
// ---------------------------------------------------------------------------

let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3) {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY env vars");
    }
    _s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _s3;
}

function getR2Config() {
  const bucket = process.env.R2_BUCKET_NAME || "headless-outputs";
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error("Missing R2_PUBLIC_URL env var");
  }
  const base = publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`;
  return { bucket, base };
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Get authenticated user ID from Supabase cookies.
 * Returns null if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// R2 Uploads
// ---------------------------------------------------------------------------

/**
 * Upload a base64 image/video to R2 and return the public CDN URL.
 * Stored at: editor/{workflowId}/{folder}/{assetId}.{ext}
 */
export async function uploadEditorAsset(
  workflowId: string,
  assetId: string,
  base64Data: string,
  folder: "inputs" | "generations",
  contentType: string = "image/png",
): Promise<string> {
  const { bucket, base } = getR2Config();

  // Strip data URL prefix if present
  const raw = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const buffer = Buffer.from(raw, "base64");
  const extension = getExtensionFromContentType(contentType);
  const key = `editor/${workflowId}/${folder}/${assetId}.${extension}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${base}${key}`;
}

/**
 * Upload a raw Buffer (e.g. from HTTP fetch) to R2 and return CDN URL.
 */
export async function uploadEditorAssetBuffer(
  workflowId: string,
  assetId: string,
  buffer: Buffer,
  folder: "inputs" | "generations",
  contentType: string = "image/png",
): Promise<string> {
  const { bucket, base } = getR2Config();
  const extension = getExtensionFromContentType(contentType);
  const key = `editor/${workflowId}/${folder}/${assetId}.${extension}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return `${base}${key}`;
}

function getExtensionFromContentType(ct: string): string {
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("mp4")) return "mp4";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mov") || ct.includes("quicktime")) return "mov";
  return "png";
}

// ---------------------------------------------------------------------------
// Supabase: Editor Workflows CRUD
// ---------------------------------------------------------------------------

export interface EditorWorkflowRow {
  id: string;
  user_id: string;
  name: string;
  definition: WorkflowFile;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditorWorkflowListItem {
  id: string;
  name: string;
  thumbnail_url: string | null;
  updated_at: string;
}

/**
 * List workflows for a user (metadata only, no full definition).
 */
export async function listEditorWorkflows(userId: string): Promise<EditorWorkflowListItem[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("editor_workflows")
    .select("id, name, thumbnail_url, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list editor workflows: ${error.message}`);
  return (data || []) as EditorWorkflowListItem[];
}

/**
 * Get a single workflow by ID (full definition).
 */
export async function getEditorWorkflow(id: string): Promise<EditorWorkflowRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("editor_workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`Failed to get editor workflow: ${error.message}`);
  return data as EditorWorkflowRow;
}

/**
 * Upsert a workflow (insert or update).
 */
export async function upsertEditorWorkflow(
  id: string,
  userId: string,
  name: string,
  definition: WorkflowFile,
  thumbnailUrl?: string | null,
): Promise<EditorWorkflowRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("editor_workflows")
    .upsert(
      {
        id,
        user_id: userId,
        name,
        definition,
        thumbnail_url: thumbnailUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert editor workflow: ${error.message}`);
  return data as EditorWorkflowRow;
}

/**
 * Delete a workflow by ID. Verifies ownership via userId.
 */
export async function deleteEditorWorkflow(id: string, userId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("editor_workflows")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete editor workflow: ${error.message}`);
}
