"use client";

import { useState, useEffect } from "react";
import { generateWorkflowId, useWorkflowStore } from "@/store/workflowStore";

interface ProjectSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, name: string, directoryPath: string) => void;
  mode: "new" | "settings";
}

export function ProjectSetupModal({
  isOpen,
  onClose,
  onSave,
  mode,
}: ProjectSetupModalProps) {
  const { workflowName, saveDirectoryPath, useExternalImageStorage, setUseExternalImageStorage } = useWorkflowStore();

  const [name, setName] = useState("");
  const [directoryPath, setDirectoryPath] = useState("");
  const [externalStorage, setExternalStorage] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill when opening in settings mode
  useEffect(() => {
    if (isOpen && mode === "settings") {
      setName(workflowName || "");
      setDirectoryPath(saveDirectoryPath || "");
      setExternalStorage(useExternalImageStorage);
    } else if (isOpen && mode === "new") {
      setName("");
      setDirectoryPath("");
      setExternalStorage(true);
    }
  }, [isOpen, mode, workflowName, saveDirectoryPath, useExternalImageStorage]);

  const handleBrowse = async () => {
    setIsBrowsing(true);
    setError(null);

    try {
      const response = await fetch("/api/browse-directory");
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Failed to open directory picker");
        return;
      }

      if (result.cancelled) {
        return;
      }

      if (result.path) {
        setDirectoryPath(result.path);
      }
    } catch (err) {
      setError(
        `Failed to open directory picker: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsBrowsing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Project name is required");
      return;
    }

    if (!directoryPath.trim()) {
      setError("Project directory is required");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate project directory exists
      const response = await fetch(
        `/api/workflow?path=${encodeURIComponent(directoryPath.trim())}`
      );
      const result = await response.json();

      if (!result.exists) {
        setError("Project directory does not exist");
        setIsValidating(false);
        return;
      }

      if (!result.isDirectory) {
        setError("Project path is not a directory");
        setIsValidating(false);
        return;
      }

      const id = mode === "new" ? generateWorkflowId() : useWorkflowStore.getState().workflowId || generateWorkflowId();
      // Update external storage setting
      setUseExternalImageStorage(externalStorage);
      onSave(id, name.trim(), directoryPath.trim());
      setIsValidating(false);
    } catch (err) {
      setError(
        `Failed to validate directory: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isValidating && !isBrowsing) {
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div
        className="bg-neutral-800 rounded-lg p-6 w-[480px] border border-neutral-700 shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <h2 className="text-lg font-semibold text-neutral-100 mb-4">
          {mode === "new" ? "New Project" : "Project Settings"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              autoFocus
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-neutral-100 text-sm focus:outline-none focus:border-neutral-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Project Directory
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder="/Users/username/projects/my-project"
                className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-600 rounded text-neutral-100 text-sm focus:outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={handleBrowse}
                disabled={isBrowsing}
                className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-700 disabled:opacity-50 text-neutral-200 text-sm rounded transition-colors"
              >
                {isBrowsing ? "..." : "Browse"}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Workflow files and images will be saved here. Subfolders for inputs and generations will be auto-created.
            </p>
          </div>

          <div className="pt-2 border-t border-neutral-700">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!externalStorage}
                onChange={(e) => setExternalStorage(!e.target.checked)}
                className="w-4 h-4 rounded border-neutral-600 bg-neutral-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-neutral-800"
              />
              <div>
                <span className="text-sm text-neutral-200">Embed images as base64</span>
                <p className="text-xs text-neutral-500">
                  Embeds all images in workflow, larger workflow files. Can hit memory limits on very large workflows.
                </p>
              </div>
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isValidating || isBrowsing}
            className="px-4 py-2 text-sm bg-white text-neutral-900 rounded hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isValidating ? "Validating..." : mode === "new" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
