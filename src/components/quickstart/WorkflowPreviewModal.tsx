"use client";

import { useEffect, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import { WorkflowPreview } from "./WorkflowPreview";

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateName: string;
  workflow: { nodes: Node[]; edges: Edge[] };
}

export function WorkflowPreviewModal({
  isOpen,
  onClose,
  templateName,
  workflow,
}: WorkflowPreviewModalProps) {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-700">
          <h3 className="text-base font-semibold text-neutral-100">
            {templateName} — Workflow Preview
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 min-h-0 p-4">
          <div className="w-full h-[60vh] bg-neutral-800/50 rounded-lg border border-neutral-700 overflow-hidden">
            <WorkflowPreview workflow={workflow} />
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-neutral-700">
          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400">
            <span className="font-medium text-neutral-300">Node Types:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#22c55e]" />
              <span>Image Input</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#3b82f6]" />
              <span>Prompt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#f97316]" />
              <span>Generate Image</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#a855f7]" />
              <span>Generate Video</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#06b6d4]" />
              <span>LLM</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-[#6b7280]" />
              <span>Output</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
