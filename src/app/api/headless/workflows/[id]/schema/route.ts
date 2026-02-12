/**
 * GET /api/headless/workflows/[id]/schema
 *
 * Returns a human-friendly schema showing exactly what parameters
 * the workflow accepts, its node structure, and an example request.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/headless/auth";
import { getWorkflow } from "@/lib/headless/storage";
import { extractVariableNames, groupNodesByLevel } from "@/lib/headless/graph";
import type { WorkflowVariable } from "@/lib/headless/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await validateApiKey(request);
  if (authError) return authError;

  const { id } = await params;
  try {
    const workflow = await getWorkflow(id);
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const { definition, variables } = workflow;

    // Detected {{var}} names from the definition
    const detectedVarNames = extractVariableNames(definition);

    // Merge stored variable metadata with detected variables
    const mergedVariables: Record<string, WorkflowVariable> = {};
    const allVarNames = new Set([
      ...detectedVarNames,
      ...Object.keys(variables || {}),
    ]);
    for (const name of allVarNames) {
      mergedVariables[name] = variables?.[name] || { type: "text" };
    }

    // Also detect imageInput nodes with variableName that aren't template-based
    for (const node of definition.nodes) {
      if (node.type === "imageInput") {
        const varName = (node.data.variableName as string) || node.id;
        if (!mergedVariables[varName]) {
          mergedVariables[varName] = { type: "image" };
        } else if (!mergedVariables[varName].type || mergedVariables[varName].type === "text") {
          // imageInput nodes produce images
          mergedVariables[varName] = { ...mergedVariables[varName], type: "image" };
        }
      }
    }

    // Build node summary list
    const nodes = definition.nodes.map((node) => {
      const entry: Record<string, unknown> = {
        id: node.id,
        type: node.type,
      };
      const varName = node.data.variableName as string | undefined;
      if (varName) entry.variableName = varName;
      if (node.type === "nanoBanana" && node.data.model) {
        entry.model = node.data.model;
      }
      if (node.type === "generateVideo" && node.data.model) {
        entry.model = node.data.model;
      }
      if (node.type === "llmGenerate" && node.data.model) {
        entry.model = node.data.model;
      }
      return entry;
    });

    // Node type counts
    const nodeTypeCounts: Record<string, number> = {};
    for (const node of definition.nodes) {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
    }

    // Execution levels
    const levels = groupNodesByLevel(definition.nodes, definition.edges);

    // Build example request
    const exampleImages: Record<string, string> = {};
    const examplePrompts: Record<string, string> = {};
    for (const [name, variable] of Object.entries(mergedVariables)) {
      if (variable.type === "image") {
        exampleImages[name] = variable.defaultValue || "https://example.com/photo.jpg";
      } else {
        examplePrompts[name] = variable.defaultValue || `Your ${name.replace(/_/g, " ")} here`;
      }
    }

    const exampleRequest: Record<string, unknown> = {
      workflowId: id,
    };
    if (Object.keys(exampleImages).length > 0 || Object.keys(examplePrompts).length > 0) {
      const params: Record<string, unknown> = {};
      if (Object.keys(exampleImages).length > 0) params.images = exampleImages;
      if (Object.keys(examplePrompts).length > 0) params.prompts = examplePrompts;
      exampleRequest.parameters = params;
    }

    return NextResponse.json({
      workflowId: id,
      name: workflow.name,
      variables: mergedVariables,
      nodes,
      nodeTypeCounts,
      executionLevels: levels.length,
      exampleRequest,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
