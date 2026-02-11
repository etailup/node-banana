import { describe, it, expect } from "vitest";
import {
  groupNodesByLevel,
  getConnectedInputs,
  resolveVariables,
  resolveTemplate,
  extractVariableNames,
  chunk,
  type NodeOutputMap,
} from "../graph";
import type { WorkflowNodeJSON, WorkflowEdgeJSON, WorkflowFileJSON } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, type: string, data: Record<string, unknown> = {}): WorkflowNodeJSON {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function makeEdge(
  source: string,
  target: string,
  targetHandle?: string,
): WorkflowEdgeJSON {
  return {
    id: `${source}->${target}`,
    source,
    target,
    targetHandle: targetHandle ?? null,
  };
}

// ---------------------------------------------------------------------------
// groupNodesByLevel
// ---------------------------------------------------------------------------

describe("groupNodesByLevel", () => {
  it("returns single level for independent nodes", () => {
    const nodes = [makeNode("a", "prompt"), makeNode("b", "prompt")];
    const levels = groupNodesByLevel(nodes, []);
    expect(levels).toHaveLength(1);
    expect(levels[0].level).toBe(0);
    expect(levels[0].nodeIds).toContain("a");
    expect(levels[0].nodeIds).toContain("b");
  });

  it("separates linear chain into levels", () => {
    const nodes = [
      makeNode("prompt1", "prompt"),
      makeNode("gen1", "nanoBanana"),
      makeNode("out1", "output"),
    ];
    const edges = [
      makeEdge("prompt1", "gen1", "text"),
      makeEdge("gen1", "out1", "image"),
    ];
    const levels = groupNodesByLevel(nodes, edges);
    expect(levels).toHaveLength(3);
    expect(levels[0].nodeIds).toEqual(["prompt1"]);
    expect(levels[1].nodeIds).toEqual(["gen1"]);
    expect(levels[2].nodeIds).toEqual(["out1"]);
  });

  it("handles diamond dependency", () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const nodes = [
      makeNode("A", "prompt"),
      makeNode("B", "nanoBanana"),
      makeNode("C", "llmGenerate"),
      makeNode("D", "output"),
    ];
    const edges = [
      makeEdge("A", "B"),
      makeEdge("A", "C"),
      makeEdge("B", "D"),
      makeEdge("C", "D"),
    ];
    const levels = groupNodesByLevel(nodes, edges);
    expect(levels).toHaveLength(3);
    expect(levels[0].nodeIds).toEqual(["A"]);
    expect(levels[1].nodeIds.sort()).toEqual(["B", "C"]);
    expect(levels[2].nodeIds).toEqual(["D"]);
  });

  it("returns empty for no nodes", () => {
    expect(groupNodesByLevel([], [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getConnectedInputs
// ---------------------------------------------------------------------------

describe("getConnectedInputs", () => {
  it("collects image from imageInput node via runtime outputs", () => {
    const nodes = [
      makeNode("img1", "imageInput", { image: "base64img" }),
      makeNode("gen1", "nanoBanana"),
    ];
    const edges = [makeEdge("img1", "gen1", "image")];
    const outputs: NodeOutputMap = new Map();
    outputs.set("img1", { image: "base64img" });

    const result = getConnectedInputs("gen1", nodes, edges, outputs);
    expect(result.images).toEqual(["base64img"]);
    expect(result.text).toBeNull();
  });

  it("collects text from prompt node", () => {
    const nodes = [
      makeNode("p1", "prompt", { prompt: "hello world" }),
      makeNode("gen1", "nanoBanana"),
    ];
    const edges = [makeEdge("p1", "gen1", "text")];
    const outputs: NodeOutputMap = new Map();
    outputs.set("p1", { text: "hello world" });

    const result = getConnectedInputs("gen1", nodes, edges, outputs);
    expect(result.text).toBe("hello world");
    expect(result.images).toEqual([]);
  });

  it("collects both image and text", () => {
    const nodes = [
      makeNode("img1", "imageInput"),
      makeNode("p1", "prompt"),
      makeNode("gen1", "nanoBanana"),
    ];
    const edges = [
      makeEdge("img1", "gen1", "image"),
      makeEdge("p1", "gen1", "text"),
    ];
    const outputs: NodeOutputMap = new Map();
    outputs.set("img1", { image: "img_data" });
    outputs.set("p1", { text: "prompt_text" });

    const result = getConnectedInputs("gen1", nodes, edges, outputs);
    expect(result.images).toEqual(["img_data"]);
    expect(result.text).toBe("prompt_text");
  });

  it("falls back to static node data when no runtime output", () => {
    const nodes = [
      makeNode("p1", "prompt", { prompt: "static text" }),
      makeNode("gen1", "nanoBanana"),
    ];
    const edges = [makeEdge("p1", "gen1", "text")];
    const outputs: NodeOutputMap = new Map(); // no runtime data

    const result = getConnectedInputs("gen1", nodes, edges, outputs);
    expect(result.text).toBe("static text");
  });
});

// ---------------------------------------------------------------------------
// resolveTemplate
// ---------------------------------------------------------------------------

describe("resolveTemplate", () => {
  it("replaces variables", () => {
    expect(resolveTemplate("Hello {{name}}", { name: "World" })).toBe("Hello World");
  });

  it("leaves unknown variables as-is", () => {
    expect(resolveTemplate("{{known}} {{unknown}}", { known: "yes" })).toBe("yes {{unknown}}");
  });

  it("handles multiple occurrences", () => {
    expect(resolveTemplate("{{a}} and {{a}}", { a: "X" })).toBe("X and X");
  });

  it("handles empty overrides", () => {
    expect(resolveTemplate("{{a}}", {})).toBe("{{a}}");
  });
});

// ---------------------------------------------------------------------------
// resolveVariables
// ---------------------------------------------------------------------------

describe("resolveVariables", () => {
  it("overrides imageInput with parameter URL", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [makeNode("img1", "imageInput", { imageUrl: "{{cover}}", image: null })],
      edges: [],
    };
    const resolved = resolveVariables(workflow, {
      images: { img1: "https://example.com/cover.jpg" },
    });
    expect(resolved.nodes[0].data.imageUrl).toBe("https://example.com/cover.jpg");
    expect(resolved.nodes[0].data.image).toBeNull();
  });

  it("overrides prompt text", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [makeNode("p1", "prompt", { prompt: "{{desc}}" })],
      edges: [],
    };
    const resolved = resolveVariables(workflow, {
      prompts: { p1: "A beautiful sunset" },
    });
    expect(resolved.nodes[0].data.prompt).toBe("A beautiful sunset");
  });

  it("uses variableName if set", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [
        makeNode("prompt-1", "prompt", {
          prompt: "default text",
          variableName: "product_desc",
        }),
      ],
      edges: [],
    };
    const resolved = resolveVariables(workflow, {
      prompts: { product_desc: "Custom description" },
    });
    expect(resolved.nodes[0].data.prompt).toBe("Custom description");
  });

  it("does not mutate original", () => {
    const original: WorkflowFileJSON = {
      nodes: [makeNode("p1", "prompt", { prompt: "original" })],
      edges: [],
    };
    const resolved = resolveVariables(original, { prompts: { p1: "changed" } });
    expect(original.nodes[0].data.prompt).toBe("original");
    expect(resolved.nodes[0].data.prompt).toBe("changed");
  });

  it("returns workflow unchanged with no parameters", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [makeNode("p1", "prompt", { prompt: "hello" })],
      edges: [],
    };
    const resolved = resolveVariables(workflow);
    expect(resolved.nodes[0].data.prompt).toBe("hello");
  });
});

// ---------------------------------------------------------------------------
// extractVariableNames
// ---------------------------------------------------------------------------

describe("extractVariableNames", () => {
  it("finds variables in imageUrl, prompt, and template fields", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [
        makeNode("n1", "imageInput", { imageUrl: "{{cover_image}}" }),
        makeNode("n2", "prompt", { prompt: "Describe {{product}}" }),
        makeNode("n3", "promptConstructor", { template: "Style: {{style}}" }),
      ],
      edges: [],
    };
    const vars = extractVariableNames(workflow);
    expect(vars.sort()).toEqual(["cover_image", "product", "style"]);
  });

  it("deduplicates repeated variable names", () => {
    const workflow: WorkflowFileJSON = {
      nodes: [
        makeNode("n1", "prompt", { prompt: "{{x}} and {{x}}" }),
      ],
      edges: [],
    };
    expect(extractVariableNames(workflow)).toEqual(["x"]);
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------

describe("chunk", () => {
  it("splits array into chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns single chunk if size >= length", () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it("returns empty for empty array", () => {
    expect(chunk([], 3)).toEqual([]);
  });
});
