/**
 * GET/POST /api/headless/workflows
 *
 * List all workflow templates or create a new one.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/headless/auth";
import { listWorkflows, createWorkflow } from "@/lib/headless/storage";
import { extractVariableNames } from "@/lib/headless/graph";
import type { WorkflowFileJSON, WorkflowVariableMap } from "@/lib/headless/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error: authError } = await validateApiKey(request);
  if (authError) return authError;

  try {
    const workflows = await listWorkflows();
    return NextResponse.json({ workflows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error: authError } = await validateApiKey(request);
  if (authError) return authError;

  let body: { name: string; definition: WorkflowFileJSON; variables?: WorkflowVariableMap };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || !body.definition) {
    return NextResponse.json(
      { error: "name and definition are required" },
      { status: 400 },
    );
  }

  if (!body.definition.nodes || !body.definition.edges) {
    return NextResponse.json(
      { error: "definition must contain nodes and edges arrays" },
      { status: 400 },
    );
  }

  // Auto-detect variables if not provided
  let variables = body.variables || {};
  if (Object.keys(variables).length === 0) {
    const detectedVars = extractVariableNames(body.definition);
    for (const v of detectedVars) {
      variables[v] = { type: "text" };
    }
  }

  try {
    const workflow = await createWorkflow(body.name, body.definition, variables);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
