import { WorkflowFile } from "@/store/workflowStore";

export type ContentLevel = "empty" | "minimal" | "full";

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // SVG path or emoji
  workflow: Omit<WorkflowFile, "id">;
}

// Sample image URLs from Unsplash for "full" content level
export const SAMPLE_IMAGES = {
  portrait: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  landscape: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  product: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80",
  art: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800&q=80",
  architecture: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
  nature: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80",
  style1: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80",
  style2: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=800&q=80",
};

// Default node dimensions for consistent layouts
const NODE_DIMENSIONS = {
  imageInput: { width: 300, height: 280 },
  annotation: { width: 300, height: 280 },
  prompt: { width: 320, height: 220 },
  nanoBanana: { width: 300, height: 300 },
  llmGenerate: { width: 320, height: 360 },
  output: { width: 320, height: 320 },
};

// Default node data factories
const createImageInputData = (imageUrl: string | null = null, filename: string | null = null) => ({
  image: imageUrl,
  filename: filename,
  dimensions: imageUrl ? { width: 800, height: 600 } : null,
});

const createPromptData = (prompt: string = "") => ({
  prompt,
});

const createNanoBananaData = () => ({
  inputImages: [],
  inputPrompt: null,
  outputImage: null,
  aspectRatio: "1:1" as const,
  resolution: "1K" as const,
  model: "nano-banana-pro" as const,
  useGoogleSearch: false,
  status: "idle" as const,
  error: null,
  imageHistory: [],
  selectedHistoryIndex: 0,
});

const createLLMGenerateData = () => ({
  inputPrompt: null,
  inputImages: [],
  outputText: null,
  provider: "google" as const,
  model: "gemini-3-flash-preview" as const,
  temperature: 0.7,
  maxTokens: 8192,
  status: "idle" as const,
  error: null,
});

const createAnnotationData = () => ({
  sourceImage: null,
  annotations: [],
  outputImage: null,
});

const createOutputData = () => ({
  image: null,
});

// Content for each template at each level
interface TemplateContent {
  prompts: Record<string, string>; // nodeId -> prompt content
  images: Record<string, { url: string; filename: string }>; // nodeId -> image info
}

const TEMPLATE_CONTENT: Record<string, Record<ContentLevel, TemplateContent>> = {
  "simple-edit": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "Describe how you want to transform this image. For example:\n- Change the lighting or mood\n- Add or remove elements\n- Apply a specific style\n- Enhance certain features",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "Transform this portrait into a professional headshot with soft studio lighting, clean neutral background, and subtle color grading. Enhance skin texture naturally while maintaining the subject's authentic appearance. Add a slight vignette for focus.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.portrait, filename: "portrait-sample.jpg" },
      },
    },
  },
  "llm-chain": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "Enter a brief concept here. The LLM will expand this into a detailed image generation prompt.\n\nExample concepts:\n- A cozy cabin in winter\n- Futuristic city at sunset\n- Magical forest scene",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "You are a creative prompt engineer specializing in image generation. Take this concept and expand it into a detailed, evocative prompt:\n\nConcept: A serene mountain lake at golden hour\n\nExpand with specific details about: composition, lighting quality, atmospheric conditions, color palette, textures, mood, and artistic style. Make it vivid and precise for AI image generation.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.landscape, filename: "landscape-reference.jpg" },
      },
    },
  },
  "contact-sheet": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "Describe how to combine elements from all reference images.\n\nConsider:\n- Which image provides the style/mood?\n- Which provides the composition?\n- What elements to take from each?\n- What is the final desired output?",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "Create a new product photograph combining these references:\n- Image 1: Use the clean, minimal composition style\n- Image 2: Apply the warm lighting and color temperature\n- Image 3: Match the professional product photography aesthetic\n\nGenerate a hero shot suitable for e-commerce with soft shadows and neutral background.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.product, filename: "product-1.jpg" },
        "imageInput-2": { url: SAMPLE_IMAGES.architecture, filename: "lighting-ref.jpg" },
        "imageInput-3": { url: SAMPLE_IMAGES.nature, filename: "mood-ref.jpg" },
      },
    },
  },
  "annotate-generate": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "After annotating the image, describe what should be generated:\n\n- What should appear in marked areas?\n- What style should match the original?\n- Any specific details to include?\n\nTip: Use rectangles to mark areas for replacement.",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "Replace the annotated areas with seamlessly integrated content:\n- Match the existing lighting direction and intensity\n- Maintain consistent perspective and scale\n- Blend edges naturally with surrounding areas\n- Preserve the overall style and color palette\n\nThe result should look like a natural, unedited photograph.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.architecture, filename: "architecture-edit.jpg" },
      },
    },
  },
  "prompt-expansion": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "Write a short concept (1-2 sentences) that the LLM will expand into a full image generation prompt.\n\nThe LLM will add:\n- Visual details\n- Lighting descriptions\n- Composition guidance\n- Style references\n- Technical specifications",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "Expand this into a detailed image generation prompt:\n\n\"A cozy reading nook with afternoon light\"\n\nInclude specifics about:\n1. Furniture style and materials\n2. Lighting quality (direction, color temperature, shadows)\n3. Atmospheric elements (dust motes, steam from tea)\n4. Color palette and mood\n5. Camera angle and composition\n6. Artistic style (photorealistic, illustrated, etc.)\n\nOutput only the expanded prompt, ready for image generation.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.art, filename: "style-reference.jpg" },
      },
    },
  },
  "style-transfer": {
    empty: {
      prompts: { "prompt-1": "" },
      images: {},
    },
    minimal: {
      prompts: {
        "prompt-1": "Describe how to transfer the style:\n\n- Image 1 (top): STYLE reference - its colors, textures, artistic style\n- Image 2 (bottom): CONTENT to transform\n\nSpecify which style elements to transfer:\n- Color palette?\n- Brush strokes/texture?\n- Lighting mood?\n- Artistic medium?",
      },
      images: {},
    },
    full: {
      prompts: {
        "prompt-1": "Apply the artistic style from the first image to the content of the second image:\n\nStyle Transfer Instructions:\n- Extract the color palette, brushwork, and artistic technique from Image 1\n- Preserve the composition, subjects, and spatial relationships from Image 2\n- Blend the style naturally without losing content recognizability\n- Match the texture and visual rhythm of the style reference\n\nCreate a harmonious fusion that feels like an original artwork.",
      },
      images: {
        "imageInput-1": { url: SAMPLE_IMAGES.style1, filename: "style-source.jpg" },
        "imageInput-2": { url: SAMPLE_IMAGES.style2, filename: "content-image.jpg" },
      },
    },
  },
};

