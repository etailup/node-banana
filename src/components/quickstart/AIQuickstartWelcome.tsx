"use client";

import { useState, useCallback } from "react";
import { WorkflowFile } from "@/store/workflowStore";
import { QuickstartView } from "@/types/quickstart";
import { QuickstartInitialView } from "./QuickstartInitialView";
import { QuickstartTemplatesView } from "./QuickstartTemplatesView";
import { QuickstartVibeView } from "./QuickstartVibeView";

interface AIQuickstartWelcomeProps {
  onWorkflowGenerated: (workflow: WorkflowFile) => void;
  onClose: () => void;
}

export function AIQuickstartWelcome({
  onWorkflowGenerated,
  onClose,
}: AIQuickstartWelcomeProps) {
  const [currentView, setCurrentView] = useState<QuickstartView>("initial");

  const handleSelectBlankCanvas = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelectTemplates = useCallback(() => {
    setCurrentView("templates");
  }, []);

  const handleSelectVibe = useCallback(() => {
    setCurrentView("vibe");
  }, []);

  const handleBack = useCallback(() => {
    setCurrentView("initial");
  }, []);

  const handleWorkflowSelected = useCallback(
    (workflow: WorkflowFile) => {
      onWorkflowGenerated(workflow);
    },
    [onWorkflowGenerated]
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-neutral-800 rounded-xl border border-neutral-700 shadow-2xl overflow-hidden">
        {currentView === "initial" && (
          <QuickstartInitialView
            onSelectBlankCanvas={handleSelectBlankCanvas}
            onSelectTemplates={handleSelectTemplates}
            onSelectVibe={handleSelectVibe}
          />
        )}
        {currentView === "templates" && (
          <QuickstartTemplatesView
            onBack={handleBack}
            onWorkflowSelected={handleWorkflowSelected}
          />
        )}
        {currentView === "vibe" && (
          <QuickstartVibeView
            onBack={handleBack}
            onWorkflowGenerated={handleWorkflowSelected}
          />
        )}
      </div>
    </div>
  );
}
