// ─── Shared types matching the Platform API DTOs ───────────────────────────────

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'PAUSED' | 'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';
export type WorkflowMode = 'SEQUENTIAL' | 'DAG';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ApiMeta {
  requestId: string;
  correlationId: string;
  timestamp: string;
  apiVersion: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  remaining?: number;
  resetAt?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details: ApiErrorDetail[];
  retryable: boolean;
}

export interface ApiErrorResponse {
  error: ApiErrorBody;
  meta: ApiMeta;
}

export interface PaginationInfo {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  meta: ApiMeta;
}

// ─── Execution DTOs ─────────────────────────────────────────────────────────────

export interface CreateExecutionRequest {
  workflowId: string;
  input: Record<string, unknown>;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResponse {
  executionId: string;
  status: ExecutionStatus;
  createdAt: string;
  links: {
    self: string;
    events: string;
  };
}

export interface ExecutionResultResponse {
  executionId: string;
  status: ExecutionStatus;
  intelligenceResult: Record<string, unknown> | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  warnings: string[];
  errors: string[];
}

export interface ResumeExecutionRequest {
  resumeToken: string;
}

export interface CancelExecutionRequest {
  reason: string;
}

export interface PauseExecutionRequest {
  reason?: string;
}

// ─── Telemetry DTOs ─────────────────────────────────────────────────────────────

export interface TelemetryEvent {
  eventId: string;
  eventType: string;
  executionId: string;
  timestamp: string;
  summary: string;
  nodeId: string | null;
}

export interface TraceEntry {
  stage: string;
  startedAt: string;
  completedAt: string;
  success: boolean;
  summary: string;
}

export interface ExecutionTrace {
  executionId: string;
  stages: TraceEntry[];
}

// ─── Workflow DTOs ──────────────────────────────────────────────────────────────

export interface WorkflowNode {
  nodeId: string;
  type: string;
  label: string;
  order: number;
  dependsOn: string[];
  requiresApproval: boolean;
}

export interface WorkflowEdge {
  sourceNodeId: string;
  targetNodeId: string;
  condition: string | null;
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  mode: WorkflowMode;
}

export interface WorkflowResponse {
  workflowId: string;
  organizationId: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  mode: WorkflowMode;
  version: string;
  contentHash: string;
  createdAt: string;
  active: boolean;
}

export interface WorkflowValidationResponse {
  valid: boolean;
  errors: string[];
}

export interface ActivateVersionResponse {
  activated: boolean;
  version: string;
}

export interface DeactivateResponse {
  deactivated: boolean;
}

// ─── Approval DTOs ──────────────────────────────────────────────────────────────

export interface ApprovalResponse {
  approvalId: string;
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  reason: string;
  description: string;
  riskLevel: RiskLevel;
  confidenceScore: number;
  status: ApprovalStatus;
  createdAt: string;
}

export interface ApprovalDecisionRequest {
  comment: string;
  metadata?: Record<string, unknown>;
}

export interface ListApprovalsParams {
  executionId?: string;
  status?: ApprovalStatus;
  limit?: number;
  cursor?: string;
}

// ─── Health DTOs ────────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, 'up' | 'down'>;
  version: string;
}

export interface ReadinessResponse {
  ready: boolean;
  checks: Record<string, boolean>;
}

export interface VersionResponse {
  apiVersion: string;
  runtimeVersion: string;
  buildDate: string;
}

// ─── Capabilities DTO ───────────────────────────────────────────────────────────

export interface CapabilityResponse {
  engines: string[];
  nodeTypes: string[];
  toolTypes: string[];
  runtimeStatuses: string[];
  apiVersion: string;
  runtimeVersion: string;
  features: Record<string, boolean>;
}

// ─── Memory DTOs (no endpoint yet — see api-gaps.md) ────────────────────────────

export interface MemoryEntry {
  memoryId: string;
  organizationId: string;
  type: string;
  content: string;
  sensitivity: string;
  confidence: number;
  relevance: number;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
}

export interface MemoryQuery {
  organizationId: string;
  types?: string[];
  searchText?: string;
  limit?: number;
}

export interface MemoryWriteRequest {
  organizationId: string;
  type: string;
  content: string;
  sensitivity?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ─── Tools DTOs (no endpoint yet — see api-gaps.md) ─────────────────────────────

export interface ToolDefinition {
  toolId: string;
  name: string;
  category: string;
  capabilities: string[];
  permissions: string[];
}

export interface ToolSelectionRequest {
  organizationId: string;
  context: Record<string, unknown>;
  policy?: Record<string, unknown>;
}

export interface ToolExecutionPlan {
  planId: string;
  executionId: string;
  organizationId: string;
  status: string;
  steps: ToolPlanStep[];
  totalTools: number;
  fallbacksUsed: number;
  warnings: string[];
  createdAt: string;
  version: string;
}

export interface ToolPlanStep {
  stepId: string;
  toolId: string;
  toolName: string;
  status: string;
  isFallback: boolean;
  fallbackForToolId: string | null;
}