// Preset templates
export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "simple-edit",
    name: "Simple Edit",
    description: "Basic image editing: input → generate → output",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    workflow: {
      version: 1,
      name: "Simple Edit",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 50, y: 150 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 50, y: 480 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 450, y: 250 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 850, y: 240 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-imageInput-1-nanoBanana-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-prompt-1-nanoBanana-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
  {
    id: "llm-chain",
    name: "LLM Chain",
    description: "Expand a prompt with LLM, then generate",
    icon: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    workflow: {
      version: 1,
      name: "LLM Chain",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 50, y: 100 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 50, y: 430 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "llmGenerate-1",
          type: "llmGenerate",
          position: { x: 450, y: 300 },
          data: createLLMGenerateData(),
          style: NODE_DIMENSIONS.llmGenerate,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 850, y: 200 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 1250, y: 190 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-prompt-1-llmGenerate-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "llmGenerate-1",
          targetHandle: "text",
        },
        {
          id: "edge-imageInput-1-nanoBanana-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-llmGenerate-1-nanoBanana-1-text-text",
          source: "llmGenerate-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
  {
    id: "contact-sheet",
    name: "Contact Sheet",
    description: "Multiple reference images for generation",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z",
    workflow: {
      version: 1,
      name: "Contact Sheet",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 50, y: 50 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "imageInput-2",
          type: "imageInput",
          position: { x: 50, y: 380 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "imageInput-3",
          type: "imageInput",
          position: { x: 50, y: 710 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 450, y: 600 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 450, y: 250 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 850, y: 240 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-imageInput-1-nanoBanana-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-imageInput-2-nanoBanana-1-image-image",
          source: "imageInput-2",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-imageInput-3-nanoBanana-1-image-image",
          source: "imageInput-3",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-prompt-1-nanoBanana-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
  {
    id: "annotate-generate",
    name: "Annotate & Generate",
    description: "Draw annotations on image, then generate",
    icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
    workflow: {
      version: 1,
      name: "Annotate & Generate",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 50, y: 150 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "annotation-1",
          type: "annotation",
          position: { x: 450, y: 150 },
          data: createAnnotationData(),
          style: NODE_DIMENSIONS.annotation,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 450, y: 480 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 850, y: 250 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 1250, y: 240 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-imageInput-1-annotation-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "annotation-1",
          targetHandle: "image",
        },
        {
          id: "edge-annotation-1-nanoBanana-1-image-image",
          source: "annotation-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-prompt-1-nanoBanana-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
  {
    id: "prompt-expansion",
    name: "Prompt Expansion",
    description: "Use LLM to expand a brief prompt",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    workflow: {
      version: 1,
      name: "Prompt Expansion",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 450, y: 50 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 50, y: 150 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "llmGenerate-1",
          type: "llmGenerate",
          position: { x: 50, y: 420 },
          data: createLLMGenerateData(),
          style: NODE_DIMENSIONS.llmGenerate,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 450, y: 380 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 850, y: 370 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-prompt-1-llmGenerate-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "llmGenerate-1",
          targetHandle: "text",
        },
        {
          id: "edge-imageInput-1-nanoBanana-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-llmGenerate-1-nanoBanana-1-text-text",
          source: "llmGenerate-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
  {
    id: "style-transfer",
    name: "Style Transfer",
    description: "Apply style from reference to content image",
    icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01",
    workflow: {
      version: 1,
      name: "Style Transfer",
      edgeStyle: "curved",
      nodes: [
        {
          id: "imageInput-1",
          type: "imageInput",
          position: { x: 50, y: 50 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "imageInput-2",
          type: "imageInput",
          position: { x: 50, y: 380 },
          data: createImageInputData(),
          style: NODE_DIMENSIONS.imageInput,
        },
        {
          id: "prompt-1",
          type: "prompt",
          position: { x: 50, y: 710 },
          data: createPromptData(""),
          style: NODE_DIMENSIONS.prompt,
        },
        {
          id: "nanoBanana-1",
          type: "nanoBanana",
          position: { x: 450, y: 280 },
          data: createNanoBananaData(),
          style: NODE_DIMENSIONS.nanoBanana,
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 850, y: 270 },
          data: createOutputData(),
          style: NODE_DIMENSIONS.output,
        },
      ],
      edges: [
        {
          id: "edge-imageInput-1-nanoBanana-1-image-image",
          source: "imageInput-1",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-imageInput-2-nanoBanana-1-image-image",
          source: "imageInput-2",
          sourceHandle: "image",
          target: "nanoBanana-1",
          targetHandle: "image",
        },
        {
          id: "edge-prompt-1-nanoBanana-1-text-text",
          source: "prompt-1",
          sourceHandle: "text",
          target: "nanoBanana-1",
          targetHandle: "text",
        },
        {
          id: "edge-nanoBanana-1-output-1-image-image",
          source: "nanoBanana-1",
          sourceHandle: "image",
          target: "output-1",
          targetHandle: "image",
        },
      ],
    },
  },
];

/**
 * Get a preset template with content adjusted for the specified level
 */
export function getPresetTemplate(
  templateId: string,
  contentLevel: ContentLevel
): WorkflowFile {
  const template = PRESET_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const content = TEMPLATE_CONTENT[templateId]?.[contentLevel];
  if (!content) {
    throw new Error(`Content not found for ${templateId} at level ${contentLevel}`);
  }

  // Clone the workflow and apply content
  const workflow: WorkflowFile = {
    ...template.workflow,
    id: `wf_${Date.now()}_${templateId}`,
    nodes: template.workflow.nodes.map((node) => {
      const clonedNode = { ...node, data: { ...node.data } };

      // Apply prompt content
      if (node.type === "prompt" && content.prompts[node.id] !== undefined) {
        clonedNode.data = {
          ...clonedNode.data,
          prompt: content.prompts[node.id],
        };
      }

      // Apply image content for "full" level
      if (node.type === "imageInput" && content.images[node.id]) {
        const imageInfo = content.images[node.id];
        clonedNode.data = {
          ...clonedNode.data,
          image: imageInfo.url,
          filename: imageInfo.filename,
          dimensions: { width: 800, height: 600 },
        };
      }

      return clonedNode;
    }),
    edges: template.workflow.edges.map((edge) => ({ ...edge })),
  };

  return workflow;
}

/**
 * Get all preset templates for display
 */
export function getAllPresets(): Pick<PresetTemplate, "id" | "name" | "description" | "icon">[] {
  return PRESET_TEMPLATES.map(({ id, name, description, icon }) => ({
    id,
    name,
    description,
    icon,
  }));
}

/**
 * Export template content for use in API route (for fetching images)
 */
export function getTemplateContent(templateId: string, contentLevel: ContentLevel): TemplateContent | null {
  return TEMPLATE_CONTENT[templateId]?.[contentLevel] || null;
}
