// ─── Postgres repository adapters ───────────────────────────────────────────────
// Implement async repository interfaces using IDatabaseClient (Supabase).
// Domain code remains decoupled — it only sees the interface, never Supabase.

import type { IDatabaseClient } from '../DatabaseClient';
import { RepositoryError } from '../../errors/InfrastructureErrors';
import type {
  IAsyncRuntimeRepository, IAsyncWorkflowRepository, IAsyncApprovalRepository,
  IAsyncCheckpointStore, IAsyncMemoryRepository, IAsyncLearningRepository,
  IAsyncTelemetryRepository, IAsyncIdempotencyRepository,
} from '../AsyncRepositoryInterfaces';
import type { IOutboxRepository } from '../../events/OutboxManager';
import type { IAuditLogRepository } from '../../observability/AuditLog';

import type { RuntimeExecution } from '../../../compiler/runtime/models/RuntimeExecution';
import type { WorkflowDefinition, WorkflowExecution } from '../../../compiler/runtime/models/WorkflowModels';
import type { ApprovalRequest } from '../../../compiler/runtime/models/ApprovalModels';
import type { RuntimeCheckpoint, ResumeToken, HumanTask } from '../../../compiler/runtime/models/CheckpointModels';
import type { RuntimeEvent } from '../../../compiler/runtime/models/RuntimeEvent';
import type { MemoryEntry } from '../../../compiler/core/intelligence/memory/models/MemoryEntry';
import type { MemoryQuery } from '../../../compiler/core/intelligence/memory/models/MemoryQuery';
import type { LearningRecord } from '../../../compiler/core/intelligence/learning/models/LearningRecord';
import type { LearningStatus } from '../../../compiler/core/intelligence/learning/models/LearningTypes';
import type { ExecutionTrace } from '../../../compiler/core/intelligence/telemetry/models/ExecutionTrace';
import type { IdempotencyRecord } from '../../../platform/api/services/IdempotencyService';
import type { OutboxEvent, OutboxStatus } from '../../events/OutboxManager';
import type { AuditLogEntry } from '../../observability/AuditLog';

import {
  RuntimeExecutionMapper, WorkflowMapper, ApprovalMapper, CheckpointMapper,
  TelemetryEventMapper, IdempotencyMapper, OutboxEventMapper, AuditLogMapper,
} from '../mappers/DomainMappers';

// ── PostgresRuntimeRepository ───────────────────────────────────────────────────

