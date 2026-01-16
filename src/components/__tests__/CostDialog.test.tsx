import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CostDialog } from "@/components/CostDialog";
import { PredictedCostResult } from "@/utils/costCalculator";

// Mock the workflow store
const mockResetIncurredCost = vi.fn();
const mockUseWorkflowStore = vi.fn();

vi.mock("@/store/workflowStore", () => ({
  useWorkflowStore: (selector?: (state: unknown) => unknown) => {
    if (selector) {
      return mockUseWorkflowStore(selector);
    }
    return mockUseWorkflowStore((s: unknown) => s);
  },
}));

// Mock confirm
const mockConfirm = vi.fn(() => true);

describe("CostDialog", () => {
  beforeAll(() => {
    vi.stubGlobal("confirm", mockConfirm);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true); // Reset default return value
    mockUseWorkflowStore.mockImplementation((selector) => {
      const state = {
        resetIncurredCost: mockResetIncurredCost,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a PredictedCostResult with multi-provider support
   */
  const createPredictedCost = (overrides: Partial<PredictedCostResult> = {}): PredictedCostResult => ({
    totalCost: 0.463,
    breakdown: [
      {
        provider: "gemini",
        modelId: "nano-banana",
        modelName: "Nano Banana",
        count: 5,
        unitCost: 0.039,
        unit: "image",
        subtotal: 0.195,
      },
      {
        provider: "gemini",
        modelId: "nano-banana-pro",
        modelName: "Nano Banana Pro",
        count: 2,
        unitCost: 0.134,
        unit: "image",
        subtotal: 0.268,
      },
    ],
    nodeCount: 7,
    unknownPricingCount: 0,
    ...overrides,
  });

  /**
   * Helper to create a multi-provider PredictedCostResult with fal.ai and Replicate
   */
  const createMultiProviderCost = (): PredictedCostResult => ({
    totalCost: 0.55,  // Only known costs: Gemini + fal.ai
    breakdown: [
      {
        provider: "gemini",
        modelId: "nano-banana",
        modelName: "Nano Banana",
        count: 3,
        unitCost: 0.039,
        unit: "image",
        subtotal: 0.117,
      },
      {
        provider: "fal",
        modelId: "fal-ai/fast-sdxl",
        modelName: "Fast SDXL",
        count: 2,
        unitCost: 0.10,
        unit: "image",
        subtotal: 0.20,
      },
      {
        provider: "fal",
        modelId: "fal-ai/minimax-video",
        modelName: "MiniMax Video",
        count: 1,
        unitCost: 0.233,
        unit: "5 seconds",
        subtotal: 0.233,
      },
      {
        provider: "replicate",
        modelId: "stability-ai/sdxl",
        modelName: "Stability SDXL",
        count: 2,
        unitCost: null,  // Replicate has no pricing API
        unit: "image",
        subtotal: null,
      },
    ],
    nodeCount: 8,
    unknownPricingCount: 2,
  });

  describe("Basic Rendering", () => {
    it("should render dialog with title", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Workflow Costs")).toBeInTheDocument();
    });

    it("should render close button", () => {
      const { container } = render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Close button has an SVG with X icon
      const closeButton = container.querySelector("button");
      expect(closeButton).toBeInTheDocument();
    });

    it("should render Predicted Cost section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Predicted Cost")).toBeInTheDocument();
    });

    it("should render Incurred Cost section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Incurred Cost")).toBeInTheDocument();
    });

    it("should render Pricing Reference section", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Pricing Reference:")).toBeInTheDocument();
    });
  });

  describe("Cost Display", () => {
    it("should display formatted predicted cost", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({ totalCost: 1.25 })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("$1.25")).toBeInTheDocument();
    });

    it("should display formatted incurred cost", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={2.50}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("$2.50")).toBeInTheDocument();
    });

    it("should display $0.00 for zero costs", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({ totalCost: 0, breakdown: [], nodeCount: 0 })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Should have two $0.00 - one for predicted, one for incurred
      const zeroValues = screen.getAllByText("$0.00");
      expect(zeroValues.length).toBe(2);
    });
  });

  describe("Provider Grouping", () => {
    it("should render Known Costs section with provider grouping", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Should show Known Costs header
      expect(screen.getByText("Known Costs")).toBeInTheDocument();

      // Should show provider names
      expect(screen.getByText("Gemini")).toBeInTheDocument();
      expect(screen.getByText("fal.ai")).toBeInTheDocument();
    });

    it("should render provider icons", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Provider icons show single letter (G for Gemini, f for fal.ai, R for Replicate)
      expect(screen.getByText("G")).toBeInTheDocument();
      expect(screen.getByText("f")).toBeInTheDocument();
      expect(screen.getByText("R")).toBeInTheDocument();
    });

    it("should show models grouped under their provider", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for model entries
      expect(screen.getByText(/3x Nano Banana/)).toBeInTheDocument();
      expect(screen.getByText(/2x Fast SDXL/)).toBeInTheDocument();
      expect(screen.getByText(/1x MiniMax Video/)).toBeInTheDocument();
    });

    it("should show Known Costs total separately from Predicted Cost total", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Both Predicted Cost and Known Costs show the same total ($0.55)
      // since all known models sum to 0.55
      const costElements = screen.getAllByText("$0.55");
      expect(costElements.length).toBe(2); // One for Predicted, one for Known Costs
    });
  });

  describe("Pricing Unavailable Section", () => {
    it("should render Pricing Unavailable section for Replicate models", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Pricing Unavailable")).toBeInTheDocument();
      expect(screen.getByText("Replicate")).toBeInTheDocument();
      expect(screen.getByText(/2x Stability SDXL/)).toBeInTheDocument();
    });

    it("should hide Pricing Unavailable section when no Replicate models", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}  // Only Gemini models
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText("Pricing Unavailable")).not.toBeInTheDocument();
    });

    it("should show Replicate help text with link", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Replicate pricing varies by hardware and runtime/)).toBeInTheDocument();

      // Check for replicate.com links - there are multiple (in Pricing Unavailable section and Pricing Reference)
      const replicateLinks = screen.getAllByRole("link", { name: /replicate\.com/i });
      expect(replicateLinks.length).toBeGreaterThanOrEqual(1);
      expect(replicateLinks[0]).toHaveAttribute("href", "https://replicate.com/pricing");
    });
  });

  describe("Billing Units", () => {
    it("should show billing units (per image, per video, per second)", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for formatted billing units - use getAllByText since "per image" appears multiple times
      const perImageElements = screen.getAllByText(/per image/);
      expect(perImageElements.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/per 5 seconds/)).toBeInTheDocument();
    });

    it("should format custom billing units correctly", () => {
      const costWithCustomUnit = createPredictedCost({
        breakdown: [
          {
            provider: "fal",
            modelId: "fal-ai/some-model",
            modelName: "Some Model",
            count: 1,
            unitCost: 0.05,
            unit: "second",
            subtotal: 0.05,
          },
        ],
      });

      render(
        <CostDialog
          predictedCost={costWithCustomUnit}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/per second/)).toBeInTheDocument();
    });
  });

  describe("Cost Breakdown", () => {
    it("should render per-model cost rows with counts", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for model count and name
      expect(screen.getByText(/5x Nano Banana/)).toBeInTheDocument();
      expect(screen.getByText(/2x Nano Banana Pro/)).toBeInTheDocument();
    });

    it("should display subtotal for each model type", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Check for subtotals
      expect(screen.getByText("$0.20")).toBeInTheDocument(); // 0.195 rounded
      expect(screen.getByText("$0.27")).toBeInTheDocument(); // 0.268 rounded
    });

    it("should show dash for models without pricing", () => {
      render(
        <CostDialog
          predictedCost={createMultiProviderCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      // Replicate models should show dash instead of cost
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no generation nodes exist", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost({
            totalCost: 0,
            breakdown: [],
            nodeCount: 0
          })}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("No generation nodes in workflow")).toBeInTheDocument();
    });

    it("should not show Known Costs section when no Gemini/fal.ai models", () => {
      render(
        <CostDialog
          predictedCost={{
            totalCost: 0,
            breakdown: [
              {
                provider: "replicate",
                modelId: "some-model",
                modelName: "Some Model",
                count: 1,
                unitCost: null,
                unit: "image",
                subtotal: null,
              },
            ],
            nodeCount: 1,
            unknownPricingCount: 1,
          }}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText("Known Costs")).not.toBeInTheDocument();
    });
  });

  describe("Reset Costs Button", () => {
    it("should not show reset button when incurredCost is 0", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.queryByText("Reset to $0.00")).not.toBeInTheDocument();
    });

    it("should show reset button when incurredCost is greater than 0", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Reset to $0.00")).toBeInTheDocument();
    });

    it("should show confirmation dialog when reset is clicked", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockConfirm).toHaveBeenCalledWith("Reset incurred cost to $0.00?");
    });

    it("should call resetIncurredCost when confirmed", () => {
      mockConfirm.mockReturnValue(true);

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockResetIncurredCost).toHaveBeenCalled();
    });

    it("should not call resetIncurredCost when cancelled", () => {
      mockConfirm.mockReturnValue(false);

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={1.00}
          onClose={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText("Reset to $0.00"));

      expect(mockResetIncurredCost).not.toHaveBeenCalled();
    });
  });

  describe("Close Behavior", () => {
    it("should call onClose when close button is clicked", () => {
      const onClose = vi.fn();

      const { container } = render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={onClose}
        />
      );

      // Click the close button (first button in the dialog)
      const closeButton = container.querySelector("button");
      fireEvent.click(closeButton!);

      expect(onClose).toHaveBeenCalled();
    });

    it("should call onClose when Escape key is pressed", () => {
      const onClose = vi.fn();

      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={onClose}
        />
      );

      fireEvent.keyDown(window, { key: "Escape" });

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("Pricing Reference", () => {
    it("should display Gemini pricing range", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/Gemini: \$0\.039-\$0\.24\/image/)).toBeInTheDocument();
    });

    it("should display fal.ai pricing source", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/fal\.ai: Pricing fetched from fal\.ai API/)).toBeInTheDocument();
    });

    it("should display Replicate pricing note with link", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText(/no API pricing available/)).toBeInTheDocument();
    });

    it("should display currency note", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("All prices in USD")).toBeInTheDocument();
    });
  });

  describe("Incurred Cost Section", () => {
    it("should display description for incurred costs", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Actual API spend from successful generations")).toBeInTheDocument();
    });

    it("should display tracking note for Gemini and fal.ai", () => {
      render(
        <CostDialog
          predictedCost={createPredictedCost()}
          incurredCost={0}
          onClose={vi.fn()}
        />
      );

      expect(screen.getByText("Tracks Gemini and fal.ai only")).toBeInTheDocument();
    });
  });
});
