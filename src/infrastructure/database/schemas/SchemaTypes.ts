// ─── Database schema row types ──────────────────────────────────────────────────
// Maps to the PostgreSQL table columns for type-safe repository operations.

export interface WorkflowRow {
  id:              string;
  organization_id: string;
  name:            string;
  description:     string;
  nodes:           unknown;
  edges:           unknown;
  mode:            string;
  current_version: string;
  content_hash:    string;
  active:          boolean;
  status:          string;
  metadata:        unknown;
  created_at:      string;
  updated_at:      string;
}

export interface WorkflowVersionRow {
  id:              string;
  workflow_id:     string;
  organization_id: string;
  version:         string;
  nodes:           unknown;
  edges:           unknown;
  content_hash:    string;
  mode:            string;
  created_at:      string;
}

export interface RuntimeExecutionRow {
  id:               string;
  organization_id:  string;
  request_id:       string;
  user_id:          string | null;
  status:           string;
  idempotency_key:  string | null;
  risk_tolerance:   string;
  min_confidence:   number;
  max_duration_ms:  number;
  allow_rollback:   boolean;
  require_approval: boolean;
  locale:           string;
  intelligence_request: unknown;
  metadata:         unknown;
  started_at:       string;
  completed_at:     string | null;
  paused_at:        string | null;
  resumed_at:       string | null;
  cancelled_at:     string | null;
  error_message:    string | null;
  warnings:         unknown;
  version:          number;
  created_at:       string;
  updated_at:       string;
}

export interface ApprovalRow {
  id:               string;
  organization_id:  string;
  execution_id:     string;
  node_id:          string;
  node_label:       string;
  reason:           string;
  description:      string;
  risk_level:       string;
  confidence_score: number;
  status:           string;
  decision_type:    string | null;
  reviewed_by:      string | null;
  comment:          string | null;
  decided_at:       string | null;
  metadata:         unknown;
  created_at:       string;
  updated_at:       string;
}

export interface CheckpointRow {
  id:              string;
  organization_id: string;
  execution_id:    string;
  node_id:         string;
  content_hash:    string;
  state_data:      unknown;
  token_id:        string | null;
  token_expires_at: string | null;
  token_consumed:  boolean;
  created_at:      string;
}

export interface HumanTaskRow {
  id:              string;
  organization_id: string;
  execution_id:    string;
  node_id:         string;
  task_type:       string;
  description:     string;
  status:          string;
  result:          unknown;
  completed_by:    string | null;
  created_at:      string;
  completed_at:    string | null;
}

export interface ToolDefinitionRow {
  id:              string;
  organization_id: string;
  tool_id:         string;
  name:            string;
  description:     string;
  category:        string;
  capabilities:    unknown;
  config:          unknown;
  is_active:       boolean;
  metadata:        unknown;
  created_at:      string;
  updated_at:      string;
}

export interface MemoryEntryRow {
  id:              string;
  organization_id: string;
  memory_id:       string | null;
  type:            string;
  scope:           string;
  content:         unknown;
  tags:            unknown;
  confidence:      number;
  expires_at:      string | null;
  created_at:      string;
  updated_at:      string;
}

export interface LearningRecordRow {
  id:              string;
  organization_id: string;
  record_id:       string;
  sources:         unknown;
  patterns:        unknown;
  recommendations: unknown;
  status:          string;
  version:         number;
  metadata:        unknown;
  created_at:      string;
  updated_at:      string;
}

export interface TelemetryEventRow {
  id:              string;
  organization_id: string;
  event_id:        string;
  event_type:      string;
  execution_id:    string | null;
  node_id:         string | null;
  summary:         string;
  timestamp:       string;
  metadata:        unknown;
  created_at:      string;
}

export interface ExecutionTraceRow {
  id:              string;
  organization_id: string;
  trace_id:        string;
  execution_id:    string;
  stages:          unknown;
  duration_ms:     number | null;
  created_at:      string;
}

export interface IdempotencyRecordRow {
  id:              string;
  organization_id: string;
  key:             string;
  request_hash:    string;
  status:          string;
  response_payload: unknown;
  http_status:     number;
  resource_id:     string | null;
  created_at:      string;
  expires_at:      string;
}

export interface OutboxEventRow {
  id:              string;
  organization_id: string;
  event_type:      string;
  aggregate_id:    string;
  payload:         unknown;
  status:          string;
  retry_count:     number;
  max_retries:     number;
  next_attempt_at: string;
  last_error:      string | null;
  published_at:    string | null;
  created_at:      string;
  updated_at:      string;
}

export interface AuditLogRow {
  id:              string;
  organization_id: string;
  actor_id:        string;
  action:          string;
  resource_type:   string;
  resource_id:     string | null;
  result:          string;
  correlation_id:  string | null;
  request_id:      string | null;
  metadata:        unknown;
  created_at:      string;
}
