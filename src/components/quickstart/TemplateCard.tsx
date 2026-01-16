"use client";

import { Node, Edge } from "@xyflow/react";
import { TemplateCategory } from "@/types/quickstart";

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: TemplateCategory;
    tags: string[];
  };
  nodeCount: number;
  previewImage?: string;
  workflow?: { nodes: Node[]; edges: Edge[] };
  isLoading: boolean;
  onClick: () => void;
  onPreviewClick?: () => void;
  disabled: boolean;
}

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  product: "Product",
  style: "Style",
  composition: "Composition",
  community: "Community",
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  product: "bg-blue-500/20 text-blue-300",
  style: "bg-purple-500/20 text-purple-300",
  composition: "bg-green-500/20 text-green-300",
  community: "bg-amber-500/20 text-amber-300",
};

export function TemplateCard({
  template,
  nodeCount,
  previewImage,
  workflow,
  isLoading,
  onClick,
  onPreviewClick,
  disabled,
}: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group w-full text-left rounded-lg border p-4 transition-all
        ${
          isLoading
            ? "bg-blue-600/20 border-blue-500/50"
            : "bg-neutral-900/50 border-neutral-700 hover:border-neutral-500 hover:bg-neutral-900/70"
        }
        ${disabled && !isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {/* Thumbnail Area */}
      <div
        className={`
          w-full aspect-[4/3] rounded-lg mb-3 overflow-hidden relative
          ${
            isLoading
              ? "bg-blue-500/20"
              : "bg-neutral-800 group-hover:bg-neutral-700/80"
          }
        `}
      >
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-blue-400 animate-spin"
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
          </div>
        ) : previewImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewImage}
            alt={`${template.name} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-neutral-600 group-hover:text-neutral-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={template.icon} />
            </svg>
          </div>
        )}

        {/* Workflow Preview Button - show in top right when workflow is available */}
        {workflow && !isLoading && (
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onPreviewClick?.();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onPreviewClick?.();
              }
            }}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-600 hover:border-neutral-500 transition-colors cursor-pointer"
            title="Preview workflow"
          >
            {/* Node graph icon */}
            <svg
              className="w-4 h-4 text-neutral-400 hover:text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Name */}
      <h3 className="text-sm font-medium text-neutral-200 mb-1">
        {template.name}
      </h3>

      {/* Description */}
      <p className="text-xs text-neutral-400 line-clamp-2 mb-3">
        {template.description}
      </p>

      {/* Metadata row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Node count badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-700/50 text-neutral-400">
          {nodeCount} nodes
        </span>

        {/* Category badge */}
        <span
          className={`
            inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
            ${CATEGORY_COLORS[template.category]}
          `}
        >
          {CATEGORY_LABELS[template.category]}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-700/30 text-neutral-500"
          >
            {tag}
          </span>
        ))}
      </div>
    </button>
  );
}
