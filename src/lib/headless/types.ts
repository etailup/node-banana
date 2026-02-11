/**
 * Headless Workflow Execution Types
 *
 * All interfaces for the headless execution layer:
 * workflow templates, job records, parameter overrides,
 * callback payloads, and variable definitions.
 */

// ---------------------------------------------------------------------------
// Workflow Variables
// ---------------------------------------------------------------------------

/** Describes a named variable slot in a workflow template. */
export interface WorkflowVariable {
  type: "image" | "text";
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

/** Map of variable names to their definitions. */
export type WorkflowVariableMap = Record<string, WorkflowVariable>;

// ---------------------------------------------------------------------------
// Workflow Template (Supabase `headless_workflows` row)
// ---------------------------------------------------------------------------

export interface HeadlessWorkflow {
  id: string;
  name: string;
  definition: WorkflowFileJSON;
  variables: WorkflowVariableMap;
  created_at: string;
  updated_at: string;
}

/**
 * Minimal shape of a stored workflow JSON.
 * Mirrors the file-based WorkflowFile but without React Flow internals.
 */
export interface WorkflowFileJSON {
  nodes: WorkflowNodeJSON[];
  edges: WorkflowEdgeJSON[];
  groups?: WorkflowGroupJSON[];
}

export interface WorkflowNodeJSON {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  groupId?: string;
}

export interface WorkflowEdgeJSON {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: Record<string, unknown>;
}

export interface WorkflowGroupJSON {
  id: string;
  name: string;
  locked?: boolean;
}

// ---------------------------------------------------------------------------
// Parameter Overrides (provided at execution time)
// ---------------------------------------------------------------------------

export interface ParameterOverrides {
  /** Image overrides: variable name -> URL */
  images?: Record<string, string>;
  /** Text/prompt overrides: variable name -> string value */
  prompts?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Execution Request
// ---------------------------------------------------------------------------

export interface HeadlessExecuteRequest {
  /** ID of a stored workflow template (mutually exclusive with `workflow`) */
  workflowId?: string;
  /** Inline workflow JSON (mutually exclusive with `workflowId`) */
  workflow?: WorkflowFileJSON;
  /** Runtime parameter overrides that fill {{variable}} slots */
  parameters?: ParameterOverrides;
  /** URL to POST results to when the job completes */
  callbackUrl?: string;
  /** Max parallel node executions within a level (default: 3) */
  maxConcurrency?: number;
}

// ---------------------------------------------------------------------------
// Job Record (Supabase `headless_jobs` row)
// ---------------------------------------------------------------------------

export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface JobProgress {
  completed: number;
  total: number;
  currentLevel?: number;
  totalLevels?: number;
}

export interface JobOutputEntry {
  nodeId: string;
  imageUrl?: string;
  text?: string;
}

export interface JobError {
  nodeId?: string;
  message: string;
  timestamp: string;
}

export interface HeadlessJob {
  id: string;
  workflow_id: string | null;
  status: JobStatus;
  parameters: ParameterOverrides;
  progress: JobProgress;
  outputs: Record<string, JobOutputEntry>;
  errors: JobError[];
  callback_url: string | null;
  callback_delivered: boolean;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ---------------------------------------------------------------------------
// Callback Payload (sent to callbackUrl)
// ---------------------------------------------------------------------------

export interface CallbackPayload {
  jobId: string;
  status: JobStatus;
  outputs: Record<string, JobOutputEntry>;
  errors: JobError[];
  completedAt: string;
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

export interface ExecuteResponse {
  jobId: string;
  status: JobStatus;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  outputs: Record<string, JobOutputEntry>;
  errors: JobError[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ---------------------------------------------------------------------------
// Internal Engine Types
// ---------------------------------------------------------------------------

/** Level group from topological sort (same as workflowStore's LevelGroup). */
export interface LevelGroup {
  level: number;
  nodeIds: string[];
}

/** Resolved node inputs for execution (server-side equivalent of getConnectedInputs). */
export interface ResolvedNodeInputs {
  images: string[];
  videos: string[];
  text: string | null;
}

/** Result of executing a single node. */
export interface NodeExecutionResult {
  nodeId: string;
  nodeType: string;
  outputImage?: string;   // base64
  outputVideo?: string;   // base64 or URL
  outputText?: string;
  error?: string;
}
