"use client";

interface QuickstartInitialViewProps {
  onSelectBlankCanvas: () => void;
  onSelectTemplates: () => void;
  onSelectVibe: () => void;
}

export function QuickstartInitialView({
  onSelectBlankCanvas,
  onSelectTemplates,
  onSelectVibe,
}: QuickstartInitialViewProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-neutral-100 mb-6">
        Get started
      </h1>

      {/* Grid layout: 2 columns */}
      <div className="grid grid-cols-3 gap-4 min-h-[320px]">
        {/* Blank Canvas - Primary (takes 2 columns, full height) */}
        <button
          onClick={onSelectBlankCanvas}
          className="col-span-2 row-span-2 flex flex-col items-center justify-center gap-4 p-8
            rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-600/10 to-blue-500/5
            hover:border-blue-500/50 hover:from-blue-600/15 hover:to-blue-500/10
            transition-all duration-200 group"
        >
          {/* Empty canvas icon */}
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-medium text-neutral-100 mb-1">
              Blank canvas
            </h2>
            <p className="text-sm text-neutral-400">
              Start from scratch with an empty workflow
            </p>
          </div>
        </button>

        {/* Workflow Templates - Top right */}
        <button
          onClick={onSelectTemplates}
          className="flex flex-col items-center justify-center gap-3 p-4
            rounded-xl border border-neutral-700 bg-neutral-800/50
            hover:border-neutral-600 hover:bg-neutral-800
            transition-all duration-200 group"
        >
          {/* Grid icon */}
          <div className="w-12 h-12 rounded-lg bg-neutral-700/50 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
            <svg
              className="w-6 h-6 text-neutral-300"
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
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-neutral-200">
              Workflow templates
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Browse pre-built workflows
            </p>
          </div>
        </button>

        {/* Vibe Workflow - Bottom right */}
        <button
          onClick={onSelectVibe}
          className="flex flex-col items-center justify-center gap-3 p-4
            rounded-xl border border-neutral-700 bg-neutral-800/50
            hover:border-neutral-600 hover:bg-neutral-800
            transition-all duration-200 group"
        >
          {/* Sparkles icon */}
          <div className="w-12 h-12 rounded-lg bg-neutral-700/50 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
            <svg
              className="w-6 h-6 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-sm font-medium text-neutral-200">
              Vibe workflow
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Describe what you want
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
