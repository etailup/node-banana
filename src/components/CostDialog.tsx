"use client";

import { useEffect } from "react";
import { useWorkflowStore } from "@/store/workflowStore";
import { PredictedCostResult, CostBreakdownItem, formatCost } from "@/utils/costCalculator";
import { ProviderType } from "@/types/providers";

interface CostDialogProps {
  predictedCost: PredictedCostResult;
  incurredCost: number;
  onClose: () => void;
}

/**
 * Provider icon component - colored dot with provider indicator
 */
function ProviderIcon({ provider }: { provider: ProviderType }) {
  const colors: Record<ProviderType, { bg: string; text: string }> = {
    gemini: { bg: "bg-green-500/20", text: "text-green-300" },
    fal: { bg: "bg-purple-500/20", text: "text-purple-300" },
    replicate: { bg: "bg-blue-500/20", text: "text-blue-300" },
    openai: { bg: "bg-teal-500/20", text: "text-teal-300" },
  };

  const labels: Record<ProviderType, string> = {
    gemini: "G",
    fal: "f",
    replicate: "R",
    openai: "O",
  };

  const color = colors[provider] || colors.gemini;

  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${color.bg} ${color.text} text-xs font-medium`}>
      {labels[provider]}
    </span>
  );
}

/**
 * Format unit for display (e.g., "image" -> "per image", "second" -> "per second")
 */
function formatUnit(unit: string): string {
  if (unit === "image") return "per image";
  if (unit === "video") return "per video";
  if (unit === "second") return "per second";
  return `per ${unit}`;
}

/**
 * Get display name for provider
 */
function getProviderDisplayName(provider: ProviderType): string {
  const names: Record<ProviderType, string> = {
    gemini: "Gemini",
    fal: "fal.ai",
    replicate: "Replicate",
    openai: "OpenAI",
  };
  return names[provider] || provider;
}

/**
 * Group breakdown items by provider
 */
function groupByProvider(breakdown: CostBreakdownItem[]): Map<ProviderType, CostBreakdownItem[]> {
  const grouped = new Map<ProviderType, CostBreakdownItem[]>();
  breakdown.forEach((item) => {
    const existing = grouped.get(item.provider);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.provider, [item]);
    }
  });
  return grouped;
}

export function CostDialog({ predictedCost, incurredCost, onClose }: CostDialogProps) {
  const resetIncurredCost = useWorkflowStore((state) => state.resetIncurredCost);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleReset = () => {
    if (confirm("Reset incurred cost to $0.00?")) {
      resetIncurredCost();
    }
  };

  // Separate breakdown items into known pricing (Gemini, fal.ai) and unknown pricing (Replicate)
  const groupedBreakdown = groupByProvider(predictedCost.breakdown);

  // Known pricing providers: Gemini and fal.ai
  const knownPricingProviders: ProviderType[] = ["gemini", "fal"];
  const unknownPricingProviders: ProviderType[] = ["replicate"];

  const knownCostItems: CostBreakdownItem[] = [];
  const unknownCostItems: CostBreakdownItem[] = [];

  knownPricingProviders.forEach((provider) => {
    const items = groupedBreakdown.get(provider);
    if (items) {
      knownCostItems.push(...items);
    }
  });

  unknownPricingProviders.forEach((provider) => {
    const items = groupedBreakdown.get(provider);
    if (items) {
      unknownCostItems.push(...items);
    }
  });

  // Calculate known costs total (only from Gemini and fal.ai)
  const knownCostsTotal = knownCostItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

  // Group known items by provider for display
  const knownByProvider = new Map<ProviderType, CostBreakdownItem[]>();
  knownCostItems.forEach((item) => {
    const existing = knownByProvider.get(item.provider);
    if (existing) {
      existing.push(item);
    } else {
      knownByProvider.set(item.provider, [item]);
    }
  });

  // Group unknown items by provider for display
  const unknownByProvider = new Map<ProviderType, CostBreakdownItem[]>();
  unknownCostItems.forEach((item) => {
    const existing = unknownByProvider.get(item.provider);
    if (existing) {
      existing.push(item);
    } else {
      unknownByProvider.set(item.provider, [item]);
    }
  });

  const hasKnownCosts = knownCostItems.length > 0;
  const hasUnknownCosts = unknownCostItems.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 rounded-lg p-6 w-[400px] border border-neutral-700 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-100">
            Workflow Costs
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Predicted Cost Section - Split into Known and Unknown */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">Predicted Cost</span>
              <span className="text-lg font-semibold text-neutral-100">
                {formatCost(predictedCost.totalCost)}
              </span>
            </div>

            {/* Known Costs Section */}
            {hasKnownCosts && (
              <div className="mt-3 pt-3 border-t border-neutral-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-neutral-300">Known Costs</span>
                  <span className="text-sm font-medium text-green-400">
                    {formatCost(knownCostsTotal)}
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from(knownByProvider.entries()).map(([provider, items]) => (
                    <div key={provider} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <ProviderIcon provider={provider} />
                        <span>{getProviderDisplayName(provider)}</span>
                      </div>
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs pl-7">
                          <span className="text-neutral-500">
                            {item.count}x {item.modelName}
                            <span className="text-neutral-600 ml-1">({formatUnit(item.unit)})</span>
                          </span>
                          <span className="text-neutral-400">
                            {item.subtotal !== null ? formatCost(item.subtotal) : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pricing Unavailable Section */}
            {hasUnknownCosts && (
              <div className="mt-3 pt-3 border-t border-neutral-700">
                <div className="flex items-center mb-2">
                  <span className="text-xs font-medium text-neutral-500">Pricing Unavailable</span>
                </div>

                <div className="space-y-3">
                  {Array.from(unknownByProvider.entries()).map(([provider, items]) => (
                    <div key={provider} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <ProviderIcon provider={provider} />
                        <span>{getProviderDisplayName(provider)}</span>
                      </div>
                      {items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs pl-7">
                          <span className="text-neutral-600">
                            {item.count}x {item.modelName}
                          </span>
                          <span className="text-neutral-600">—</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-neutral-600 mt-2 pl-7">
                  Replicate pricing varies by hardware and runtime. Check{" "}
                  <a
                    href="https://replicate.com/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    replicate.com
                  </a>{" "}
                  for details.
                </p>
              </div>
            )}

            {predictedCost.nodeCount === 0 && (
              <p className="text-xs text-neutral-500 mt-2">
                No generation nodes in workflow
              </p>
            )}
          </div>

          {/* Incurred Cost Section */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">Incurred Cost</span>
              <span className="text-lg font-semibold text-green-400">
                {formatCost(incurredCost)}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Actual API spend from successful generations
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              Tracks Gemini and fal.ai only
            </p>

            {incurredCost > 0 && (
              <button
                onClick={handleReset}
                className="mt-3 text-xs text-neutral-400 hover:text-red-400 transition-colors"
              >
                Reset to $0.00
              </button>
            )}
          </div>

          {/* Pricing Reference */}
          <div className="text-xs text-neutral-500 space-y-1">
            <p className="font-medium text-neutral-400">Pricing Reference:</p>
            <p>Gemini: $0.039-$0.24/image (varies by model and resolution)</p>
            <p>fal.ai: Pricing fetched from fal.ai API</p>
            <p>
              Replicate: Check{" "}
              <a
                href="https://replicate.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
              >
                replicate.com
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>{" "}
              (no API pricing available)
            </p>
            <p className="text-neutral-600 mt-2">All prices in USD</p>
          </div>
        </div>
      </div>
    </div>
  );
}
