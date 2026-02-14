"use client";

import { useCallback, useState, useMemo } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useCommentNavigation } from "@/hooks/useCommentNavigation";
import { useWorkflowStore } from "@/store/workflowStore";
import { OutputNodeData } from "@/types";
import { QualityBadge } from "./QualityBadge";
import { QualityDetailModal } from "@/components/QualityDetailModal";

type OutputNodeType = Node<OutputNodeData, "output">;

export function OutputNode({ id, data, selected }: NodeProps<OutputNodeType>) {
  const nodeData = data;
  const commentNavigation = useCommentNavigation(id);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Determine if content is video
  const isVideo = useMemo(() => {
    if (nodeData.video) return true;
    if (nodeData.contentType === "video") return true;
    if (nodeData.image?.startsWith("data:video/")) return true;
    if (nodeData.image?.includes(".mp4") || nodeData.image?.includes(".webm")) return true;
    return false;
  }, [nodeData.video, nodeData.contentType, nodeData.image]);

  // Get the content source (video or image)
  const contentSrc = useMemo(() => {
    if (nodeData.video) return nodeData.video;
    return nodeData.image;
  }, [nodeData.video, nodeData.image]);

  const handleDownload = useCallback(async () => {
    if (!contentSrc) return;

    const timestamp = Date.now();
    const extension = isVideo ? "mp4" : "png";
    // Use custom filename if provided, otherwise use timestamp
    const filename = nodeData.outputFilename
      ? `${nodeData.outputFilename}.${extension}`
      : `generated-${timestamp}.${extension}`;

    // Handle URL-based content (needs fetch + blob conversion)
    if (contentSrc.startsWith("http://") || contentSrc.startsWith("https://")) {
      try {
        const response = await fetch(contentSrc);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to download:", error);
      }
      return;
    }

    // Handle data URL content (direct download)
    const link = document.createElement("a");
    link.href = contentSrc;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [contentSrc, isVideo, nodeData.outputFilename]);

  const handleReview = useCallback(async () => {
    if (!contentSrc || isVideo || reviewLoading) return;
    setReviewLoading(true);
    try {
      const res = await fetch("/api/agents/quality-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [{ url: contentSrc }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const review = data.reviews?.[0];
        if (review) {
          updateNodeData(id, {
            qualityReview: {
              grade: review.grade,
              scores: review.scores,
              issues: review.issues,
              suggestion: review.suggestion,
              passed: review.passed,
              reviewId: review.id,
            },
          });
        }
      }
    } catch (err) {
      console.error("Quality review failed:", err);
    } finally {
      setReviewLoading(false);
    }
  }, [contentSrc, isVideo, reviewLoading, id, updateNodeData]);

  const qualityReview = nodeData.qualityReview as {
    grade: "A" | "B" | "C" | "F";
    scores: { artifacts: number; text_readability: number; composition: number; prompt_alignment: number; overall: number };
    issues: string[];
    suggestion: string;
    passed: boolean;
    reviewId: string;
  } | undefined;

  return (
    <>
      <BaseNode
        id={id}
        title="Output"
        customTitle={nodeData.customTitle}
        comment={nodeData.comment}
        onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
        onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
        selected={selected}
        className="min-w-[200px]"
        commentNavigation={commentNavigation ?? undefined}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="image"
          data-handletype="image"
        />

        {contentSrc ? (
          <div className="flex-1 flex flex-col min-h-0 gap-2">
            <div
              className="relative cursor-pointer group flex-1 min-h-0"
              onClick={() => setShowLightbox(true)}
            >
              {qualityReview && (
                <div onClick={(e) => e.stopPropagation()}>
                  <QualityBadge
                    grade={qualityReview.grade}
                    score={qualityReview.scores.overall}
                    onClick={() => setShowQualityModal(true)}
                  />
                </div>
              )}
              {isVideo ? (
                <video
                  src={contentSrc}
                  controls
                  loop
                  muted
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={contentSrc}
                  alt="Output"
                  className="w-full h-full object-contain rounded"
                />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded pointer-events-none">
                <span className="text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-1 rounded">
                  View full size
                </span>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handleDownload}
                className="flex-1 py-1.5 bg-white hover:bg-neutral-200 text-neutral-900 text-[10px] font-medium rounded transition-colors"
              >
                Download
              </button>
              {!isVideo && (
                <button
                  onClick={handleReview}
                  disabled={reviewLoading}
                  className="py-1.5 px-2 bg-neutral-600 hover:bg-neutral-500 text-neutral-200 text-[10px] font-medium rounded transition-colors disabled:opacity-50"
                >
                  {reviewLoading ? "..." : "Review"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 min-h-[144px] border border-dashed border-neutral-600 rounded flex items-center justify-center">
            <span className="text-neutral-500 text-[10px]">Waiting for image or video</span>
          </div>
        )}

        {/* Filename input */}
        <div className="mt-2 shrink-0">
          <input
            type="text"
            value={nodeData.outputFilename || ""}
            onChange={(e) => updateNodeData(id, { outputFilename: e.target.value })}
            placeholder="Output filename (optional)"
            className="nodrag nopan w-full px-2 py-1.5 text-[10px] bg-neutral-900/50 border border-neutral-700 rounded text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
          />
        </div>
      </BaseNode>

      {/* Quality Detail Modal */}
      {showQualityModal && qualityReview && (
        <QualityDetailModal
          grade={qualityReview.grade}
          scores={qualityReview.scores}
          issues={qualityReview.issues}
          suggestion={qualityReview.suggestion}
          onClose={() => setShowQualityModal(false)}
          onAcceptAnyway={() => {
            updateNodeData(id, {
              qualityReview: { ...qualityReview, passed: true },
            });
            setShowQualityModal(false);
          }}
        />
      )}

      {/* Lightbox Modal */}
      {showLightbox && contentSrc && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8"
          onClick={() => setShowLightbox(false)}
        >
          <div className="relative max-w-full max-h-full">
            {isVideo ? (
              <video
                src={contentSrc}
                controls
                loop
                autoPlay
                playsInline
                className="max-w-full max-h-[90vh] object-contain rounded"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={contentSrc}
                alt="Output full size"
                className="max-w-full max-h-[90vh] object-contain rounded"
              />
            )}
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded text-white text-sm transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
