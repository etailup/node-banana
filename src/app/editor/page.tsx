"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Header } from "@/components/Header";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { FloatingActionBar } from "@/components/FloatingActionBar";
import { AnnotationModal } from "@/components/AnnotationModal";
import { useWorkflowStore } from "@/store/workflowStore";

export default function EditorPage() {
  const initializeAutoSave = useWorkflowStore(
    (state) => state.initializeAutoSave
  );
  const cleanupAutoSave = useWorkflowStore((state) => state.cleanupAutoSave);
  const setIsCloud = useWorkflowStore((state) => state.setIsCloud);

  // Detect cloud mode on mount (before any save/load operations)
  useEffect(() => {
    fetch("/api/env-status")
      .then((r) => r.json())
      .then((d) => {
        if (d.isCloud) setIsCloud(true);
      })
      .catch(() => {});
  }, [setIsCloud]);

  useEffect(() => {
    initializeAutoSave();
    return () => cleanupAutoSave();
  }, [initializeAutoSave, cleanupAutoSave]);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col">
        <Header />
        <WorkflowCanvas />
        <FloatingActionBar />
        <AnnotationModal />
      </div>
    </ReactFlowProvider>
  );
}
