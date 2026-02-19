import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as path from "path";
import { logger } from "@/utils/logger";
import { isCloudMode, getAuthenticatedUserId, upsertEditorWorkflow } from "@/lib/cloud/editorStorage";

export const maxDuration = 300; // 5 minute timeout for large workflow files

// POST: Save workflow to file (local) or Supabase (cloud)
export async function POST(request: NextRequest) {
  let directoryPath: string | undefined;
  let filename: string | undefined;
  try {
    const body = await request.json();

    // Cloud mode: save to Supabase
    if (isCloudMode()) {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        );
      }

      const { workflowId, workflow } = body;
      if (!workflowId || !workflow) {
        return NextResponse.json(
          { success: false, error: "Missing workflowId or workflow" },
          { status: 400 }
        );
      }

      const name = workflow.name || "Untitled";
      await upsertEditorWorkflow(workflowId, userId, name, workflow);

      logger.info('file.save', 'Workflow saved to cloud', {
        workflowId,
        nodeCount: workflow?.nodes?.length,
      });

      return NextResponse.json({ success: true, isCloud: true });
    }

    // Local mode: save to filesystem
    directoryPath = body.directoryPath;
    filename = body.filename;
    const workflow = body.workflow;

    logger.info('file.save', 'Workflow save request received', {
      directoryPath,
      filename,
      hasWorkflow: !!workflow,
      nodeCount: workflow?.nodes?.length,
      edgeCount: workflow?.edges?.length,
    });

    if (!directoryPath || !filename || !workflow) {
      logger.warn('file.save', 'Workflow save validation failed: missing fields', {
        hasDirectoryPath: !!directoryPath,
        hasFilename: !!filename,
        hasWorkflow: !!workflow,
      });
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate directory exists
    try {
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        logger.warn('file.error', 'Workflow save failed: path is not a directory', {
          directoryPath,
        });
        return NextResponse.json(
          { success: false, error: "Path is not a directory" },
          { status: 400 }
        );
      }
    } catch (dirError) {
      logger.warn('file.error', 'Workflow save failed: directory does not exist', {
        directoryPath,
      });
      return NextResponse.json(
        { success: false, error: "Directory does not exist" },
        { status: 400 }
      );
    }

    // Auto-create subfolders for inputs and generations
    const inputsFolder = path.join(directoryPath, "inputs");
    const generationsFolder = path.join(directoryPath, "generations");

    try {
      await fs.mkdir(inputsFolder, { recursive: true });
      await fs.mkdir(generationsFolder, { recursive: true });
    } catch (mkdirError) {
      logger.warn('file.save', 'Failed to create subfolders (non-fatal)', {
        inputsFolder,
        generationsFolder,
        error: mkdirError instanceof Error ? mkdirError.message : 'Unknown error',
      });
      // Continue anyway - folders may already exist or be created later
    }

    // Sanitize filename (remove special chars, ensure .json extension)
    const safeName = filename.replace(/[^a-zA-Z0-9-_]/g, "_");
    const filePath = path.join(directoryPath, `${safeName}.json`);

    // Write workflow JSON
    const json = JSON.stringify(workflow, null, 2);
    await fs.writeFile(filePath, json, "utf-8");

    logger.info('file.save', 'Workflow saved successfully', {
      filePath,
      fileSize: json.length,
    });

    return NextResponse.json({
      success: true,
      filePath,
    });
  } catch (error) {
    logger.error('file.error', 'Failed to save workflow', {
      directoryPath,
      filename,
    }, error instanceof Error ? error : undefined);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Save failed",
      },
      { status: 500 }
    );
  }
}

// GET: Validate directory path (local) or return cloud status
export async function GET(request: NextRequest) {
  // Cloud mode: no directory to validate
  if (isCloudMode()) {
    return NextResponse.json({ success: true, isCloud: true });
  }

  const directoryPath = request.nextUrl.searchParams.get("path");

  logger.info('file.load', 'Directory validation request received', {
    directoryPath,
  });

  if (!directoryPath) {
    logger.warn('file.load', 'Directory validation failed: missing path parameter');
    return NextResponse.json(
      { success: false, error: "Path parameter required" },
      { status: 400 }
    );
  }

  try {
    const stats = await fs.stat(directoryPath);
    const isDirectory = stats.isDirectory();
    logger.info('file.load', 'Directory validation successful', {
      directoryPath,
      exists: true,
      isDirectory,
    });
    return NextResponse.json({
      success: true,
      exists: true,
      isDirectory,
    });
  } catch (error) {
    logger.info('file.load', 'Directory does not exist', {
      directoryPath,
    });
    return NextResponse.json({
      success: true,
      exists: false,
      isDirectory: false,
    });
  }
}
