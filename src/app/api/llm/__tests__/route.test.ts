import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Use vi.hoisted to define mocks that work with hoisted vi.mock
const { mockGenerateContent, MockGoogleGenAI, mockGoogleGenAIInstance } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockGoogleGenAIInstance = {
    models: {
      generateContent: mockGenerateContent,
    },
  };
  // Use a class to properly support `new` keyword
  class MockGoogleGenAI {
    apiKey: string;
    models = mockGoogleGenAIInstance.models;

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
  return { mockGenerateContent, MockGoogleGenAI, mockGoogleGenAIInstance };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: MockGoogleGenAI,
}));

// Mock logger to avoid console noise during tests
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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

describe("/api/llm route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockGoogleGenAI.reset();
    // Reset env to original
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("Google provider", () => {
    it("should generate text successfully with Google/Gemini", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        text: "Generated response from Gemini",
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        provider: "google",
        model: "gemini-2.5-flash",
        temperature: 0.7,
        maxTokens: 1024,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.text).toBe("Generated response from Gemini");
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: "Test prompt",
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });
    });

    it("should handle multimodal input (images + prompt)", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        text: "Description of the image",
      });

      const request = createMockPostRequest({
        prompt: "Describe this image",
        images: ["data:image/png;base64,iVBORw0KGgo="],
        provider: "google",
        model: "gemini-2.5-flash",
        temperature: 0.7,
        maxTokens: 1024,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.text).toBe("Description of the image");

      // Verify multimodal content structure
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: "iVBORw0KGgo=",
            },
          },
          { text: "Describe this image" },
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });
    });

    it("should reject missing prompt", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      const request = createMockPostRequest({
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Prompt is required");
    });

    it("should reject missing API key (no env var, no header)", async () => {
      delete process.env.GEMINI_API_KEY;

      const request = createMockPostRequest({
        prompt: "Test prompt",
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("GEMINI_API_KEY not configured");
    });

    it("should use X-Gemini-API-Key header over env var", async () => {
      process.env.GEMINI_API_KEY = "env-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        text: "Response with header key",
      });

      const request = createMockPostRequest(
        {
          prompt: "Test prompt",
          provider: "google",
          model: "gemini-2.5-flash",
        },
        { "X-Gemini-API-Key": "header-gemini-key" }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify GoogleGenAI was called with header key (takes precedence)
      expect(MockGoogleGenAI.lastCalledWith).toEqual({ apiKey: "header-gemini-key" });
    });

    it("should return 429 on rate limit errors", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockRejectedValueOnce(
        new Error("429 Resource exhausted")
      );

      const request = createMockPostRequest({
        prompt: "Test prompt",
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Rate limit reached. Please wait and try again.");
    });

    it("should return 500 on API errors", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockRejectedValueOnce(
        new Error("Internal server error")
      );

      const request = createMockPostRequest({
        prompt: "Test prompt",
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Internal server error");
    });

    it("should handle no text in Google AI response", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        text: null,
      });

      const request = createMockPostRequest({
        prompt: "Test prompt",
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("No text in Google AI response");
    });

    it("should handle image without data URL prefix", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key";

      mockGenerateContent.mockResolvedValueOnce({
        text: "Image description",
      });

      const request = createMockPostRequest({
        prompt: "Describe this",
        images: ["iVBORw0KGgoAAAANSUhEUgAAAAUA"], // raw base64, no prefix
        provider: "google",
        model: "gemini-2.5-flash",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify fallback to PNG mime type
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/png",
              data: "iVBORw0KGgoAAAANSUhEUgAAAAUA",
            },
          },
          { text: "Describe this" },
        ],
        config: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });
    });
  });
});
