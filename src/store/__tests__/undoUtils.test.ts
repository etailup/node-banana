import { describe, it, expect, vi, beforeEach } from "vitest";
import { stripBinaryData, undoStateEquality, partializeForUndo, BINARY_TO_REF, undoWithMedia, redoWithMedia } from "../undoUtils";
import type { WorkflowNode, WorkflowEdge, NodeGroup } from "@/types";
import type { EdgeStyle } from "../workflowStore";

// Mock imageStorage to avoid real file I/O
vi.mock("@/utils/imageStorage", () => ({
  hydrateWorkflowImages: vi.fn(async (workflow: any) => workflow),
}));

describe("undoUtils", () => {
  describe("BINARY_TO_REF", () => {
    it("maps all ref-backed binary fields", () => {
      expect(BINARY_TO_REF).toEqual({
        image: "imageRef",
        outputImage: "outputImageRef",
        sourceImage: "sourceImageRef",
        inputImages: "inputImageRefs",
        outputVideo: "outputVideoRef",
        outputAudio: "outputAudioRef",
      });
    });

    it("does not include fields without refs (imageA, imageB, etc.)", () => {
      const noRefFields = ["imageA", "imageB", "capturedImage", "video", "images", "audioFile", "glbUrl", "output3dUrl"];
      for (const field of noRefFields) {
        expect(BINARY_TO_REF).not.toHaveProperty(field);
      }
    });
  });

  describe("stripBinaryData", () => {
    it("strips binary fields that have corresponding refs", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
            imageRef: "img_001",
            prompt: "test prompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("image");
      expect(stripped[0].data).toHaveProperty("imageRef", "img_001");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
    });

    it("keeps binary fields that have NO refs", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
            // No imageRef → keep image in snapshot
            prompt: "test prompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).toHaveProperty("image", "data:image/png;base64,ABC123");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
    });

    it("strips outputImage and sourceImage when refs exist", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "annotation",
          position: { x: 0, y: 0 },
          data: {
            outputImage: "data:image/png;base64,OUT123",
            outputImageRef: "img_out_001",
            sourceImage: "data:image/png;base64,SRC123",
            sourceImageRef: "img_src_001",
            prompt: "test",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("outputImage");
      expect(stripped[0].data).not.toHaveProperty("sourceImage");
      expect(stripped[0].data).toHaveProperty("outputImageRef", "img_out_001");
      expect(stripped[0].data).toHaveProperty("sourceImageRef", "img_src_001");
    });

    it("strips outputVideo when ref exists", () => {
      const nodes = [
        {
          id: "node-1",
          type: "generateVideo",
          position: { x: 0, y: 0 },
          data: {
            outputVideo: "data:video/mp4;base64,VIDEO123",
            outputVideoRef: "vid_001",
            model: "test-model",
          },
        },
      ] as unknown as WorkflowNode[];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("outputVideo");
      expect(stripped[0].data).toHaveProperty("outputVideoRef", "vid_001");
      expect(stripped[0].data).toHaveProperty("model", "test-model");
    });

    it("strips outputAudio when ref exists", () => {
      const nodes = [
        {
          id: "node-1",
          type: "generateAudio",
          position: { x: 0, y: 0 },
          data: {
            outputAudio: "data:audio/mp3;base64,AUDIO456",
            outputAudioRef: "aud_001",
            fileName: "test.mp3",
          },
        },
      ] as unknown as WorkflowNode[];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("outputAudio");
      expect(stripped[0].data).toHaveProperty("outputAudioRef", "aud_001");
      expect(stripped[0].data).toHaveProperty("fileName", "test.mp3");
    });

    it("keeps fields without refs: imageA, imageB, capturedImage, video, glbUrl, etc.", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageCompare",
          position: { x: 0, y: 0 },
          data: {
            imageA: "data:image/png;base64,IMGA",
            imageB: "data:image/png;base64,IMGB",
            capturedImage: "data:image/png;base64,CAP",
            video: "data:video/mp4;base64,VID",
            glbUrl: "data:model/gltf-binary;base64,GLB",
            output3dUrl: "data:model/gltf-binary;base64,GLB2",
            audioFile: "data:audio/mp3;base64,AUD",
            images: ["data:image/png;base64,IMG1"],
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).toHaveProperty("imageA", "data:image/png;base64,IMGA");
      expect(stripped[0].data).toHaveProperty("imageB", "data:image/png;base64,IMGB");
      expect(stripped[0].data).toHaveProperty("capturedImage", "data:image/png;base64,CAP");
      expect(stripped[0].data).toHaveProperty("video", "data:video/mp4;base64,VID");
      expect(stripped[0].data).toHaveProperty("glbUrl", "data:model/gltf-binary;base64,GLB");
      expect(stripped[0].data).toHaveProperty("output3dUrl", "data:model/gltf-binary;base64,GLB2");
      expect(stripped[0].data).toHaveProperty("audioFile", "data:audio/mp3;base64,AUD");
      expect(stripped[0].data).toHaveProperty("images");
    });

    it("preserves carousel history arrays (metadata only)", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "nanoBanana",
          position: { x: 0, y: 0 },
          data: {
            imageHistory: [
              { timestamp: "2024-01-01", imageRef: "img_001" },
              { timestamp: "2024-01-02", imageRef: "img_002" },
            ],
            videoHistory: [
              { timestamp: "2024-01-01", videoRef: "vid_001" },
            ],
            audioHistory: [
              { timestamp: "2024-01-01", audioRef: "aud_001" },
            ],
            prompt: "test prompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).toHaveProperty("imageHistory");
      expect(stripped[0].data).toHaveProperty("videoHistory");
      expect(stripped[0].data).toHaveProperty("audioHistory");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
    });

    it("preserves ref fields", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
            imageRef: "img_001",
            outputImageRef: "img_002",
            sourceImageRef: "img_003",
            inputImageRefs: ["img_004", "img_005"],
            outputVideoRef: "vid_001",
            outputAudioRef: "aud_001",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("image");
      expect(stripped[0].data).toHaveProperty("imageRef", "img_001");
      expect(stripped[0].data).toHaveProperty("outputImageRef", "img_002");
      expect(stripped[0].data).toHaveProperty("sourceImageRef", "img_003");
      expect(stripped[0].data).toHaveProperty("inputImageRefs");
      expect(stripped[0].data).toHaveProperty("outputVideoRef", "vid_001");
      expect(stripped[0].data).toHaveProperty("outputAudioRef", "aud_001");
    });

    it("preserves non-binary fields", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "nanoBanana",
          position: { x: 100, y: 200 },
          data: {
            image: "data:image/png;base64,ABC123",
            imageRef: "img_001",
            prompt: "test prompt",
            model: "gemini-2.5-flash-image",
            aspectRatio: "1:1",
            selectedModel: { provider: "gemini", modelId: "test" },
            seed: 12345,
            steps: 20,
            guidanceScale: 7.5,
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("image");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
      expect(stripped[0].data).toHaveProperty("model", "gemini-2.5-flash-image");
      expect(stripped[0].data).toHaveProperty("aspectRatio", "1:1");
      expect(stripped[0].data).toHaveProperty("selectedModel");
      expect(stripped[0].data).toHaveProperty("seed", 12345);
      expect(stripped[0].data).toHaveProperty("steps", 20);
      expect(stripped[0].data).toHaveProperty("guidanceScale", 7.5);
    });

    it("does not mutate original nodes", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
            imageRef: "img_001",
            prompt: "test",
          },
        },
      ];

      const originalImage = nodes[0].data.image;
      stripBinaryData(nodes);

      expect(nodes[0].data.image).toBe(originalImage);
      expect(nodes[0].data).toHaveProperty("image", "data:image/png;base64,ABC123");
    });

    it("handles empty nodes array", () => {
      const nodes: WorkflowNode[] = [];
      const stripped = stripBinaryData(nodes);

      expect(stripped).toEqual([]);
    });

    it("handles nodes with no binary data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "prompt",
          position: { x: 0, y: 0 },
          data: {
            prompt: "test prompt",
            variableName: "myPrompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).toEqual({
        prompt: "test prompt",
        variableName: "myPrompt",
      });
    });

    it("handles mixed nodes: some with refs, some without", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,SAVED",
            imageRef: "img_001", // Has ref → strip
          },
        },
        {
          id: "node-2",
          type: "imageInput",
          position: { x: 100, y: 0 },
          data: {
            image: "data:image/png;base64,UNSAVED",
            // No imageRef → keep
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      // Node 1: stripped (has ref)
      expect(stripped[0].data).not.toHaveProperty("image");
      expect(stripped[0].data).toHaveProperty("imageRef", "img_001");

      // Node 2: kept (no ref)
      expect(stripped[1].data).toHaveProperty("image", "data:image/png;base64,UNSAVED");
    });
  });

  describe("undoStateEquality", () => {
    const createMockState = () => ({
      nodes: [
        {
          id: "node-1",
          type: "prompt" as const,
          position: { x: 0, y: 0 },
          data: { prompt: "test" },
        },
      ],
      edges: [
        {
          id: "edge-1",
          source: "node-1",
          target: "node-2",
          data: {},
        },
      ] as WorkflowEdge[],
      edgeStyle: "curved" as EdgeStyle,
      groups: {} as Record<string, NodeGroup>,
    });

    it("returns true when same object refs (no change)", () => {
      const state = createMockState();
      const result = undoStateEquality(state, state);

      expect(result).toBe(true);
    });

    it("returns false when edges array differs", () => {
      const state1 = createMockState();
      const state2 = createMockState();
      state2.edges = [...state2.edges]; // New array ref

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(false);
    });

    it("returns false when edgeStyle differs", () => {
      const state1 = createMockState();
      const state2 = createMockState();
      state2.edgeStyle = "angular";

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(false);
    });

    it("returns false when groups object differs", () => {
      const state1 = createMockState();
      const state2 = createMockState();
      state2.groups = { ...state2.groups }; // New object ref

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(false);
    });

    it("returns false when node count differs", () => {
      const state1 = createMockState();
      const state2 = createMockState();
      state2.nodes = [
        ...state2.nodes,
        {
          id: "node-2",
          type: "prompt" as const,
          position: { x: 100, y: 100 },
          data: { prompt: "test2" },
        },
      ];

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(false);
    });

    it("returns false when any node ref differs (position change)", () => {
      const state1 = createMockState();
      const state2 = createMockState();
      state2.nodes = [
        {
          ...state2.nodes[0],
          position: { x: 100, y: 100 },
        },
      ];

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(false);
    });

    it("returns true when all node refs are identical even with different wrapper array", () => {
      const state1 = createMockState();
      const state2 = {
        ...state1,
        nodes: [...state1.nodes], // New array ref but same node refs
      };

      const result = undoStateEquality(state1, state2);

      expect(result).toBe(true);
    });
  });

  describe("partializeForUndo", () => {
    it("returns object with only nodes, edges, edgeStyle, groups", () => {
      const mockState = {
        nodes: [],
        edges: [],
        edgeStyle: "curved" as EdgeStyle,
        groups: {},
        isRunning: false,
        clipboard: null,
        openModalCount: 0,
        workflowId: "test-id",
        hasUnsavedChanges: true,
      };

      const result = partializeForUndo(mockState);

      expect(Object.keys(result)).toEqual(["nodes", "edges", "edgeStyle", "groups"]);
      expect(result).not.toHaveProperty("isRunning");
      expect(result).not.toHaveProperty("clipboard");
      expect(result).not.toHaveProperty("openModalCount");
      expect(result).not.toHaveProperty("workflowId");
      expect(result).not.toHaveProperty("hasUnsavedChanges");
    });

    it("returned nodes have recoverable binary data stripped", () => {
      const mockState = {
        nodes: [
          {
            id: "node-1",
            type: "imageInput" as const,
            position: { x: 0, y: 0 },
            data: {
              image: "data:image/png;base64,ABC123",
              imageRef: "img_001",
              prompt: "test",
            },
          },
        ],
        edges: [],
        edgeStyle: "curved" as EdgeStyle,
        groups: {},
        isRunning: false,
      };

      const result = partializeForUndo(mockState);

      expect(result.nodes[0].data).not.toHaveProperty("image");
      expect(result.nodes[0].data).toHaveProperty("imageRef", "img_001");
      expect(result.nodes[0].data).toHaveProperty("prompt", "test");
    });

    it("returned nodes keep unrecoverable binary data", () => {
      const mockState = {
        nodes: [
          {
            id: "node-1",
            type: "imageInput" as const,
            position: { x: 0, y: 0 },
            data: {
              image: "data:image/png;base64,UNSAVED",
              // No imageRef
              prompt: "test",
            },
          },
        ],
        edges: [],
        edgeStyle: "curved" as EdgeStyle,
        groups: {},
        isRunning: false,
      };

      const result = partializeForUndo(mockState);

      expect(result.nodes[0].data).toHaveProperty("image", "data:image/png;base64,UNSAVED");
      expect(result.nodes[0].data).toHaveProperty("prompt", "test");
    });
  });

  describe("undoWithMedia", () => {
    it("calls undo when pastStates is non-empty", () => {
      const undo = vi.fn();
      const pause = vi.fn();
      const resume = vi.fn();
      const mockStore = {
        getState: vi.fn(() => ({ nodes: [], edges: [], saveDirectoryPath: null })),
        setState: vi.fn(),
        temporal: {
          getState: vi.fn(() => ({
            pastStates: [{}],
            undo,
            pause,
            resume,
          })),
        },
      } as any;

      undoWithMedia(mockStore);

      expect(undo).toHaveBeenCalled();
      expect(mockStore.setState).toHaveBeenCalledWith({ hasUnsavedChanges: true });
    });

    it("does nothing when pastStates is empty", () => {
      const undo = vi.fn();
      const mockStore = {
        getState: vi.fn(),
        setState: vi.fn(),
        temporal: {
          getState: vi.fn(() => ({
            pastStates: [],
            undo,
          })),
        },
      } as any;

      undoWithMedia(mockStore);

      expect(undo).not.toHaveBeenCalled();
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });

  describe("redoWithMedia", () => {
    it("calls redo when futureStates is non-empty", () => {
      const redo = vi.fn();
      const pause = vi.fn();
      const resume = vi.fn();
      const mockStore = {
        getState: vi.fn(() => ({ nodes: [], edges: [], saveDirectoryPath: null })),
        setState: vi.fn(),
        temporal: {
          getState: vi.fn(() => ({
            futureStates: [{}],
            redo,
            pause,
            resume,
          })),
        },
      } as any;

      redoWithMedia(mockStore);

      expect(redo).toHaveBeenCalled();
      expect(mockStore.setState).toHaveBeenCalledWith({ hasUnsavedChanges: true });
    });

    it("does nothing when futureStates is empty", () => {
      const redo = vi.fn();
      const mockStore = {
        getState: vi.fn(),
        setState: vi.fn(),
        temporal: {
          getState: vi.fn(() => ({
            futureStates: [],
            redo,
          })),
        },
      } as any;

      redoWithMedia(mockStore);

      expect(redo).not.toHaveBeenCalled();
      expect(mockStore.setState).not.toHaveBeenCalled();
    });
  });
});
