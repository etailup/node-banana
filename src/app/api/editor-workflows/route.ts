import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  listEditorWorkflows,
  getEditorWorkflow,
  deleteEditorWorkflow,
} from "@/lib/cloud/editorStorage";

// GET: List user's cloud workflows (metadata only)
export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const workflows = await listEditorWorkflows(userId);
    return NextResponse.json({ success: true, workflows });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to list workflows" },
      { status: 500 }
    );
  }
}

// POST: Load a specific workflow by ID (full definition)
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "workflowId is required" },
        { status: 400 }
      );
    }

    const workflow = await getEditorWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json(
        { success: false, error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (workflow.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: "Not authorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow: workflow.definition,
      name: workflow.name,
      updatedAt: workflow.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to load workflow" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a workflow by ID
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { workflowId } = body;

    if (!workflowId) {
      return NextResponse.json(
        { success: false, error: "workflowId is required" },
        { status: 400 }
      );
    }

    await deleteEditorWorkflow(workflowId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
