// ─── Runtime repositories (in-memory, swappable) ────────────────────────────────

import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { WorkflowDefinition } from '../models/WorkflowModels';
import type { WorkflowExecution } from '../models/WorkflowModels';
import type { ApprovalRequest } from '../models/ApprovalModels';
import type { RuntimeCheckpoint } from '../models/CheckpointModels';
import type { ResumeToken } from '../models/CheckpointModels';
import type { HumanTask } from '../models/CheckpointModels';
import type {
  IRuntimeRepository, IWorkflowRepository, IApprovalRepository,
} from '../interfaces/RuntimeInterfaces';
import type { RuntimeEvent } from '../models/RuntimeEvent';

// ── IRuntimeRepository ──────────────────────────────────────────────────────────

export class InMemoryRuntimeRepository implements IRuntimeRepository {
  private readonly executions = new Map<string, RuntimeExecution>();
  private readonly idempotencyIndex = new Map<string, string>(); // key → executionId
  private readonly orgIndex = new Map<string, Set<string>>();

  save(execution: RuntimeExecution): void {
    this.executions.set(execution.executionId, execution);
    this.idempotencyIndex.set(execution.idempotencyKey, execution.executionId);
    if (!this.orgIndex.has(execution.organizationId)) this.orgIndex.set(execution.organizationId, new Set());
    this.orgIndex.get(execution.organizationId)!.add(execution.executionId);
  }

  findById(executionId: string): RuntimeExecution | null {
    return this.executions.get(executionId) ?? null;
  }

  findByIdempotencyKey(key: string): RuntimeExecution | null {
    const execId = this.idempotencyIndex.get(key);
    return execId ? this.executions.get(execId) ?? null : null;
  }

  findByOrganization(organizationId: string): RuntimeExecution[] {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.executions.get(id)!).filter(Boolean);
  }

  update(execution: RuntimeExecution): boolean {
    if (!this.executions.has(execution.executionId)) return false;
    this.executions.set(execution.executionId, execution);
    return true;
  }

  delete(executionId: string): boolean {
    const exec = this.executions.get(executionId);
    if (!exec) return false;
    this.executions.delete(executionId);
    this.idempotencyIndex.delete(exec.idempotencyKey);
    this.orgIndex.get(exec.organizationId)?.delete(executionId);
    return true;
  }

  count(): number { return this.executions.size; }

  clear(): void { this.executions.clear(); this.idempotencyIndex.clear(); this.orgIndex.clear(); }
}

// ── IWorkflowRepository ─────────────────────────────────────────────────────────

export class InMemoryWorkflowRepository implements IWorkflowRepository {
  private readonly definitions = new Map<string, WorkflowDefinition>();
  private readonly executions = new Map<string, WorkflowExecution>();
  private readonly defOrgIndex = new Map<string, Set<string>>();

  saveDefinition(def: WorkflowDefinition): void {
    this.definitions.set(def.workflowId, def);
    if (!this.defOrgIndex.has(def.organizationId)) this.defOrgIndex.set(def.organizationId, new Set());
    this.defOrgIndex.get(def.organizationId)!.add(def.workflowId);
  }

  findDefinition(workflowId: string): WorkflowDefinition | null {
    return this.definitions.get(workflowId) ?? null;
  }

  findDefinitionsByOrganization(organizationId: string): WorkflowDefinition[] {
    const ids = this.defOrgIndex.get(organizationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.definitions.get(id)!).filter(Boolean);
  }

  saveExecution(exec: WorkflowExecution): void {
    this.executions.set(exec.workflowExecutionId, exec);
  }

  findExecution(executionId: string): WorkflowExecution | null {
    return this.executions.get(executionId) ?? null;
  }

  updateExecution(exec: WorkflowExecution): boolean {
    if (!this.executions.has(exec.workflowExecutionId)) return false;
    this.executions.set(exec.workflowExecutionId, exec);
    return true;
  }

  clear(): void { this.definitions.clear(); this.executions.clear(); this.defOrgIndex.clear(); }
}

// ── IApprovalRepository ─────────────────────────────────────────────────────────

export class InMemoryApprovalRepository implements IApprovalRepository {
  private readonly approvals = new Map<string, ApprovalRequest>();
  private readonly orgIndex = new Map<string, Set<string>>();

  save(approval: ApprovalRequest): void {
    this.approvals.set(approval.approvalId, approval);
    if (!this.orgIndex.has(approval.organizationId)) this.orgIndex.set(approval.organizationId, new Set());
    this.orgIndex.get(approval.organizationId)!.add(approval.approvalId);
  }

  findById(approvalId: string): ApprovalRequest | null {
    return this.approvals.get(approvalId) ?? null;
  }

  findByExecution(executionId: string): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(a => a.executionId === executionId);
  }

  findPending(organizationId: string): ApprovalRequest[] {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.approvals.get(id)!).filter(a => a.status === 'PENDING');
  }

  update(approval: ApprovalRequest): boolean {
    if (!this.approvals.has(approval.approvalId)) return false;
    this.approvals.set(approval.approvalId, approval);
    return true;
  }

  clear(): void { this.approvals.clear(); this.orgIndex.clear(); }
}

// ── Checkpoint & Token & HumanTask & Event stores (helper repositories) ─────────

export class InMemoryCheckpointStore {
  private readonly checkpoints = new Map<string, RuntimeCheckpoint>();
  private readonly tokens = new Map<string, ResumeToken>();
  private readonly tasks = new Map<string, HumanTask>();
  private readonly events: RuntimeEvent[] = [];

  saveCheckpoint(cp: RuntimeCheckpoint): void { this.checkpoints.set(cp.checkpointId, cp); }
  findCheckpoint(id: string): RuntimeCheckpoint | null { return this.checkpoints.get(id) ?? null; }
  findCheckpointsByExecution(executionId: string): RuntimeCheckpoint[] {
    return Array.from(this.checkpoints.values()).filter(c => c.executionId === executionId);
  }

  saveToken(token: ResumeToken): void { this.tokens.set(token.tokenId, token); }
  findToken(id: string): ResumeToken | null { return this.tokens.get(id) ?? null; }
  updateToken(token: ResumeToken): void { this.tokens.set(token.tokenId, token); }

  saveTask(task: HumanTask): void { this.tasks.set(task.taskId, task); }
  findTask(id: string): HumanTask | null { return this.tasks.get(id) ?? null; }
  findPendingTasks(organizationId: string): HumanTask[] {
    return Array.from(this.tasks.values()).filter(t => t.organizationId === organizationId && t.status === 'PENDING');
  }
  updateTask(task: HumanTask): void { this.tasks.set(task.taskId, task); }

  addEvent(event: RuntimeEvent): void { this.events.push(event); }
  getEvents(executionId?: string): RuntimeEvent[] {
    if (executionId) return this.events.filter(e => e.executionId === executionId);
    return [...this.events];
  }
  clearEvents(): void { this.events.length = 0; }

  clear(): void {
    this.checkpoints.clear(); this.tokens.clear(); this.tasks.clear();
    this.events.length = 0;
  }
}
