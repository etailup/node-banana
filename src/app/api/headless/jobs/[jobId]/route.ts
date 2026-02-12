/**
 * GET /api/headless/jobs/[jobId]
 *
 * Poll job status, progress, and output URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/headless/auth";
import { getJob } from "@/lib/headless/storage";
import type { JobStatusResponse } from "@/lib/headless/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  // Auth
  const { error: authError } = await validateApiKey(request);
  if (authError) return authError;

  const { jobId } = await params;

  const job = await getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const response: JobStatusResponse = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    outputs: job.outputs,
    errors: job.errors,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
  };

  return NextResponse.json(response);
}
