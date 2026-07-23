import type { ExecutionMonitor, MonitorEvent, PendingApproval, CheckpointInfo } from '../models/MonitorModels';
import type { IMonitorRepository } from '../repositories/RepositoryInterfaces';
import type { IMonitorAdapter } from '../integrations/IntegrationAdapters';
import { MonitorNotFoundError } from '../errors/AutomationStudioErrors';

export class MonitorService {
  constructor(
    private readonly repo: IMonitorRepository,
    private readonly monitorAdapter: IMonitorAdapter,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async createMonitor(
    organizationId: string,
    executionId: string,
    workflowId: string,
    workflowVersion: number,
  ): Promise<ExecutionMonitor> {
    const now = this.clock();
    const monitor: ExecutionMonitor = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId,
      executionId,
      workflowId,
      workflowVersion,
      status: 'running',
      activeNodes: [],
      completedNodes: [],
      failedNodes: [],
      pendingApprovals: [],
      checkpoints: [],
      startedAt: now,
      completedAt: null,
      events: [],
    };
    return this.repo.create(monitor);
  }

  async getMonitor(id: string): Promise<ExecutionMonitor> {
    const m = await this.repo.findById(id);
    if (!m) throw new MonitorNotFoundError(`Monitor not found: ${id}`);
    return m;
  }

  async getMonitorByExecution(executionId: string): Promise<ExecutionMonitor | null> {
    return this.repo.findByExecution(executionId);
  }

  async getByOrganization(organizationId: string): Promise<ExecutionMonitor[]> {
    return this.repo.findByOrganization(organizationId);
  }

  async recordEvent(monitorId: string, event: Omit<MonitorEvent, 'id' | 'timestamp'>): Promise<ExecutionMonitor> {
    const monitor = await this.getMonitor(monitorId);
    const fullEvent: MonitorEvent = {
      ...event,
      id: this.idGen(),
      timestamp: this.clock(),
    };

    const events = [...monitor.events, fullEvent];
    const update = this.applyEvent(monitor, fullEvent);

    const updated: ExecutionMonitor = {
      ...monitor,
      ...update,
      events,
      updatedAt: this.clock(),
    };

    this.monitorAdapter.publish(fullEvent);
    return this.repo.update(updated);
  }

  async addPendingApproval(
    monitorId: string,
    approval: Omit<PendingApproval, 'status' | 'decidedBy' | 'decidedAt' | 'comment'>,
  ): Promise<ExecutionMonitor> {
    const monitor = await this.getMonitor(monitorId);
    const pending: PendingApproval = {
      ...approval,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      comment: null,
    };
    return this.repo.update({
      ...monitor,
      pendingApprovals: [...monitor.pendingApprovals, pending],
      updatedAt: this.clock(),
    });
  }

  async resolveApproval(
    monitorId: string,
    nodeId: string,
    approved: boolean,
    decidedBy: string,
    comment?: string,
  ): Promise<ExecutionMonitor> {
    const monitor = await this.getMonitor(monitorId);
    const pendingApprovals = monitor.pendingApprovals.map((a) =>
      a.nodeId === nodeId
        ? {
            ...a,
            status: approved ? ('approved' as const) : ('denied' as const),
            decidedBy,
            decidedAt: this.clock(),
            comment: comment ?? null,
          }
        : a,
    );
    return this.repo.update({
      ...monitor,
      pendingApprovals,
      updatedAt: this.clock(),
    });
  }

  async addCheckpoint(
    monitorId: string,
    checkpoint: Omit<CheckpointInfo, 'checkpointId' | 'timestamp'>,
  ): Promise<ExecutionMonitor> {
    const monitor = await this.getMonitor(monitorId);
    const cp: CheckpointInfo = {
      ...checkpoint,
      checkpointId: this.idGen(),
      timestamp: this.clock(),
    };
    return this.repo.update({
      ...monitor,
      checkpoints: [...monitor.checkpoints, cp],
      updatedAt: this.clock(),
    });
  }

  async completeMonitor(monitorId: string, success: boolean): Promise<ExecutionMonitor> {
    const monitor = await this.getMonitor(monitorId);
    return this.repo.update({
      ...monitor,
      status: success ? 'completed' : 'failed',
      activeNodes: [],
      completedAt: this.clock(),
      updatedAt: this.clock(),
    });
  }

  subscribe(executionId: string, handler: (event: MonitorEvent) => void): () => void {
    return this.monitorAdapter.subscribe(executionId, handler);
  }

  private applyEvent(
    monitor: ExecutionMonitor,
    event: MonitorEvent,
  ): Partial<ExecutionMonitor> {
    const update: Partial<ExecutionMonitor> = {};

    switch (event.type) {
      case 'node_started':
        update.activeNodes = [...monitor.activeNodes, event.nodeId!];
        break;
      case 'node_completed':
        update.activeNodes = monitor.activeNodes.filter((n) => n !== event.nodeId);
        update.completedNodes = [...monitor.completedNodes, event.nodeId!];
        break;
      case 'node_failed':
        update.activeNodes = monitor.activeNodes.filter((n) => n !== event.nodeId);
        update.failedNodes = [...monitor.failedNodes, event.nodeId!];
        break;
      case 'node_skipped':
        update.activeNodes = monitor.activeNodes.filter((n) => n !== event.nodeId);
        break;
      case 'execution_completed':
        update.status = 'completed';
        update.activeNodes = [];
        update.completedAt = event.timestamp;
        break;
      case 'execution_failed':
        update.status = 'failed';
        update.activeNodes = [];
        update.completedAt = event.timestamp;
        break;
      case 'execution_paused':
        update.status = 'paused';
        break;
      case 'execution_resumed':
        update.status = 'running';
        break;
    }

    return update;
  }
}
