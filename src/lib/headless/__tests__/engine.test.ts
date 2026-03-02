import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";
import type { WorkflowFileJSON } from "../types";

// ---------------------------------------------------------------------------
// Mock storage (Supabase + R2)
// ---------------------------------------------------------------------------

const mockCreateJob = vi.fn();
const mockUpdateJobStatus = vi.fn();
const mockUploadToR2 = vi.fn();

vi.mock("../storage", () => ({
  createJob: (...args: unknown[]) => mockCreateJob(...args),
  updateJobStatus: (...args: unknown[]) => mockUpdateJobStatus(...args),
  uploadToR2: (...args: unknown[]) => mockUploadToR2(...args),
  countRunningJobs: vi.fn().mockResolvedValue(0),
  getWorkflow: vi.fn(),
}));

// Mock callback delivery
const mockDeliverCallback = vi.fn();
vi.mock("../callback", () => ({
  deliverCallback: (...args: unknown[]) => mockDeliverCallback(...args),
}));

// Mock global fetch for internal API calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocks
import { executeWorkflow } from "../engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSimpleWorkflow(): WorkflowFileJSON {
  return {
    nodes: [
      {
        id: "prompt-1",
        type: "prompt",
        position: { x: 0, y: 0 },
        data: { prompt: "A cat on a beach" },
      },
      {
        id: "img-1",
        type: "imageInput",
        position: { x: 0, y: 100 },
        data: { image: "data:image/png;base64,fakedata" },
      },
      {
        id: "gen-1",
        type: "nanoBanana",
        position: { x: 200, y: 0 },
        data: {
          model: "nano-banana",
          aspectRatio: "1:1",
          resolution: "1024x1024",
          useGoogleSearch: false,
        },
      },
      {
        id: "output-1",
        type: "output",
        position: { x: 400, y: 0 },
        data: {},
      },
    ],
    edges: [
      { id: "e1", source: "prompt-1", target: "gen-1", targetHandle: "text" },
      { id: "e2", source: "img-1", target: "gen-1", targetHandle: "image" },
      { id: "e3", source: "gen-1", target: "output-1", targetHandle: "image" },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeWorkflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: createJob returns a valid job
    mockCreateJob.mockResolvedValue({
      id: "job-123",
      status: "pending",
      parameters: {},
      progress: { completed: 0, total: 0 },
      outputs: {},
      errors: [],
    });

    // Default: updateJobStatus succeeds
    mockUpdateJobStatus.mockResolvedValue(undefined);

    // Default: upload returns a CDN URL
    mockUploadToR2.mockImplementation(
      async (jobId: string, nodeId: string) =>
        `https://cdn.example.com/outputs/${jobId}/${nodeId}.png`,
    );
  });

  it("creates a job and returns jobId immediately", async () => {
    // Mock the generate API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        image: "data:image/png;base64,generated_output",
      }),
    });

    const jobId = await executeWorkflow(
      makeSimpleWorkflow(),
      undefined,
      undefined,
      undefined,
      {
        baseUrl: "http://localhost:3000",
        uploadFn: mockUploadToR2,
      },
    );

    expect(jobId).toBe("job-123");
    expect(mockCreateJob).toHaveBeenCalledOnce();
    expect(mockCreateJob).toHaveBeenCalledWith(null, {}, null);
  });

  it("passes parameters when creating job", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, image: "data:image/png;base64,xxx" }),
    });

    const params = {
      images: { "img-1": "https://example.com/cat.jpg" },
      prompts: { "prompt-1": "A dog in space" },
    };

    await executeWorkflow(
      makeSimpleWorkflow(),
      params,
      "https://callback.example.com/results",
      "wf-abc",
      {
        baseUrl: "http://localhost:3000",
        uploadFn: mockUploadToR2,
      },
    );

    expect(mockCreateJob).toHaveBeenCalledWith(
      "wf-abc",
      params,
      "https://callback.example.com/results",
    );
  });

  it("updates job status to running", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, image: "data:image/png;base64,xxx" }),
    });

    await executeWorkflow(makeSimpleWorkflow(), undefined, undefined, undefined, {
      baseUrl: "http://localhost:3000",
      uploadFn: mockUploadToR2,
    });

    // Wait a tick for background execution to start
    await new Promise((r) => setTimeout(r, 50));

    // Should have been called with "running" status
    const runningCall = mockUpdateJobStatus.mock.calls.find(
      (call) => call[1] === "running",
    );
    expect(runningCall).toBeTruthy();
  });

  it("resolves variables before execution", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, image: "data:image/png;base64,xxx" }),
    });

    const workflow = makeSimpleWorkflow();
    workflow.nodes[0].data.prompt = "{{description}}";

    await executeWorkflow(
      workflow,
      { prompts: { "prompt-1": "A custom description" } },
      undefined,
      undefined,
      {
        baseUrl: "http://localhost:3000",
        uploadFn: mockUploadToR2,
      },
    );

    // Wait for background execution
    await new Promise((r) => setTimeout(r, 200));

    // The generate call should have received the resolved prompt
    const generateCall = mockFetch.mock.calls.find(
      (call) => typeof call[0] === "string" && call[0].includes("/api/generate"),
    );
    expect(generateCall).toBeDefined();
    const body = JSON.parse(generateCall![1].body);
    expect(body.prompt).toBe("A custom description");
  });

  it("splitGrid splits image and populates child imageInput nodes", async () => {
    // Create a 600x400 red image as base64 test input
    const testImage = await sharp({
      create: { width: 600, height: 400, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toBuffer();
    const testImageBase64 = `data:image/png;base64,${testImage.toString("base64")}`;

    // Mock generate API for the child nanoBanana nodes
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, image: "data:image/png;base64,generated" }),
    });

    // Workflow: imageInput → splitGrid → 2x (child imageInput → prompt → nanoBanana → output)
    const workflow: WorkflowFileJSON = {
      nodes: [
        { id: "img-src", type: "imageInput", position: { x: 0, y: 0 }, data: { image: testImageBase64 } },
        {
          id: "split-1", type: "splitGrid", position: { x: 200, y: 0 },
          data: {
            gridRows: 1, gridCols: 2, isConfigured: true,
            childNodeIds: [
              { imageInput: "child-img-0", prompt: "child-prompt-0", nanoBanana: "child-gen-0" },
              { imageInput: "child-img-1", prompt: "child-prompt-1", nanoBanana: "child-gen-1" },
            ],
          },
        },
        { id: "child-img-0", type: "imageInput", position: { x: 400, y: 0 }, data: {} },
        { id: "child-img-1", type: "imageInput", position: { x: 400, y: 200 }, data: {} },
        { id: "child-prompt-0", type: "prompt", position: { x: 400, y: 100 }, data: { prompt: "Upscale slide" } },
        { id: "child-prompt-1", type: "prompt", position: { x: 400, y: 300 }, data: { prompt: "Upscale slide" } },
        { id: "child-gen-0", type: "nanoBanana", position: { x: 600, y: 0 }, data: { model: "nano-banana" } },
        { id: "child-gen-1", type: "nanoBanana", position: { x: 600, y: 200 }, data: { model: "nano-banana" } },
        { id: "out-0", type: "output", position: { x: 800, y: 0 }, data: {} },
        { id: "out-1", type: "output", position: { x: 800, y: 200 }, data: {} },
      ],
      edges: [
        { id: "e1", source: "img-src", target: "split-1", targetHandle: "image" },
        // splitGrid → child imageInputs (reference edges)
        { id: "e3", source: "split-1", target: "child-img-0", targetHandle: "reference" },
        { id: "e4", source: "split-1", target: "child-img-1", targetHandle: "reference" },
        // child imageInput → child nanoBanana
        { id: "e5", source: "child-img-0", target: "child-gen-0", targetHandle: "image" },
        { id: "e6", source: "child-img-1", target: "child-gen-1", targetHandle: "image" },
        // child prompt → child nanoBanana
        { id: "e7", source: "child-prompt-0", target: "child-gen-0", targetHandle: "text" },
        { id: "e8", source: "child-prompt-1", target: "child-gen-1", targetHandle: "text" },
        // child nanoBanana → outputs
        { id: "e9", source: "child-gen-0", target: "out-0", targetHandle: "image" },
        { id: "e10", source: "child-gen-1", target: "out-1", targetHandle: "image" },
      ],
    };

    const jobId = await executeWorkflow(workflow, undefined, undefined, undefined, {
      baseUrl: "http://localhost:3000",
      uploadFn: mockUploadToR2,
    });

    expect(jobId).toBe("job-123");

    // Wait for background execution to complete
    await new Promise((r) => setTimeout(r, 500));

    // The generate API should have been called for both child nanoBanana nodes
    const generateCalls = mockFetch.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("/api/generate"),
    );
    expect(generateCalls.length).toBe(2);

    // Both calls should include image data from the split cells
    for (const call of generateCalls) {
      const body = JSON.parse(call[1].body);
      expect(body.images.length).toBeGreaterThan(0);
      expect(body.images[0]).toMatch(/^data:image\/png;base64,/);
      expect(body.prompt).toBe("Upscale slide");
    }

    // Upload should have been called for both output nodes
    expect(mockUploadToR2).toHaveBeenCalledTimes(2);
    expect(mockUploadToR2).toHaveBeenCalledWith("job-123", "out-0", expect.any(String));
    expect(mockUploadToR2).toHaveBeenCalledWith("job-123", "out-1", expect.any(String));
  });
});
