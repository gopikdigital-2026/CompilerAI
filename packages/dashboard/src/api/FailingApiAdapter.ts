import type { DashboardApiAdapter } from './DashboardApiAdapter';
import type { ExecutionFilters, MemoryFilters, ApprovalFilters } from '../types/dashboard';

export class FailingApiAdapter implements DashboardApiAdapter {
  async getDashboardStats(_organizationId?: string): Promise<never> {
    throw new Error('Failed to load dashboard stats. Request used key sk-abc123def456ghi789 and Bearer token_xyz');
  }

  async getExecutions(_filters?: ExecutionFilters): Promise<never> {
    throw new Error('Failed to load executions. Auth token Bearer abc123def456 expired');
  }

  async getExecutionDetail(_executionId: string): Promise<never> {
    throw new Error('Failed to load execution detail. API key sk-abc123def456ghi789 invalid');
  }

  async getTraceEvents(_executionId: string): Promise<never> {
    throw new Error('Failed to load trace events');
  }

  async getTelemetrySeries(_points?: number): Promise<never> {
    throw new Error('Failed to load telemetry series');
  }

  async getEngineMetrics(): Promise<never> {
    throw new Error('Failed to load engine metrics');
  }

  async getMemoryEntries(_filters?: MemoryFilters): Promise<never> {
    throw new Error('Failed to load memory entries. Secret key sk-secretkey123456789 leaked');
  }

  async getToolStats(): Promise<never> {
    throw new Error('Failed to load tool stats');
  }

  async getWorkflowDag(_workflowId: string): Promise<never> {
    throw new Error('Failed to load workflow DAG');
  }

  async getApprovals(_filters?: ApprovalFilters): Promise<never> {
    throw new Error('Failed to load approvals');
  }

  async decideApproval(
    _approvalId: string,
    _decision: 'approve' | 'reject',
    _comment: string,
  ): Promise<never> {
    throw new Error('Failed to decide approval. Bearer token_invalid_xyz');
  }

  async getHealth(): Promise<never> {
    throw new Error('Failed to load health data');
  }
}
