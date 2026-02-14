/**
 * Headless Storage Layer
 *
 * R2 uploads for output images + Supabase CRUD for workflows/jobs.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import type {
  HeadlessWorkflow,
  HeadlessJob,
  JobStatus,
  JobProgress,
  JobOutputEntry,
  JobError,
  WorkflowFileJSON,
  WorkflowVariableMap,
  ParameterOverrides,
} from "./types";

// ---------------------------------------------------------------------------
// Singleton clients (lazy-initialized)
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;
let _s3: S3Client | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

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

// ---------------------------------------------------------------------------
// R2 Upload
// ---------------------------------------------------------------------------

/**
 * Upload a base64 image to R2 and return the public CDN URL.
 */
export async function uploadToR2(
  jobId: string,
  nodeId: string,
  base64Data: string,
  contentType: string = "image/png",
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME || "headless-outputs";
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error("Missing R2_PUBLIC_URL env var");
  }

  // Strip data URL prefix if present
  const raw = base64Data.includes("base64,")
    ? base64Data.split("base64,")[1]
    : base64Data;

  const buffer = Buffer.from(raw, "base64");
  const extension = contentType.includes("png") ? "png" : "jpg";
  const key = `outputs/${jobId}/${nodeId}.${extension}`;

  await getS3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  // Return public CDN URL (trailing slash handled)
  const base = publicUrl.endsWith("/") ? publicUrl : `${publicUrl}/`;
  return `${base}${key}`;
}

// ---------------------------------------------------------------------------
// Supabase: Workflows CRUD
// ---------------------------------------------------------------------------

export async function createWorkflow(
  name: string,
  definition: WorkflowFileJSON,
  variables: WorkflowVariableMap = {},
  userId?: string | null,
): Promise<HeadlessWorkflow> {
  const row: Record<string, unknown> = { name, definition, variables };
  if (userId) row.user_id = userId;

  const { data, error } = await getSupabase()
    .from("headless_workflows")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Failed to create workflow: ${error.message}`);
  return data as HeadlessWorkflow;
}

export async function getWorkflow(id: string): Promise<HeadlessWorkflow | null> {
  const { data, error } = await getSupabase()
    .from("headless_workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null; // Not found
  if (error) throw new Error(`Failed to get workflow: ${error.message}`);
  return data as HeadlessWorkflow;
}

export async function listWorkflows(userId?: string | null): Promise<HeadlessWorkflow[]> {
  let query = getSupabase()
    .from("headless_workflows")
    .select("*")
    .order("created_at", { ascending: false });

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to list workflows: ${error.message}`);
  return (data || []) as HeadlessWorkflow[];
}

/**
 * Count workflows owned by a user.
 */
export async function countUserWorkflows(userId: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from("headless_workflows")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to count workflows:", error);
    return 0;
  }
  return count || 0;
}

export async function updateWorkflow(
  id: string,
  updates: Partial<Pick<HeadlessWorkflow, "name" | "definition" | "variables">>,
): Promise<HeadlessWorkflow> {
  const { data, error } = await getSupabase()
    .from("headless_workflows")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update workflow: ${error.message}`);
  return data as HeadlessWorkflow;
}

export async function deleteWorkflow(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("headless_workflows")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Failed to delete workflow: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Supabase: Jobs CRUD
// ---------------------------------------------------------------------------

export async function createJob(
  workflowId: string | null,
  parameters: ParameterOverrides,
  callbackUrl: string | null,
  userId?: string | null,
): Promise<HeadlessJob> {
  const row: Record<string, unknown> = {
    workflow_id: workflowId,
    status: "pending",
    parameters,
    progress: { completed: 0, total: 0 },
    outputs: {},
    errors: [],
    callback_url: callbackUrl,
  };
  if (userId) row.user_id = userId;

  const { data, error } = await getSupabase()
    .from("headless_jobs")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Failed to create job: ${error.message}`);
  return data as HeadlessJob;
}

export async function getJob(id: string): Promise<HeadlessJob | null> {
  const { data, error } = await getSupabase()
    .from("headless_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`Failed to get job: ${error.message}`);
  return data as HeadlessJob;
}

export async function updateJobStatus(
  id: string,
  status: JobStatus,
  extra?: {
    progress?: JobProgress;
    outputs?: Record<string, JobOutputEntry>;
    errors?: JobError[];
    started_at?: string;
    completed_at?: string;
    callback_delivered?: boolean;
  },
): Promise<void> {
  const { data, error } = await getSupabase()
    .from("headless_jobs")
    .update({ status, ...extra })
    .eq("id", id)
    .select("id")
    .single();

  if (error?.code === "PGRST116") {
    throw new Error(`Job not found: ${id}`);
  }
  if (error) throw new Error(`Failed to update job: ${error.message}`);
}

/**
 * Count currently running jobs (for concurrency cap).
 */
export async function countRunningJobs(): Promise<number> {
  const { count, error } = await getSupabase()
    .from("headless_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");

  if (error) throw new Error(`Failed to count running jobs: ${error.message}`);
  return count || 0;
}
