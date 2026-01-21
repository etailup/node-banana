import { NextResponse } from "next/server";

// Default to node-banana-pro hosted service
const COMMUNITY_WORKFLOWS_API_URL =
  process.env.COMMUNITY_WORKFLOWS_API_URL ||
  "https://nodebananapro.com/api/public/community-workflows";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Load a specific community workflow by ID from the remote API
 *
 * This proxies to the node-banana-pro hosted service which stores
 * community workflows in R2 storage. The API returns a presigned URL
 * which we use to fetch the actual workflow data directly from R2.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

  try {
    const { id } = await params;

    // Step 1: Get the presigned URL from the API
    const urlResponse = await fetch(
      `${COMMUNITY_WORKFLOWS_API_URL}/${encodeURIComponent(id)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
        // Short cache since presigned URLs expire
        next: { revalidate: 60 },
      }
    );

    if (!urlResponse.ok) {
      clearTimeout(timeoutId);
      if (urlResponse.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error: `Workflow not found: ${id}`,
          },
          { status: 404 }
        );
      }

      console.error(
        "Error fetching community workflow URL:",
        urlResponse.status,
        urlResponse.statusText
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load workflow",
        },
        { status: urlResponse.status }
      );
    }

    const urlData = await urlResponse.json();

    if (!urlData.success || !urlData.downloadUrl) {
      clearTimeout(timeoutId);
      return NextResponse.json(
        {
          success: false,
          error: urlData.error || "Failed to get download URL",
        },
        { status: 500 }
      );
    }

    // Step 2: Fetch the actual workflow from the presigned R2 URL
    const workflowResponse = await fetch(urlData.downloadUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!workflowResponse.ok) {
      console.error(
        "Error fetching workflow from R2:",
        workflowResponse.status,
        workflowResponse.statusText
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to download workflow",
        },
        { status: 500 }
      );
    }

    const workflow = await workflowResponse.json();

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      console.error("Community workflow fetch timed out");
      return NextResponse.json(
        {
          success: false,
          error: "Request timed out",
        },
        { status: 504 }
      );
    }

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
