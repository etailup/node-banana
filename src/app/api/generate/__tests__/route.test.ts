import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted to define mocks that work with hoisted vi.mock
const { mockGenerateContent, MockGoogleGenAI } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();

  // Use a class to properly support `new` keyword
  class MockGoogleGenAI {
    apiKey: string;
    models = {
      generateContent: mockGenerateContent,
    };

    constructor(config: { apiKey: string }) {
      this.apiKey = config.apiKey;
      // Track calls to constructor
      MockGoogleGenAI.lastCalledWith = config;
      MockGoogleGenAI.callCount++;
    }

    static lastCalledWith: { apiKey: string } | null = null;
    static callCount = 0;
    static reset() {
      MockGoogleGenAI.lastCalledWith = null;
      MockGoogleGenAI.callCount = 0;
    }
  }

  return { mockGenerateContent, MockGoogleGenAI };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: MockGoogleGenAI,
}));

// Mock image upload utilities (not used in Gemini path but imported)
vi.mock("@/lib/images", () => ({
  uploadImageForUrl: vi.fn(),
  shouldUseImageUrl: vi.fn().mockReturnValue(false),
  deleteImages: vi.fn(),
}));

import { POST } from "../route";

// Store original env
const originalEnv = { ...process.env };

// Helper to create mock NextRequest for POST
function createMockPostRequest(
  body: unknown,
  headers?: Record<string, string>
): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

// Helper to create successful Gemini response with image
function createGeminiImageResponse(mimeType = "image/png", data = "base64ImageData") {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType,
                data,
              },
            },
          ],
        },
      },
    ],
  };
}

// Helper to create Gemini response with text only (no image)
function createGeminiTextResponse(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              text,
            },
          ],
        },
      },
    ],
  };
}