export class PostgresRuntimeRepository implements IAsyncRuntimeRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async save(execution: RuntimeExecution): Promise<void> {
    const row = RuntimeExecutionMapper.toRow(execution, execution.organizationId);
    const { error } = await this.db.from('runtime_executions').insert(row);
    if (error) throw new RepositoryError(`Failed to save execution: ${error.message}`);
  }

  async findById(executionId: string): Promise<RuntimeExecution | null> {
    const { data, error } = await this.db.from('runtime_executions')
      .select('*').eq('id', executionId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return RuntimeExecutionMapper.fromRow(data as never);
  }

  async findByIdempotencyKey(key: string): Promise<RuntimeExecution | null> {
    const { data, error } = await this.db.from('runtime_executions')
      .select('*').eq('idempotency_key', key).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return RuntimeExecutionMapper.fromRow(data as never);
  }

  async findByOrganization(organizationId: string): Promise<RuntimeExecution[]> {
    const { data, error } = await this.db.from('runtime_executions')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => RuntimeExecutionMapper.fromRow(row as never));
  }

  async update(execution: RuntimeExecution): Promise<boolean> {
    const row = RuntimeExecutionMapper.toRow(execution, execution.organizationId);
    const { error } = await this.db.from('runtime_executions')
      .update(row).eq('id', execution.executionId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }

  async delete(executionId: string): Promise<boolean> {
    const { error } = await this.db.from('runtime_executions')
      .delete().eq('id', executionId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }

  async count(): Promise<number> {
    const { data, error } = await this.db.from('runtime_executions').select('*');
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }
}

// ── PostgresWorkflowRepository ──────────────────────────────────────────────────

export class PostgresWorkflowRepository implements IAsyncWorkflowRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async saveDefinition(def: WorkflowDefinition): Promise<void> {
    const row = WorkflowMapper.toRow(def);
    const { error } = await this.db.from('workflows').insert(row);
    if (error) throw new RepositoryError(`Failed to save workflow: ${error.message}`);
  }

  async findDefinition(workflowId: string): Promise<WorkflowDefinition | null> {
    const { data, error } = await this.db.from('workflows')
      .select('*').eq('id', workflowId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return WorkflowMapper.fromRow(data as never);
  }

  async findDefinitionsByOrganization(organizationId: string): Promise<WorkflowDefinition[]> {
    const { data, error } = await this.db.from('workflows')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => WorkflowMapper.fromRow(row as never));
  }

  async saveExecution(exec: WorkflowExecution): Promise<void> {
    const { error } = await this.db.from('workflow_executions').insert({
      id: exec.workflowExecutionId,
      organization_id: exec.organizationId,
      execution_id: exec.workflowExecutionId,
      workflow_id: exec.workflowId,
      runtime_execution_id: exec.runtimeExecutionId,
      current_step_index: exec.currentStepIndex,
      status: exec.status,
      steps: exec.steps,
      steps_completed: exec.completedStepIds,
      steps_failed: exec.failedStepIds,
      started_at: exec.startedAt,
      completed_at: exec.completedAt,
    });
    if (error) throw new RepositoryError(error.message);
  }

  async findExecution(executionId: string): Promise<WorkflowExecution | null> {
    const { data, error } = await this.db.from('workflow_executions')
      .select('*').eq('execution_id', executionId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      workflowExecutionId: row.execution_id as string,
      organizationId: row.organization_id as string,
      workflowId: row.workflow_id as string,
      runtimeExecutionId: row.runtime_execution_id as string,
      status: row.status as string,
      steps: row.steps as WorkflowExecution['steps'],
      completedStepIds: row.steps_completed as string[],
      failedStepIds: row.steps_failed as string[],
      currentStepIndex: row.current_step_index as number,
      startedAt: row.started_at as string,
      completedAt: row.completed_at as string | null,
    } as WorkflowExecution;
  }

  async updateExecution(exec: WorkflowExecution): Promise<boolean> {
    const { error } = await this.db.from('workflow_executions')
      .update({
        status: exec.status,
        current_step_index: exec.currentStepIndex,
        steps: exec.steps,
        steps_completed: exec.completedStepIds,
        steps_failed: exec.failedStepIds,
        completed_at: exec.completedAt,
      }).eq('execution_id', exec.workflowExecutionId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }
}

// ── PostgresApprovalRepository ──────────────────────────────────────────────────

export class PostgresApprovalRepository implements IAsyncApprovalRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async save(approval: ApprovalRequest): Promise<void> {
    const { error } = await this.db.from('approvals').insert(ApprovalMapper.toRow(approval));
    if (error) throw new RepositoryError(error.message);
  }

  async findById(approvalId: string): Promise<ApprovalRequest | null> {
    const { data, error } = await this.db.from('approvals')
      .select('*').eq('id', approvalId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return ApprovalMapper.fromRow(data as never);
  }

  async findByExecution(executionId: string): Promise<ApprovalRequest[]> {
    const { data, error } = await this.db.from('approvals')
      .select('*').eq('execution_id', executionId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => ApprovalMapper.fromRow(row as never));
  }

  async findPending(organizationId: string): Promise<ApprovalRequest[]> {
    const { data, error } = await this.db.from('approvals')
      .select('*').eq('organization_id', organizationId).eq('status', 'PENDING');
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => ApprovalMapper.fromRow(row as never));
  }

  async update(approval: ApprovalRequest): Promise<boolean> {
    const { error } = await this.db.from('approvals')
      .update(ApprovalMapper.toRow(approval)).eq('id', approval.approvalId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }
}

// ── PostgresCheckpointStore ─────────────────────────────────────────────────────

export class PostgresCheckpointStore implements IAsyncCheckpointStore {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async saveCheckpoint(cp: RuntimeCheckpoint): Promise<void> {
    const { error } = await this.db.from('checkpoints').insert(CheckpointMapper.toRow(cp));
    if (error) throw new RepositoryError(error.message);
  }

  async findCheckpoint(id: string): Promise<RuntimeCheckpoint | null> {
    const { data, error } = await this.db.from('checkpoints')
      .select('*').eq('id', id).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return CheckpointMapper.fromRow(data as never);
  }

  async findCheckpointsByExecution(executionId: string): Promise<RuntimeCheckpoint[]> {
    const { data, error } = await this.db.from('checkpoints')
      .select('*').eq('execution_id', executionId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => CheckpointMapper.fromRow(row as never));
  }

  async saveToken(_token: ResumeToken): Promise<void> { /* simplified */ }
  async findToken(_id: string): Promise<ResumeToken | null> { return null; }
  async updateToken(_token: ResumeToken): Promise<void> { /* simplified */ }

  async saveTask(task: HumanTask): Promise<void> {
    const { error } = await this.db.from('human_tasks').insert({
      id: task.taskId,
      organization_id: task.organizationId,
      execution_id: task.executionId,
      node_id: task.nodeId,
      task_type: task.taskType,
      description: task.description,
      status: task.status,
    });
    if (error) throw new RepositoryError(error.message);
  }

  async findTask(id: string): Promise<HumanTask | null> {
    const { data, error } = await this.db.from('human_tasks')
      .select('*').eq('id', id).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    return (data ?? null) as unknown as HumanTask | null;
  }

  async findPendingTasks(organizationId: string): Promise<HumanTask[]> {
    const { data, error } = await this.db.from('human_tasks')
      .select('*').eq('organization_id', organizationId).eq('status', 'PENDING');
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as HumanTask[];
  }

  async updateTask(task: HumanTask): Promise<void> {
    const { error } = await this.db.from('human_tasks')
      .update({ status: task.status }).eq('id', task.taskId);
    if (error) throw new RepositoryError(error.message);
  }

  async addEvent(event: RuntimeEvent): Promise<void> {
    const orgId = (event as unknown as Record<string, unknown>).organizationId as string ?? 'unknown';
    const { error } = await this.db.from('telemetry_events')
      .insert(TelemetryEventMapper.toRow(event, orgId));
    if (error) throw new RepositoryError(error.message);
  }

  async getEvents(executionId?: string): Promise<RuntimeEvent[]> {
    let query = this.db.from('telemetry_events').select('*');
    if (executionId) query = query.eq('execution_id', executionId);
    const result = await query as unknown as Promise<{ data: unknown[] | null; error: unknown }>;
    const { data, error } = await result;
    if (error) throw new RepositoryError(String(error));
    return (data ?? []).map((row: unknown) => TelemetryEventMapper.fromRow(row as never));
  }
}

// ── PostgresIdempotencyRepository ───────────────────────────────────────────────

export class PostgresIdempotencyRepository implements IAsyncIdempotencyRepository {
  private readonly db: IDatabaseClient;
  private readonly clock: () => number;
  constructor(db: IDatabaseClient, clock?: () => number) {
    this.db = db;
    this.clock = clock ?? (() => Date.now());
  }

  async save(record: IdempotencyRecord): Promise<void> {
    const { error } = await this.db.from('idempotency_records').insert(IdempotencyMapper.toRow(record));
    if (error && error.code !== '23505') throw new RepositoryError(error.message);
  }

  async findByKey(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const { data, error } = await this.db.from('idempotency_records')
      .select('*').eq('organization_id', organizationId).eq('key', key).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    if (new Date(row.expires_at as string).getTime() < this.clock()) {
      await this.delete(IdempotencyMapper.fromRow(row as never));
      return null;
    }
    return IdempotencyMapper.fromRow(row as never);
  }

  async delete(record: IdempotencyRecord): Promise<void> {
    const { error } = await this.db.from('idempotency_records')
      .delete().eq('organization_id', record.organizationId).eq('key', record.idempotencyKey);
    if (error) throw new RepositoryError(error.message);
  }
}

// ── PostgresOutboxRepository ────────────────────────────────────────────────────

export class PostgresOutboxRepository implements IOutboxRepository {
  private readonly db: IDatabaseClient;
  private readonly clock: () => string;
  constructor(db: IDatabaseClient, clock: () => string) {
    this.db = db;
    this.clock = clock;
  }

  async save(event: OutboxEvent): Promise<void> {
    const { error } = await this.db.from('outbox_events').insert(OutboxEventMapper.toRow(event));
    if (error) throw new RepositoryError(error.message);
  }

  async findById(eventId: string): Promise<OutboxEvent | null> {
    const { data, error } = await this.db.from('outbox_events')
      .select('*').eq('id', eventId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return OutboxEventMapper.fromRow(data as never);
  }

  async findPending(limit: number): Promise<OutboxEvent[]> {
    const now = this.clock();
    const { data, error } = await this.db.from('outbox_events')
      .select('*').in('status', ['PENDING', 'FAILED']).lte('next_attempt_at', now).limit(limit);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => OutboxEventMapper.fromRow(row as never));
  }

  async update(event: OutboxEvent): Promise<void> {
    const { error } = await this.db.from('outbox_events')
      .update(OutboxEventMapper.toRow(event)).eq('id', event.id);
    if (error) throw new RepositoryError(error.message);
  }

  async findByOrganization(organizationId: string): Promise<OutboxEvent[]> {
    const { data, error } = await this.db.from('outbox_events')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => OutboxEventMapper.fromRow(row as never));
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    const { data, error } = await this.db.from('outbox_events')
      .select('*').eq('status', status);
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }

  async clear(): Promise<void> { /* no-op */ }
}

