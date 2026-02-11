import { describe, it, expect, vi, beforeEach } from "vitest";
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
});