describe("/api/generate route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockGoogleGenAI.reset();
    // Reset env to original
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Gemini provider", () => {
    it("should generate image successfully with prompt only", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "A beautiful sunset over mountains",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image).toBe("data:image/png;base64,base64ImageData");
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3-pro-image-preview",
          contents: [
            {
              role: "user",
              parts: [{ text: "A beautiful sunset over mountains" }],
            },
          ],
        })
      );
    });

    it("should generate image with prompt and input images", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Transform this image to oil painting style",
        images: ["data:image/png;base64,inputImageData"],
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Transform this image to oil painting style" },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: "inputImageData",
                  },
                },
              ],
            },
          ],
        })
      );
    });

    it("should apply aspect ratio config", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "A landscape photo",
        model: "nano-banana-pro",
        aspectRatio: "16:9",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { aspectRatio: "16:9" },
          }),
        })
      );
    });

    it("should apply resolution config for nano-banana-pro model", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "High resolution image",
        model: "nano-banana-pro",
        resolution: "1024x1024",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: { imageSize: "1024x1024" },
          }),
        })
      );
    });

    it("should apply both aspectRatio and resolution for nano-banana-pro", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "High resolution landscape",
        model: "nano-banana-pro",
        aspectRatio: "16:9",
        resolution: "1024x1024",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            imageConfig: {
              aspectRatio: "16:9",
              imageSize: "1024x1024",
            },
          }),
        })
      );
    });

    it("should apply Google Search tool for nano-banana-pro", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Latest technology trends",
        model: "nano-banana-pro",
        useGoogleSearch: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [{ googleSearch: {} }],
        })
      );
    });

    it("should NOT apply Google Search tool for nano-banana model", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana",
        useGoogleSearch: true,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // For nano-banana, tools should not be included even if useGoogleSearch is true
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.not.objectContaining({
          tools: expect.anything(),
        })
      );
    });

    it("should use nano-banana-pro as default model", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Test prompt without model specified",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-3-pro-image-preview", // nano-banana-pro maps to this
        })
      );
    });

    it("should use X-Gemini-API-Key header over env var", async () => {
      process.env.GEMINI_API_KEY = "env-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest(
        {
          prompt: "Test prompt",
          model: "nano-banana-pro",
        },
        { "X-Gemini-API-Key": "header-gemini-key" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Verify GoogleGenAI was called with header key (takes precedence)
      expect(MockGoogleGenAI.lastCalledWith).toEqual({
        apiKey: "header-gemini-key",
      });
    });

    it("should return 500 when API key missing", async () => {
      delete process.env.GEMINI_API_KEY;

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("API key not configured");
    });

    it("should return 429 on rate limit errors", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockRejectedValueOnce(new Error("429 Resource exhausted"));

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Rate limit reached. Please wait and try again.");
    });

    it("should handle no candidates in response", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        candidates: [],
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No response from AI model");
    });

    it("should handle null candidates in response", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        candidates: null,
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No response from AI model");
    });

    it("should handle text-only response (no image)", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(
        createGeminiTextResponse("I cannot generate that image because...")
      );

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Model returned text instead of image");
      expect(data.error).toContain("I cannot generate that image");
    });

    it("should handle response with no parts", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: null,
            },
          },
        ],
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No content in response");
    });

    it("should handle response with empty parts array", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [],
            },
          },
        ],
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No image in response");
    });

    it("should handle generic API errors", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockRejectedValueOnce(new Error("Internal server error"));

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should use correct model mapping for nano-banana", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gemini-2.5-flash-image",
        })
      );
    });

    it("should extract MIME type from data URL correctly", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Edit this JPEG",
        images: ["data:image/jpeg;base64,jpegImageData"],
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Edit this JPEG" },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: "jpegImageData",
                  },
                },
              ],
            },
          ],
        })
      );
    });

    it("should fall back to image/png for raw base64", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Edit this image",
        images: ["rawBase64DataWithoutPrefix"],
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Edit this image" },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: "rawBase64DataWithoutPrefix",
                  },
                },
              ],
            },
          ],
        })
      );
    });
  });

  describe("Input validation", () => {
    it("should reject request with no prompt, images, or dynamic inputs", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const request = createMockPostRequest({
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Prompt or image input is required");
    });

    it("should accept request with only images (image-to-image)", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        images: ["data:image/png;base64,imageOnlyData"],
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Gemini is called with undefined prompt (which becomes empty text)
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should accept request with dynamicInputs containing prompt", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        dynamicInputs: {
          prompt: "Dynamic prompt text",
        },
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept request with dynamicInputs containing image frames", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        dynamicInputs: {
          first_frame: "data:image/png;base64,firstFrameData",
          last_frame: "data:image/png;base64,lastFrameData",
        },
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should accept request with dynamicInputs containing image_url", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        dynamicInputs: {
          image_url: "data:image/png;base64,imageUrlData",
        },
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle multiple images in request", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Combine these images",
        images: [
          "data:image/png;base64,image1Data",
          "data:image/jpeg;base64,image2Data",
          "data:image/webp;base64,image3Data",
        ],
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: [
            {
              role: "user",
              parts: [
                { text: "Combine these images" },
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: "image1Data",
                  },
                },
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: "image2Data",
                  },
                },
                {
                  inlineData: {
                    mimeType: "image/webp",
                    data: "image3Data",
                  },
                },
              ],
            },
          ],
        })
      );
    });
  });

  describe("Provider routing", () => {
    it("should route to Gemini when no selectedModel provided", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Gemini mock should have been called
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should route to Gemini when selectedModel.provider is gemini", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(createGeminiImageResponse());

      const request = createMockPostRequest({
        prompt: "Test prompt",
        model: "nano-banana-pro",
        selectedModel: {
          provider: "gemini",
          modelId: "gemini-3-pro-image-preview",
          displayName: "Gemini 3 Pro",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should return 401 for Replicate provider without API key", async () => {
      delete process.env.REPLICATE_API_KEY;

      const request = createMockPostRequest({
        prompt: "Test prompt",
        selectedModel: {
          provider: "replicate",
          modelId: "stability-ai/sdxl",
          displayName: "SDXL",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Replicate API key not configured");
    });
  });

  describe("Response handling", () => {
    it("should return proper response structure with image", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce(
        createGeminiImageResponse("image/jpeg", "jpegOutputData")
      );

      const request = createMockPostRequest({
        prompt: "Generate a photo",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        image: "data:image/jpeg;base64,jpegOutputData",
      });
    });

    it("should handle response with default MIME type", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      // Response with no mimeType specified
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    data: "noMimeTypeData",
                    // mimeType intentionally omitted
                  },
                },
              ],
            },
          },
        ],
      });

      const request = createMockPostRequest({
        prompt: "Generate image",
        model: "nano-banana-pro",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should default to image/png
      expect(data.image).toBe("data:image/png;base64,noMimeTypeData");
    });
  });
});
