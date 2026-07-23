import type { DashboardApiAdapter } from './DashboardApiAdapter';
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
import { mockData } from './mockData';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockApiAdapter implements DashboardApiAdapter {
  async getDashboardStats(organizationId?: string): Promise<DashboardStats> {
    await delay(100);
    const executions = mockData.generateExecutionSummaries(80);
    return mockData.generateDashboardStats(executions, organizationId);
  }

  async getExecutions(filters?: ExecutionFilters): Promise<ExecutionSummary[]> {
    await delay(150);
    let execs = mockData.generateExecutionSummaries(100);
    if (filters?.organizationId) {
      execs = execs.filter((e) => e.organizationId === filters.organizationId);
    }
    if (filters?.status && filters.status !== 'ALL') {
      execs = execs.filter((e) => e.status === filters.status);
    }
    if (filters?.workflow && filters.workflow !== 'ALL') {
      execs = execs.filter((e) => e.workflowName === filters.workflow);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      execs = execs.filter(
        (e) =>
          e.executionId.toLowerCase().includes(q) ||
          e.organizationId.toLowerCase().includes(q) ||
          e.workflowName.toLowerCase().includes(q),
      );
    }
    return execs;
  }

  async getExecutionDetail(executionId: string): Promise<ExecutionDetailData> {
    await delay(120);
    return mockData.generateExecutionDetail(executionId);
  }

  async getTraceEvents(executionId: string): Promise<TraceEvent[]> {
    await delay(100);
    return mockData.generateTraceEvents(executionId);
  }

  async getTelemetrySeries(points = 30): Promise<TelemetrySeriesPoint[]> {
    await delay(100);
    return mockData.generateTelemetrySeries(points);
  }

  async getEngineMetrics(): Promise<EngineMetric[]> {
    await delay(80);
    return mockData.generateEngineMetrics();
  }

  async getMemoryEntries(filters?: MemoryFilters): Promise<MemoryEntryData[]> {
    await delay(120);
    let entries = mockData.generateMemoryEntries(60);
    if (filters?.type && filters.type !== 'ALL') {
      entries = entries.filter((e) => e.type === filters.type);
    }
    if (filters?.organizationId) {
      entries = entries.filter((e) => e.organizationId === filters.organizationId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      entries = entries.filter(
        (e) => e.content.toLowerCase().includes(q) || e.memoryId.toLowerCase().includes(q),
      );
    }
    return entries;
  }

  async getToolStats(): Promise<ToolStats[]> {
    await delay(80);
    return mockData.generateToolStats();
  }

  async getWorkflowDag(_workflowId: string): Promise<WorkflowDagData> {
    await delay(100);
    return mockData.generateWorkflowDag();
  }

  async getApprovals(filters?: ApprovalFilters): Promise<ApprovalData[]> {
    await delay(100);
    let approvals = mockData.generateApprovals(30);
    if (filters?.status && filters.status !== 'ALL') {
      approvals = approvals.filter((a) => a.status === filters.status);
    }
    if (filters?.executionId) {
      approvals = approvals.filter((a) => a.executionId === filters.executionId);
    }
    return approvals;
  }

  async decideApproval(
    approvalId: string,
    decision: 'approve' | 'reject',
    comment: string,
  ): Promise<ApprovalData> {
    await delay(100);
    return {
      approvalId,
      executionId: `exec_${Math.floor(Math.random() * 100)}`,
      nodeId: 'node_1',
      nodeLabel: 'Approval Gate',
      reason: 'RISK_THRESHOLD_EXCEEDED',
      description: 'Approval processed',
      riskLevel: 'MEDIUM',
      confidenceScore: 75,
      status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
      createdAt: new Date().toISOString(),
      comment,
      reviewedBy: 'dashboard-user',
      decidedAt: new Date().toISOString(),
    };
  }

  async getHealth(): Promise<HealthData> {
    await delay(80);
    return mockData.generateHealth();
  }
}
