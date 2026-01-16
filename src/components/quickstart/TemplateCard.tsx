"use client";

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
  isLoading: boolean;
  onClick: () => void;
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
  isLoading,
  onClick,
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
            : "bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 hover:bg-neutral-800/70"
        }
        ${disabled && !isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      {/* Icon */}
      <div
        className={`
          w-12 h-12 rounded-lg flex items-center justify-center mb-3
          ${
            isLoading
              ? "bg-blue-500/30"
              : "bg-neutral-700/50 group-hover:bg-neutral-700"
          }
        `}
      >
        {isLoading ? (
          <svg
            className="w-5 h-5 text-blue-400 animate-spin"
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
        ) : (
          <svg
            className="w-6 h-6 text-neutral-400 group-hover:text-neutral-300 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={template.icon} />
          </svg>
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
