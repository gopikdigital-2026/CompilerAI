// ─── Async repository interfaces for persistence layer ──────────────────────────
// Domain interfaces are synchronous (for in-memory). Persistent adapters need async.
// These interfaces mirror the domain ones but return Promises.

import type { RuntimeExecution } from '../../compiler/runtime/models/RuntimeExecution';
import type { WorkflowDefinition, WorkflowExecution } from '../../compiler/runtime/models/WorkflowModels';
import type { ApprovalRequest } from '../../compiler/runtime/models/ApprovalModels';
import type { RuntimeCheckpoint, ResumeToken, HumanTask } from '../../compiler/runtime/models/CheckpointModels';
import type { RuntimeEvent } from '../../compiler/runtime/models/RuntimeEvent';
import type { MemoryEntry } from '../../compiler/core/intelligence/memory/models/MemoryEntry';
import type { MemoryQuery } from '../../compiler/core/intelligence/memory/models/MemoryQuery';
import type { LearningRecord } from '../../compiler/core/intelligence/learning/models/LearningRecord';
import type { LearningStatus } from '../../compiler/core/intelligence/learning/models/LearningTypes';
import type { ExecutionTrace } from '../../compiler/core/intelligence/telemetry/models/ExecutionTrace';
import type { IdempotencyRecord } from '../../platform/api/services/IdempotencyService';

export interface IAsyncRuntimeRepository {
  save(execution: RuntimeExecution): Promise<void>;
  findById(executionId: string): Promise<RuntimeExecution | null>;
  findByIdempotencyKey(key: string): Promise<RuntimeExecution | null>;
  findByOrganization(organizationId: string): Promise<RuntimeExecution[]>;
  update(execution: RuntimeExecution): Promise<boolean>;
  delete(executionId: string): Promise<boolean>;
  count(): Promise<number>;
}

export interface IAsyncWorkflowRepository {
  saveDefinition(def: WorkflowDefinition): Promise<void>;
  findDefinition(workflowId: string): Promise<WorkflowDefinition | null>;
  findDefinitionsByOrganization(organizationId: string): Promise<WorkflowDefinition[]>;
  saveExecution(exec: WorkflowExecution): Promise<void>;
  findExecution(executionId: string): Promise<WorkflowExecution | null>;
  updateExecution(exec: WorkflowExecution): Promise<boolean>;
}

export interface IAsyncApprovalRepository {
  save(approval: ApprovalRequest): Promise<void>;
  findById(approvalId: string): Promise<ApprovalRequest | null>;
  findByExecution(executionId: string): Promise<ApprovalRequest[]>;
  findPending(organizationId: string): Promise<ApprovalRequest[]>;
  update(approval: ApprovalRequest): Promise<boolean>;
}

export interface IAsyncCheckpointStore {
  saveCheckpoint(cp: RuntimeCheckpoint): Promise<void>;
  findCheckpoint(id: string): Promise<RuntimeCheckpoint | null>;
  findCheckpointsByExecution(executionId: string): Promise<RuntimeCheckpoint[]>;
  saveToken(token: ResumeToken): Promise<void>;
  findToken(id: string): Promise<ResumeToken | null>;
  updateToken(token: ResumeToken): Promise<void>;
  saveTask(task: HumanTask): Promise<void>;
  findTask(id: string): Promise<HumanTask | null>;
  findPendingTasks(organizationId: string): Promise<HumanTask[]>;
  updateTask(task: HumanTask): Promise<void>;
  addEvent(event: RuntimeEvent): Promise<void>;
  getEvents(executionId?: string): Promise<RuntimeEvent[]>;
}

export interface IAsyncMemoryRepository {
  save(entry: MemoryEntry): Promise<void>;
  findById(memoryId: string): Promise<MemoryEntry | null>;
  findByOrganization(organizationId: string): Promise<MemoryEntry[]>;
  query(query: MemoryQuery): Promise<MemoryEntry[]>;
  delete(memoryId: string): Promise<boolean>;
  deleteExpired(now: string): Promise<number>;
  deleteByOrganization(organizationId: string): Promise<number>;
  count(): Promise<number>;
}

export interface IAsyncLearningRepository {
  save(record: LearningRecord): Promise<void>;
  findById(recordId: string): Promise<LearningRecord | null>;
  findByOrganization(organizationId: string): Promise<LearningRecord[]>;
  findByStatus(organizationId: string, status: LearningStatus): Promise<LearningRecord[]>;
  findAll(): Promise<LearningRecord[]>;
  update(record: LearningRecord): Promise<boolean>;
  delete(recordId: string): Promise<boolean>;
  count(): Promise<number>;
}

export interface IAsyncTelemetryRepository {
  save(trace: ExecutionTrace): Promise<void>;
  findById(traceId: string): Promise<ExecutionTrace | null>;
  findByExecutionId(executionId: string): Promise<ExecutionTrace | null>;
  findByOrganization(organizationId: string): Promise<ExecutionTrace[]>;
  findAll(): Promise<ExecutionTrace[]>;
  delete(traceId: string): Promise<boolean>;
}

export interface IAsyncIdempotencyRepository {
  save(record: IdempotencyRecord): Promise<void>;
  findByKey(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  delete(record: IdempotencyRecord): Promise<void>;
}