// ── PostgresAuditLogRepository ──────────────────────────────────────────────────

export class PostgresAuditLogRepository implements IAuditLogRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async append(entry: AuditLogEntry): Promise<void> {
    const { error } = await this.db.from('audit_logs').insert(AuditLogMapper.toRow(entry));
    if (error) throw new RepositoryError(error.message);
  }

  async findByOrganization(organizationId: string, limit: number, cursor?: string): Promise<{ entries: AuditLogEntry[]; nextCursor: string | null }> {
    let query = this.db.from('audit_logs').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit);
    if (cursor) query = query.lt('created_at', cursor);
    const result = await query as unknown as Promise<{ data: unknown[] | null; error: unknown }>;
    const { data, error } = await result;
    if (error) throw new RepositoryError(String(error));
    const entries = (data ?? []).map((row: unknown) => AuditLogMapper.fromRow(row as never));
    const nextCursor = entries.length === limit ? entries[entries.length - 1]?.auditLogId ?? null : null;
    return { entries, nextCursor };
  }

  async findByActor(organizationId: string, actorId: string, limit: number): Promise<AuditLogEntry[]> {
    const { data, error } = await this.db.from('audit_logs')
      .select('*').eq('organization_id', organizationId).eq('actor_id', actorId)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => AuditLogMapper.fromRow(row as never));
  }

  async findByAction(organizationId: string, action: string, limit: number): Promise<AuditLogEntry[]> {
    const { data, error } = await this.db.from('audit_logs')
      .select('*').eq('organization_id', organizationId).eq('action', action)
      .order('created_at', { ascending: false }).limit(limit);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => AuditLogMapper.fromRow(row as never));
  }

  count(): number { return 0; }
  clear(): void { /* no-op — audit logs are append-only */ }
}

