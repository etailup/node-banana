/**
 * GET/PUT/DELETE /api/headless/workflows/[id]
 *
 * CRUD for a specific workflow template.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/headless/auth";
import {
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "@/lib/headless/storage";
import type { WorkflowFileJSON, WorkflowVariableMap } from "@/lib/headless/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const workflow = await getWorkflow(id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }
    return NextResponse.json({ workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  let body: { name?: string; definition?: WorkflowFileJSON; variables?: WorkflowVariableMap };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Verify exists
  const existing = await getWorkflow(id);
  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  try {
    const workflow = await updateWorkflow(id, body);
    return NextResponse.json({ workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;

  const existing = await getWorkflow(id);
  if (!existing) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  try {
    await deleteWorkflow(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
