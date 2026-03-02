-- =============================================================================
-- Editor Workflows Migration
-- Applied: 2026-02-19 to project upimymvkedesglrvlvbn
-- =============================================================================
-- Creates editor_workflows table for cloud-based workflow persistence.
-- Uses TEXT primary key (client generates wf_TIMESTAMP_RANDOM IDs).
-- Stores workflow JSON with CDN URLs (no base64).
-- =============================================================================

-- Editor Workflows table
CREATE TABLE IF NOT EXISTS public.editor_workflows (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition JSONB NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_editor_workflows_user_id ON public.editor_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_editor_workflows_updated_at ON public.editor_workflows(updated_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE public.editor_workflows ENABLE ROW LEVEL SECURITY;

-- Users can read their own workflows
CREATE POLICY "Users can read own editor workflows"
  ON public.editor_workflows FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own workflows
CREATE POLICY "Users can insert own editor workflows"
  ON public.editor_workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own workflows
CREATE POLICY "Users can update own editor workflows"
  ON public.editor_workflows FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own workflows
CREATE POLICY "Users can delete own editor workflows"
  ON public.editor_workflows FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (bypasses RLS automatically)
