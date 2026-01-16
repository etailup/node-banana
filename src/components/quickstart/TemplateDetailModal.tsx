"use client";

import { useEffect, useCallback } from "react";
import { TemplateCategory } from "@/types/quickstart";

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseWorkflow: () => void;
  isLoading: boolean;
  template: {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    tags: string[];
  };
  nodeCount: number;
  previewImage?: string;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  product: "Product",
  style: "Style",
  composition: "Composition",
  community: "Community",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  product: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  style: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  composition: "bg-green-500/20 text-green-300 border-green-500/30",
  community: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function TemplateDetailModal({
  isOpen,
  onClose,
  onUseWorkflow,
  isLoading,
  template,
  nodeCount,
  previewImage,
}: TemplateDetailModalProps) {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading]
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={isLoading ? undefined : onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <div
        className="relative bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-neutral-700">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-neutral-100">
                {template.name}
              </h2>
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
                  ${CATEGORY_COLORS[template.category]}
                `}
              >
                {CATEGORY_LABELS[template.category]}
              </span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {template.description}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50"
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

        {/* Workflow Screenshot */}
        <div className="flex-1 min-h-0 p-6 bg-neutral-950/50">
          <div className="w-full h-[50vh] bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center">
            {previewImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewImage}
                alt={`${template.name} workflow screenshot`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-neutral-500 text-sm">No preview available</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-700 bg-neutral-900">
          <div className="flex items-center justify-between">
            {/* Metadata */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
                <span>{nodeCount} nodes</span>
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-xs bg-neutral-800 text-neutral-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onUseWorkflow}
                disabled={isLoading}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading...
                  </>
                ) : (
                  <>
                    Use this workflow
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
