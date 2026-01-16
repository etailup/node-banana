"use client";

import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  useReactFlow,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Node type to color mapping - using similar colors from WorkflowCanvas minimap
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
function PreviewNode({ data }: NodeProps) {
  const nodeType = data?.nodeType as string || "unknown";
  const color = NODE_COLORS[nodeType] || "#6b7280";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: color,
        borderRadius: 6,
        border: "2px solid rgba(255,255,255,0.2)",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
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

// Inner component that can use useReactFlow
function WorkflowPreviewInner({ workflow, className = "" }: WorkflowPreviewProps) {
  const { fitView } = useReactFlow();

  // Transform workflow nodes to preview nodes - keep original sizes/positions for better layout
  const previewNodes = useMemo(() => {
    return workflow.nodes.map((node) => ({
      id: node.id,
      type: "preview",
      position: node.position,
      data: { nodeType: node.type || "unknown" },
      // Use scaled-down versions of the original dimensions
      style: {
        width: ((node.style?.width as number) || 300) * 0.3,
        height: ((node.style?.height as number) || 280) * 0.3,
      },
    }));
  }, [workflow.nodes]);

  // Use the workflow edges with simplified styling
  const previewEdges = useMemo(() => {
    return workflow.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      style: { stroke: "#525252", strokeWidth: 2 },
      type: "default",
    }));
  }, [workflow.edges]);

  // Fit view when nodes load
  const onInit = useCallback(() => {
    // Small delay to ensure nodes are rendered
    setTimeout(() => {
      fitView({ padding: 0.3, duration: 0 });
    }, 50);
  }, [fitView]);

  return (
    <div className={`w-full h-full ${className}`}>
      <ReactFlow
        nodes={previewNodes}
        edges={previewEdges}
        nodeTypes={previewNodeTypes}
        onInit={onInit}
        // Non-interactive mode
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={true}
        // Fit the preview to container
        fitView={true}
        fitViewOptions={{ padding: 0.3 }}
        // Hide attribution
        proOptions={{ hideAttribution: true }}
        // Styling
        className="bg-transparent"
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
