export type ExecutionStatus =
  | 'PENDING' | 'RUNNING' | 'PAUSED' | 'AWAITING_APPROVAL'
  | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';

export type ApprovalStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type MemoryType = 'WORKING' | 'SESSION' | 'ORGANIZATION' | 'SEMANTIC' | 'EXECUTION';

export type MemorySensitivity = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type ToolCategory = 'ANALYSIS' | 'DATA_ACCESS' | 'EXECUTION' | 'COMMUNICATION' | 'MONITORING' | 'UTILITY';

export type ServiceHealth = 'up' | 'down' | 'degraded';

export type Theme = 'dark' | 'light';

export type PipelineStageName =
  | 'API' | 'Runtime' | 'Context' | 'Intent' | 'Planning'
  | 'Decision' | 'Confidence' | 'Memory' | 'Tool Selection'
  | 'Execution' | 'Learning' | 'Persistence';

export interface ExecutionSummary {
  executionId: string;
  organizationId: string;
  status: ExecutionStatus;
  workflowName: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  result: string | null;
  errorCount: number;
  warningCount: number;
}

export interface StageDetail {
  stage: PipelineStageName;
  status: 'completed' | 'running' | 'failed' | 'skipped' | 'pending';
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  summary: string;
  confidenceScore: number | null;
  riskLevel: RiskLevel | null;
  memoryUsageMb: number | null;
  tokensUsed: number | null;
  modelUsed: string | null;
  errors: string[];
  warnings: string[];
}

export interface ExecutionDetailData {
  executionId: string;
  organizationId: string;
  status: ExecutionStatus;
  workflowName: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  stages: StageDetail[];
  errors: string[];
  warnings: string[];
  intelligenceResult: Record<string, unknown> | null;
}

export interface TraceEvent {
  eventId: string;
  eventType: string;
  executionId: string;
  timestamp: string;
  summary: string;
  nodeId: string | null;
  category: 'event' | 'retry' | 'error' | 'checkpoint' | 'approval';
}

export interface TelemetrySeriesPoint {
  timestamp: string;
  latencyMs: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryMb: number;
}

export interface EngineMetric {
  engine: string;
  avgDurationMs: number;
  invocations: number;
  failureRate: number;
}

export interface MemoryEntryData {
  memoryId: string;
  organizationId: string;
  executionId: string | null;
  type: MemoryType;
  content: string;
  source: string;
  confidence: number;
  relevance: number;
  sensitivity: MemorySensitivity;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
}

export interface ToolStats {
  toolId: string;
  name: string;
  category: ToolCategory;
  invocations: number;
  avgDurationMs: number;
  successRate: number;
  lastError: string | null;
  lastUsedAt: string;
}

export interface WorkflowNodeData {
  nodeId: string;
  type: string;
  label: string;
  order: number;
  dependsOn: string[];
  requiresApproval: boolean;
  status: 'completed' | 'running' | 'failed' | 'pending';
  durationMs: number | null;
}

export interface WorkflowEdgeData {
  sourceNodeId: string;
  targetNodeId: string;
  condition: string | null;
}

export interface WorkflowDagData {
  workflowId: string;
  name: string;
  description: string;
  mode: 'SEQUENTIAL' | 'DAG';
  version: string;
  nodes: WorkflowNodeData[];
  edges: WorkflowEdgeData[];
}

export interface ApprovalData {
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
  comment: string | null;
  reviewedBy: string | null;
  decidedAt: string | null;
}

export interface HealthService {
  name: string;
  status: ServiceHealth;
  latencyMs: number;
  version: string | null;
  details: string | null;
}

export interface HealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthService[];
  apiVersion: string;
  runtimeVersion: string;
  sdkVersion: string;
  cliVersion: string;
}

export interface DashboardStats {
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  avgDurationMs: number;
  successRate: number;
  errorsLast24h: number;
  toolUsage: { tool: string; count: number }[];
  memoryConsumptionMb: number;
  avgConfidence: number;
}

export interface ExecutionFilters {
  organizationId?: string;
  status?: string;
  workflow?: string;
  search?: string;
}

export interface MemoryFilters {
  type?: string;
  search?: string;
  organizationId?: string;
}

export interface ApprovalFilters {
  status?: string;
  executionId?: string;
}
