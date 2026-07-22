// ─── API DTOs ───────────────────────────────────────────────────────────────────
// Data Transfer Objects — separate from domain models. Never expose internal models.

// ── Execution DTOs ─────────────────────────────────────────────────────────────

export interface CreateExecutionRequestDto {
  workflowId:    string;
  input:         Record<string, unknown>;
  idempotencyKey: string;
  metadata?:     Record<string, unknown>;
}

export interface ExecutionResponseDto {
  executionId:  string;
  status:       string;
  createdAt:    string;
  links: {
    self:   string;
    events: string;
  };
}

export interface ExecutionResultResponseDto {
  executionId:       string;
  status:            string;
  intelligenceResult: Record<string, unknown> | null;
  startedAt:         string;
  completedAt:       string;
  durationMs:        number;
  warnings:          string[];
  errors:            string[];
}

export interface PauseExecutionRequestDto {
  reason?: string;
}

export interface ResumeExecutionRequestDto {
  resumeToken: string;
}

export interface CancelExecutionRequestDto {
  reason: string;
}

// ── Workflow DTOs ──────────────────────────────────────────────────────────────

export interface CreateWorkflowRequestDto {
  name:        string;
  description: string;
  nodes:       WorkflowNodeDto[];
  edges:       WorkflowEdgeDto[];
  mode:        'SEQUENTIAL' | 'DAG';
}

export interface WorkflowNodeDto {
  nodeId:           string;
  type:             string;
  label:            string;
  order:            number;
  dependsOn:        string[];
  requiresApproval: boolean;
}

export interface WorkflowEdgeDto {
  sourceNodeId: string;
  targetNodeId: string;
  condition:    string | null;
}

export interface WorkflowResponseDto {
  workflowId:     string;
  organizationId: string;
  name:           string;
  description:    string;
  nodes:          WorkflowNodeDto[];
  edges:          WorkflowEdgeDto[];
  mode:           string;
  version:        string;
  contentHash:    string;
  createdAt:      string;
  active:         boolean;
}

export interface WorkflowValidationResponseDto {
  valid:  boolean;
  errors: string[];
}

// ── Approval DTOs ──────────────────────────────────────────────────────────────

export interface ApprovalResponseDto {
  approvalId:      string;
  executionId:     string;
  nodeId:          string;
  nodeLabel:       string;
  reason:          string;
  description:     string;
  riskLevel:       string;
  confidenceScore: number;
  status:          string;
  createdAt:       string;
}

export interface ApprovalDecisionRequestDto {
  comment:  string;
  metadata?: Record<string, unknown>;
}

// ── Telemetry DTOs ─────────────────────────────────────────────────────────────

export interface TelemetryEventResponseDto {
  eventId:        string;
  eventType:      string;
  executionId:    string;
  timestamp:      string;
  summary:        string;
  nodeId:         string | null;
}

export interface ExecutionTraceResponseDto {
  executionId:  string;
  stages:       TraceEntryDto[];
}

export interface TraceEntryDto {
  stage:       string;
  startedAt:   string;
  completedAt: string;
  success:     boolean;
  summary:     string;
}

// ── Error DTO ──────────────────────────────────────────────────────────────────

export interface ApiErrorResponseDto {
  error: {
    code:      string;
    message:   string;
    details:   unknown[];
    retryable: boolean;
  };
  meta: ApiMetaDto;
}

// ── Pagination DTOs ────────────────────────────────────────────────────────────

export interface PaginationRequestDto {
  limit:      number;
  cursor:     string | null;
  sort:       string;
  status:     string | null;
  createdFrom: string | null;
  createdTo:   string | null;
}

export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore:    boolean;
    limit:      number;
  };
  meta: ApiMetaDto;
}

// ── Meta DTO ───────────────────────────────────────────────────────────────────

export interface ApiMetaDto {
  requestId:     string;
  correlationId: string;
  timestamp:     string;
  apiVersion:    string;
}

// ── Standard response wrapper ──────────────────────────────────────────────────

export interface ApiSuccessResponseDto<T> {
  data: T;
  meta: ApiMetaDto;
}

// ── Capability / Health DTOs ───────────────────────────────────────────────────

export interface CapabilityResponseDto {
  engines:         string[];
  nodeTypes:       string[];
  toolTypes:       string[];
  runtimeStatuses: string[];
  apiVersion:      string;
  runtimeVersion:  string;
  features:        Record<string, boolean>;
}

export interface HealthResponseDto {
  status:   'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, 'up' | 'down'>;
  version:  string;
}

export interface ReadinessResponseDto {
  ready:    boolean;
  checks:   Record<string, boolean>;
}

export interface VersionResponseDto {
  apiVersion:      string;
  runtimeVersion:  string;
  buildDate:       string;
}
