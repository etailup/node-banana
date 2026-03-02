"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

interface HeadlessPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DetectedVariable {
  name: string;
  type: "image" | "text";
  source: string; // node id that references it
  description: string;
}

interface PublishResult {
  workflowId: string;
  name: string;
}

const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

export function HeadlessPublishModal({ isOpen, onClose }: HeadlessPublishModalProps) {
  const { nodes, edges, workflowName } = useWorkflowStore();

  const [templateName, setTemplateName] = useState("");
  const [variableDescriptions, setVariableDescriptions] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [apiKey, setApiKey] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTemplateName(workflowName || "");
      setError(null);
      setResult(null);
      setIsPublishing(false);
      setVariableDescriptions({});
    }
  }, [isOpen, workflowName]);

  // Detect variables from current workflow nodes
  const detectedVariables = useMemo((): DetectedVariable[] => {
    const vars: DetectedVariable[] = [];
    const seen = new Set<string>();

    for (const node of (nodes || [])) {
      const data = node.data as Record<string, unknown>;

      // imageInput nodes with variableName or {{var}} in imageUrl
      if (node.type === "imageInput") {
        const varName = (data.variableName as string) || node.id;
        if (!seen.has(varName)) {
          seen.add(varName);
          vars.push({ name: varName, type: "image", source: node.id, description: "" });
        }
        // Also check imageUrl for {{var}} patterns
        if (typeof data.imageUrl === "string") {
          for (const match of data.imageUrl.matchAll(VARIABLE_PATTERN)) {
            if (!seen.has(match[1])) {
              seen.add(match[1]);
              vars.push({ name: match[1], type: "image", source: node.id, description: "" });
            }
          }
        }
      }

      // prompt nodes
      if (node.type === "prompt") {
        const prompt = data.prompt as string | undefined;
        if (prompt) {
          for (const match of prompt.matchAll(VARIABLE_PATTERN)) {
            if (!seen.has(match[1])) {
              seen.add(match[1]);
              vars.push({ name: match[1], type: "text", source: node.id, description: "" });
            }
          }
        }
        // Also add the node itself if it has a variableName
        const varName = data.variableName as string | undefined;
        if (varName && !seen.has(varName)) {
          seen.add(varName);
          vars.push({ name: varName, type: "text", source: node.id, description: "" });
        }
      }

      // promptConstructor template
      if (node.type === "promptConstructor") {
        const template = data.template as string | undefined;
        if (template) {
          for (const match of template.matchAll(VARIABLE_PATTERN)) {
            if (!seen.has(match[1])) {
              seen.add(match[1]);
              vars.push({ name: match[1], type: "text", source: node.id, description: "" });
            }
          }
        }
      }
    }

    return vars;
  }, [nodes]);

  // Convert UI workflow to headless JSON format
  const buildDefinition = useCallback(() => {
    const cleanNodes = nodes.map((node) => {
      // Strip React Flow internals, keep essentials
      const cleanData = { ...node.data } as Record<string, unknown>;
      // Remove runtime output data (will be generated during execution)
      delete cleanData.outputImage;
      delete cleanData.outputVideo;
      delete cleanData.outputText;
      delete cleanData.isGenerating;
      delete cleanData.error;

      return {
        id: node.id,
        type: node.type || "unknown",
        position: node.position,
        data: cleanData,
        ...(node.groupId ? { groupId: node.groupId } : {}),
      };
    });

    const cleanEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
      ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
    }));

    return { nodes: cleanNodes, edges: cleanEdges };
  }, [nodes, edges]);

  // Node type summary for preview
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const node of (nodes || [])) {
      const type = node.type || "unknown";
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [nodes]);

  const handlePublish = async () => {
    if (!templateName.trim()) {
      setError("Template name is required");
      return;
    }
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const definition = buildDefinition();

      // Build variables map with descriptions
      const variables: Record<string, { type: "image" | "text"; description?: string }> = {};
      for (const v of detectedVariables) {
        variables[v.name] = {
          type: v.type,
          ...(variableDescriptions[v.name] ? { description: variableDescriptions[v.name] } : {}),
        };
      }

      const response = await fetch("/api/headless/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          name: templateName.trim(),
          definition,
          variables,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult({
        workflowId: data.workflow.id,
        name: data.workflow.name,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const curlCommand = result
    ? `curl -X POST http://localhost:3000/api/headless/execute \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{
  "workflowId": "${result.workflowId}"${
      detectedVariables.length > 0
        ? `,
  "parameters": {${
            detectedVariables.some((v) => v.type === "image")
              ? `
    "images": {${detectedVariables
                  .filter((v) => v.type === "image")
                  .map((v) => `\n      "${v.name}": "https://example.com/photo.jpg"`)
                  .join(",")}
    }`
              : ""
          }${
            detectedVariables.some((v) => v.type === "text")
              ? `${detectedVariables.some((v) => v.type === "image") ? "," : ""}
    "prompts": {${detectedVariables
                  .filter((v) => v.type === "text")
                  .map((v) => `\n      "${v.name}": "your text here"`)
                  .join(",")}
    }`
              : ""
          }
  }`
        : ""
    }
}'`
    : "";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-100">
            {result ? "Published!" : "Publish to Headless API"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {result ? (
            /* Success state */
            <>
              <div className="p-3 bg-green-900/30 border border-green-700/50 rounded text-sm text-green-300">
                Workflow &quot;{result.name}&quot; published successfully.
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Workflow ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 font-mono select-all">
                    {result.workflowId}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(result.workflowId)}
                    className="px-2 py-2 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800 border border-neutral-700 rounded transition-colors"
                    title="Copy ID"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Example curl command</label>
                <div className="relative">
                  <pre className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 font-mono overflow-x-auto whitespace-pre">
                    {curlCommand}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard.writeText(curlCommand)}
                    className="absolute top-2 right-2 px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-700 rounded transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Form state */
            <>
              {/* Template name */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Template Name</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                  placeholder="e.g. Amazon A+ Generator"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                  placeholder="X-API-Key header value"
                />
              </div>

              {/* Node summary */}
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Workflow Nodes</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(nodeTypeCounts).map(([type, count]) => (
                    <span
                      key={type}
                      className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300"
                    >
                      {type} x{count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Detected variables */}
              {detectedVariables.length > 0 ? (
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    Detected Variables ({detectedVariables.length})
                  </label>
                  <div className="space-y-2">
                    {detectedVariables.map((v) => (
                      <div
                        key={v.name}
                        className="flex items-start gap-2 p-2 bg-neutral-800/50 border border-neutral-700/50 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-violet-400 font-mono">{`{{${v.name}}}`}</code>
                            <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                              v.type === "image"
                                ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                                : "bg-amber-900/50 text-amber-300 border border-amber-700/50"
                            }`}>
                              {v.type}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={variableDescriptions[v.name] || ""}
                            onChange={(e) =>
                              setVariableDescriptions((prev) => ({
                                ...prev,
                                [v.name]: e.target.value,
                              }))
                            }
                            className="mt-1 w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-neutral-300 placeholder-neutral-500 focus:outline-none focus:border-violet-500"
                            placeholder="Description (optional)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neutral-800/50 border border-neutral-700/50 rounded text-xs text-neutral-400">
                  No <code>{`{{variables}}`}</code> detected. The workflow will run with its
                  embedded data. You can add variables by using <code>{`{{name}}`}</code> syntax
                  in prompt or image URL fields.
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-300">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button
              onClick={handlePublish}
              disabled={isPublishing || !templateName.trim() || !apiKey.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
