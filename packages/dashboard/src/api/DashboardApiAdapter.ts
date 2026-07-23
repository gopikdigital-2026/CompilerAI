import type {
  ExecutionSummary,
  ExecutionDetailData,
  TraceEvent,
  TelemetrySeriesPoint,
  EngineMetric,
  MemoryEntryData,
  ToolStats,
  WorkflowDagData,
  ApprovalData,
  HealthData,
  DashboardStats,
  ExecutionFilters,
  MemoryFilters,
  ApprovalFilters,
} from '../types/dashboard';

export interface DashboardApiAdapter {
  getDashboardStats(organizationId?: string): Promise<DashboardStats>;
  getExecutions(filters?: ExecutionFilters): Promise<ExecutionSummary[]>;
  getExecutionDetail(executionId: string): Promise<ExecutionDetailData>;
  getTraceEvents(executionId: string): Promise<TraceEvent[]>;
  getTelemetrySeries(points?: number): Promise<TelemetrySeriesPoint[]>;
  getEngineMetrics(): Promise<EngineMetric[]>;
  getMemoryEntries(filters?: MemoryFilters): Promise<MemoryEntryData[]>;
  getToolStats(): Promise<ToolStats[]>;
  getWorkflowDag(workflowId: string): Promise<WorkflowDagData>;
  getApprovals(filters?: ApprovalFilters): Promise<ApprovalData[]>;
  decideApproval(approvalId: string, decision: 'approve' | 'reject', comment: string): Promise<ApprovalData>;
  getHealth(): Promise<HealthData>;
}
