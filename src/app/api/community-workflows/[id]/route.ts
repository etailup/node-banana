import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Load a specific community workflow by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const filename = `${id}.json`;
    const filePath = path.join(process.cwd(), "examples", filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Workflow not found: ${id}`,
        },
        { status: 404 }
      );
    }

    // Read and parse workflow file
    const content = await fs.readFile(filePath, "utf-8");
    const workflow = JSON.parse(content);

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error("Error loading community workflow:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load workflow",
      },
      { status: 500 }
    );
  }
}