// ── PostgresMemoryRepository ────────────────────────────────────────────────────

export class PostgresMemoryRepository implements IAsyncMemoryRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async save(entry: MemoryEntry): Promise<void> {
    const e = entry as unknown as Record<string, unknown>;
    const { error } = await this.db.from('memory_entries').insert({
      id: e.memoryId as string ?? 'unknown',
      organization_id: e.organizationId as string ?? 'unknown',
      memory_id: e.memoryId as string ?? 'unknown',
      type: String(e.type ?? 'WORKING'),
      scope: String(e.scope ?? 'SESSION'),
      content: entry,
      tags: e.tags ?? [],
      confidence: e.confidence ?? 50,
      expires_at: e.expiresAt ?? null,
    });
    if (error) throw new RepositoryError(error.message);
  }

  async findById(memoryId: string): Promise<MemoryEntry | null> {
    const { data, error } = await this.db.from('memory_entries')
      .select('*').eq('memory_id', memoryId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    if (!data) return null;
    return (data as Record<string, unknown>).content as MemoryEntry;
  }

  async findByOrganization(organizationId: string): Promise<MemoryEntry[]> {
    const { data, error } = await this.db.from('memory_entries')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []).map(row => (row as Record<string, unknown>).content as MemoryEntry);
  }

  async query(query: MemoryQuery): Promise<MemoryEntry[]> {
    return this.findByOrganization(query.organizationId);
  }

  async delete(memoryId: string): Promise<boolean> {
    const { error } = await this.db.from('memory_entries').delete().eq('memory_id', memoryId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }

  async deleteExpired(now: string): Promise<number> {
    const { data, error } = await this.db.from('memory_entries').delete().lt('expires_at', now);
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }

  async deleteByOrganization(organizationId: string): Promise<number> {
    const { data, error } = await this.db.from('memory_entries').delete().eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }

  async count(): Promise<number> {
    const { data, error } = await this.db.from('memory_entries').select('*');
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }
}

