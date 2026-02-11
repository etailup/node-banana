-- Headless Workflow Execution tables
-- Applied: 2026-02-11 to project upimymvkedesglrvlvbn

CREATE TABLE IF NOT EXISTS headless_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  definition JSONB NOT NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS headless_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES headless_workflows(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  parameters JSONB DEFAULT '{}'::jsonb,
  progress JSONB DEFAULT '{"completed":0,"total":0}'::jsonb,
  outputs JSONB DEFAULT '{}'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  callback_url TEXT,
  callback_delivered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_headless_jobs_status ON headless_jobs(status);
CREATE INDEX IF NOT EXISTS idx_headless_jobs_workflow_id ON headless_jobs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_headless_jobs_created_at ON headless_jobs(created_at DESC);
