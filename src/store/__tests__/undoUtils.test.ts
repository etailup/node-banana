import { describe, it, expect } from "vitest";
import { stripBinaryData, undoStateEquality, partializeForUndo, BINARY_DATA_KEYS } from "../undoUtils";
import type { WorkflowNode, WorkflowEdge, NodeGroup } from "@/types";
import type { EdgeStyle } from "../workflowStore";

describe("undoUtils", () => {
  describe("stripBinaryData", () => {
    it("strips image fields from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
            outputImage: "data:image/png;base64,DEF456",
            sourceImage: "data:image/png;base64,GHI789",
            imageRef: "img_001",
            prompt: "test prompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("image");
      expect(stripped[0].data).not.toHaveProperty("outputImage");
      expect(stripped[0].data).not.toHaveProperty("sourceImage");
      expect(stripped[0].data).toHaveProperty("imageRef", "img_001");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
    });

    it("strips video fields from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "generateVideo",
          position: { x: 0, y: 0 },
          data: {
            outputVideo: "data:video/mp4;base64,VIDEO123",
            video: "data:video/mp4;base64,VIDEO456",
            outputVideoRef: "vid_001",
            model: "test-model",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("outputVideo");
      expect(stripped[0].data).not.toHaveProperty("video");
      expect(stripped[0].data).toHaveProperty("outputVideoRef", "vid_001");
      expect(stripped[0].data).toHaveProperty("model", "test-model");
    });

    it("strips audio fields from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "audioInput",
          position: { x: 0, y: 0 },
          data: {
            audioFile: "data:audio/mp3;base64,AUDIO123",
            outputAudio: "data:audio/mp3;base64,AUDIO456",
            audio: "data:audio/mp3;base64,AUDIO789",
            fileName: "test.mp3",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("audioFile");
      expect(stripped[0].data).not.toHaveProperty("outputAudio");
      expect(stripped[0].data).not.toHaveProperty("audio");
      expect(stripped[0].data).toHaveProperty("fileName", "test.mp3");
    });

    it("strips 3D model fields from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "glbViewer",
          position: { x: 0, y: 0 },
          data: {
            glbUrl: "data:model/gltf-binary;base64,GLB123",
            output3dUrl: "data:model/gltf-binary;base64,GLB456",
            modelName: "test.glb",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("glbUrl");
      expect(stripped[0].data).not.toHaveProperty("output3dUrl");
      expect(stripped[0].data).toHaveProperty("modelName", "test.glb");
    });

    it("strips history arrays from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "nanoBanana",
          position: { x: 0, y: 0 },
          data: {
            imageHistory: [
              { timestamp: "2024-01-01", image: "data:image/png;base64,IMG1" },
              { timestamp: "2024-01-02", image: "data:image/png;base64,IMG2" },
            ],
            videoHistory: [
              { timestamp: "2024-01-01", video: "data:video/mp4;base64,VID1" },
            ],
            audioHistory: [
              { timestamp: "2024-01-01", audio: "data:audio/mp3;base64,AUD1" },
            ],
            prompt: "test prompt",
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("imageHistory");
      expect(stripped[0].data).not.toHaveProperty("videoHistory");
      expect(stripped[0].data).not.toHaveProperty("audioHistory");
      expect(stripped[0].data).toHaveProperty("prompt", "test prompt");
    });

    it("strips thumbnail fields from node data", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "videoStitch",
          position: { x: 0, y: 0 },
          data: {
            thumbnail: "data:image/png;base64,THUMB123",
            thumbnails: ["data:image/png;base64,THUMB1", "data:image/png;base64,THUMB2"],
            clips: [],
          },
        },
      ];

      const stripped = stripBinaryData(nodes);

      expect(stripped[0].data).not.toHaveProperty("thumbnail");
      expect(stripped[0].data).not.toHaveProperty("thumbnails");
      expect(stripped[0].data).toHaveProperty("clips");
    });

    it("preserves non-binary fields", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "nanoBanana",
          position: { x: 100, y: 200 },
          data: {
            image: "data:image/png;base64,ABC123",
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

    it("does not mutate original nodes", () => {
      const nodes: WorkflowNode[] = [
        {
          id: "node-1",
          type: "imageInput",
          position: { x: 0, y: 0 },
          data: {
            image: "data:image/png;base64,ABC123",
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

    it("returned nodes have binary data stripped", () => {
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
  });

  describe("BINARY_DATA_KEYS", () => {
    it("contains all expected binary field names", () => {
      const expectedKeys = [
        // Image fields
        "image",
        "outputImage",
        "sourceImage",
        "inputImages",
        "images",
        "imageA",
        "imageB",
        "capturedImage",
        // Video fields
        "outputVideo",
        "video",
        // Audio fields
        "audioFile",
        "outputAudio",
        "audio",
        // 3D fields
        "glbUrl",
        "output3dUrl",
        // History arrays
        "imageHistory",
        "videoHistory",
        "audioHistory",
        "globalImageHistory",
        // Thumbnail fields
        "thumbnail",
        "thumbnails",
      ];

      expectedKeys.forEach((key) => {
        expect(BINARY_DATA_KEYS.has(key)).toBe(true);
      });
    });
  });
});