// ── PostgresLearningRepository ──────────────────────────────────────────────────

export class PostgresLearningRepository implements IAsyncLearningRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async save(record: LearningRecord): Promise<void> {
    const r = record as unknown as Record<string, unknown>;
    const { error } = await this.db.from('learning_records').insert({
      id: r.recordId as string,
      organization_id: r.organizationId as string ?? 'unknown',
      record_id: r.recordId as string,
      sources: r.sources ?? [],
      patterns: r.patterns ?? [],
      recommendations: r.recommendations ?? [],
      status: String(r.status ?? 'PENDING'),
      version: 1,
    });
    if (error) throw new RepositoryError(error.message);
  }

  async findById(recordId: string): Promise<LearningRecord | null> {
    const { data, error } = await this.db.from('learning_records')
      .select('*').eq('record_id', recordId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    return (data ?? null) as unknown as LearningRecord | null;
  }

  async findByOrganization(organizationId: string): Promise<LearningRecord[]> {
    const { data, error } = await this.db.from('learning_records')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as LearningRecord[];
  }

  async findByStatus(organizationId: string, status: LearningStatus): Promise<LearningRecord[]> {
    const { data, error } = await this.db.from('learning_records')
      .select('*').eq('organization_id', organizationId).eq('status', String(status));
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as LearningRecord[];
  }

  async findAll(): Promise<LearningRecord[]> {
    const { data, error } = await this.db.from('learning_records').select('*');
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as LearningRecord[];
  }

  async update(record: LearningRecord): Promise<boolean> {
    const r = record as unknown as Record<string, unknown>;
    const { error } = await this.db.from('learning_records')
      .update({ status: String(r.status) })
      .eq('record_id', r.recordId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }

  async delete(recordId: string): Promise<boolean> {
    const { error } = await this.db.from('learning_records').delete().eq('record_id', recordId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }

  async count(): Promise<number> {
    const { data, error } = await this.db.from('learning_records').select('*');
    if (error) throw new RepositoryError(error.message);
    return (data ?? []).length;
  }
}

// ── PostgresTelemetryRepository ─────────────────────────────────────────────────

export class PostgresTelemetryRepository implements IAsyncTelemetryRepository {
  private readonly db: IDatabaseClient;
  constructor(db: IDatabaseClient) { this.db = db; }

  async save(trace: ExecutionTrace): Promise<void> {
    const t = trace as unknown as Record<string, unknown>;
    const { error } = await this.db.from('execution_traces').insert({
      id: trace.traceId,
      organization_id: t.organizationId as string ?? 'unknown',
      trace_id: trace.traceId,
      execution_id: trace.executionId,
      stages: trace.stages,
      duration_ms: t.durationMs ?? null,
    });
    if (error) throw new RepositoryError(error.message);
  }

  async findById(traceId: string): Promise<ExecutionTrace | null> {
    const { data, error } = await this.db.from('execution_traces')
      .select('*').eq('trace_id', traceId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    return (data ?? null) as unknown as ExecutionTrace | null;
  }

  async findByExecutionId(executionId: string): Promise<ExecutionTrace | null> {
    const { data, error } = await this.db.from('execution_traces')
      .select('*').eq('execution_id', executionId).maybeSingle();
    if (error) throw new RepositoryError(error.message);
    return (data ?? null) as unknown as ExecutionTrace | null;
  }

  async findByOrganization(organizationId: string): Promise<ExecutionTrace[]> {
    const { data, error } = await this.db.from('execution_traces')
      .select('*').eq('organization_id', organizationId);
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as ExecutionTrace[];
  }

  async findAll(): Promise<ExecutionTrace[]> {
    const { data, error } = await this.db.from('execution_traces').select('*');
    if (error) throw new RepositoryError(error.message);
    return (data as never[] ?? []) as unknown as ExecutionTrace[];
  }

  async delete(traceId: string): Promise<boolean> {
    const { error } = await this.db.from('execution_traces').delete().eq('trace_id', traceId);
    if (error) throw new RepositoryError(error.message);
    return true;
  }
}
