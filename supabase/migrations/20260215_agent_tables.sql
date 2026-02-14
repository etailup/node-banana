-- =============================================================================
-- Agent Tables Migration
-- Creates agent_jobs, prompt_variations, batch_campaigns, batch_items,
-- quality_reviews tables with RLS policies and indexes.
-- =============================================================================

-- =============================================================================
-- Tables
-- =============================================================================

-- Parent table for all agent operations
CREATE TABLE IF NOT EXISTS public.agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Prompt optimizer: stores each variation and its score
CREATE TABLE IF NOT EXISTS public.prompt_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  variation_index INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  headless_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  image_url TEXT,
  scores JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batch campaign: tracks a bulk processing operation
CREATE TABLE IF NOT EXISTS public.batch_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_job_id UUID NOT NULL REFERENCES public.agent_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  workflow_id UUID NOT NULL REFERENCES headless_workflows(id) ON DELETE CASCADE,
  variable_map JSONB NOT NULL,
  total_items INTEGER NOT NULL,
  concurrency INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Batch campaign items: one row per CSV row
CREATE TABLE IF NOT EXISTS public.batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.batch_campaigns(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  row_data JSONB NOT NULL,
  headless_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_urls JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(campaign_id, row_index)
);

-- Quality review scores per image
CREATE TABLE IF NOT EXISTS public.quality_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  agent_job_id UUID REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  source_job_id UUID REFERENCES headless_jobs(id) ON DELETE SET NULL,
  source_prompt TEXT,
  scores JSONB NOT NULL,
  grade TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb,
  user_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Row Level Security (RLS)
-- =============================================================================

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_reviews ENABLE ROW LEVEL SECURITY;

-- Agent Jobs: users can view own
CREATE POLICY "Users can view own agent jobs"
  ON public.agent_jobs FOR SELECT
  USING (auth.uid() = user_id);

-- Prompt Variations: users can view via agent_job ownership
CREATE POLICY "Users can view own prompt variations"
  ON public.prompt_variations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_jobs
      WHERE agent_jobs.id = prompt_variations.agent_job_id
      AND agent_jobs.user_id = auth.uid()
    )
  );

-- Batch Campaigns: users can view own
CREATE POLICY "Users can view own batch campaigns"
  ON public.batch_campaigns FOR SELECT
  USING (auth.uid() = user_id);

-- Batch Items: users can view via campaign ownership
CREATE POLICY "Users can view own batch items"
  ON public.batch_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.batch_campaigns
      WHERE batch_campaigns.id = batch_items.campaign_id
      AND batch_campaigns.user_id = auth.uid()
    )
  );

-- Quality Reviews: users can view own
CREATE POLICY "Users can view own quality reviews"
  ON public.quality_reviews FOR SELECT
  USING (auth.uid() = user_id);

-- Service role full access on all agent tables
CREATE POLICY "Service role full access on agent_jobs"
  ON public.agent_jobs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on prompt_variations"
  ON public.prompt_variations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on batch_campaigns"
  ON public.batch_campaigns FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on batch_items"
  ON public.batch_items FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on quality_reviews"
  ON public.quality_reviews FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_agent_jobs_user_status ON agent_jobs(user_id, status);
CREATE INDEX idx_agent_jobs_type ON agent_jobs(agent_type);
CREATE INDEX idx_prompt_variations_job ON prompt_variations(agent_job_id);
CREATE INDEX idx_batch_campaigns_user ON batch_campaigns(user_id);
CREATE INDEX idx_batch_items_campaign_status ON batch_items(campaign_id, status);
CREATE INDEX idx_quality_reviews_source ON quality_reviews(source_job_id);
CREATE INDEX idx_quality_reviews_user ON quality_reviews(user_id, created_at DESC);
