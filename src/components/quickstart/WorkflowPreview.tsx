"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Node type to color mapping - using minimap colors from WorkflowCanvas
const NODE_COLORS: Record<string, string> = {
  imageInput: "#22c55e",    // green-500
  annotation: "#eab308",    // yellow-500
  prompt: "#3b82f6",        // blue-500
  nanoBanana: "#f97316",    // orange-500
  generateVideo: "#a855f7", // purple-500
  llmGenerate: "#06b6d4",   // cyan-500
  splitGrid: "#ec4899",     // pink-500
  output: "#6b7280",        // gray-500
};

// Simple preview node component - just a colored rectangle
function PreviewNode({ data }: { data: { nodeType: string } }) {
  const color = NODE_COLORS[data.nodeType] || "#6b7280";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color,
        borderRadius: 4,
        opacity: 0.8,
      }}
    />
  );
}

const previewNodeTypes = {
  preview: PreviewNode,
};

interface WorkflowPreviewProps {
  workflow: {
    nodes: Node[];
    edges: Edge[];
  };
  className?: string;
}

function WorkflowPreviewInner({ workflow, className = "" }: WorkflowPreviewProps) {
  // Transform workflow nodes to preview nodes
  const previewNodes = useMemo(() => {
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: "preview",
      position: node.position,
      data: { nodeType: node.type || "unknown" },
      // Scale down the node sizes for preview
      style: {
        width: ((node.style?.width as number) || 300) * 0.15,
        height: ((node.style?.height as number) || 280) * 0.15,
      },
    }));
  }, [workflow.nodes]);

  // Use the workflow edges as-is (simplified rendering)
  const previewEdges = useMemo(() => {
    return workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // Simple edge style
      style: { stroke: "#525252", strokeWidth: 1 },
      type: "default",
    }));
  }, [workflow.edges]);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={previewNodes}
        edges={previewEdges}
        nodeTypes={previewNodeTypes}
        // Non-interactive mode
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        // Fit the preview to container
        fitView={true}
        fitViewOptions={{ padding: 0.2 }}
        // Hide attribution and controls
        proOptions={{ hideAttribution: true }}
        // Minimal styling
        className="bg-transparent"
        // No default edge options needed
        defaultEdgeOptions={{
          type: "default",
          animated: false,
        }}
      />
    </div>
  );
}

// Wrap with ReactFlowProvider for standalone usage
export function WorkflowPreview(props: WorkflowPreviewProps) {
  return (
    <ReactFlowProvider>
      <WorkflowPreviewInner {...props} />
    </ReactFlowProvider>
  );
}
