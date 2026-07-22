// ─── Runtime interfaces ─────────────────────────────────────────────────────────
// Integration contracts for the runtime — coordinates existing engines via interfaces.

import type { RuntimeRequest } from '../models/RuntimeRequest';
import type { RuntimeResult } from '../models/RuntimeResult';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { RuntimeCheckpoint } from '../models/CheckpointModels';
import type { ResumeToken } from '../models/CheckpointModels';
import type { HumanTask } from '../models/CheckpointModels';
import type { WorkflowDefinition } from '../models/WorkflowModels';
import type { WorkflowExecution } from '../models/WorkflowModels';
import type { ApprovalRequest } from '../models/ApprovalModels';
import type { ApprovalDecision } from '../models/ApprovalModels';
import type { RuntimeEvent } from '../models/RuntimeEvent';
import type { RuntimeStatus } from '../models/RuntimeModels';

import type { ICompilerIntelligenceOrchestrator } from '../../core/intelligence/orchestrator/interfaces/ICompilerIntelligenceOrchestrator';
import type { ITelemetryEngine } from '../../core/intelligence/telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../core/intelligence/memory/interfaces/IMemoryEngine';
import type { IToolIntelligenceEngine } from '../../core/intelligence/tools/interfaces/IToolIntelligenceEngine';
import type { IExecutionEngine } from '../../core/intelligence/execution/interfaces/IExecutionEngine';
import type { ILearningEngine } from '../../core/intelligence/learning/interfaces/ILearningEngine';

export interface CompilerRuntimeDeps {
  idGenerator:  () => string;
  clock:        () => string;
  /** Intelligence orchestrator — runs the 5-stage pipeline. */
  orchestrator: ICompilerIntelligenceOrchestrator;
  /** Optional telemetry engine for trace recording. */
  telemetry:    ITelemetryEngine | null;
  /** Optional memory engine for pipeline memory. */
  memory:       IMemoryEngine | null;
  /** Optional tool intelligence engine. */
  tools:        IToolIntelligenceEngine | null;
  /** Optional execution engine. */
  execution:    IExecutionEngine | null;
  /** Optional learning engine. */
  learning:     ILearningEngine | null;
}

// ── Repository interfaces ───────────────────────────────────────────────────────

export interface IRuntimeRepository {
  save(execution: RuntimeExecution): void;
  findById(executionId: string): RuntimeExecution | null;
  findByIdempotencyKey(key: string): RuntimeExecution | null;
  findByOrganization(organizationId: string): RuntimeExecution[];
  update(execution: RuntimeExecution): boolean;
  delete(executionId: string): boolean;
  count(): number;
  clear(): void;
}

export interface IWorkflowRepository {
  saveDefinition(def: WorkflowDefinition): void;
  findDefinition(workflowId: string): WorkflowDefinition | null;
  findDefinitionsByOrganization(organizationId: string): WorkflowDefinition[];
  saveExecution(exec: WorkflowExecution): void;
  findExecution(executionId: string): WorkflowExecution | null;
  updateExecution(exec: WorkflowExecution): boolean;
  clear(): void;
}

export interface IApprovalRepository {
  save(approval: ApprovalRequest): void;
  findById(approvalId: string): ApprovalRequest | null;
  findByExecution(executionId: string): ApprovalRequest[];
  findPending(organizationId: string): ApprovalRequest[];
  update(approval: ApprovalRequest): boolean;
  clear(): void;
}

export interface ICheckpointStore {
  saveCheckpoint(cp: RuntimeCheckpoint): void;
  findCheckpoint(id: string): RuntimeCheckpoint | null;
  findCheckpointsByExecution(executionId: string): RuntimeCheckpoint[];
  saveToken(token: ResumeToken): void;
  findToken(id: string): ResumeToken | null;
  updateToken(token: ResumeToken): void;
  saveTask(task: HumanTask): void;
  findTask(id: string): HumanTask | null;
  findPendingTasks(organizationId: string): HumanTask[];
  updateTask(task: HumanTask): void;
  addEvent(event: RuntimeEvent): void;
  getEvents(executionId?: string): RuntimeEvent[];
  clear(): void;
}

// ── Runtime services ────────────────────────────────────────────────────────────

export interface IRuntimeRequestValidator {
  validate(request: RuntimeRequest): { valid: boolean; errors: string[] };
}

export interface IRuntimeStateManager {
  getStatus(executionId: string): RuntimeStatus | null;
  setStatus(executionId: string, status: RuntimeStatus): void;
  isTerminal(status: RuntimeStatus): boolean;
  canTransition(from: RuntimeStatus, to: RuntimeStatus): boolean;
}

export interface IRuntimeResultBuilder {
  build(execution: RuntimeExecution, events: RuntimeEvent[], intelligenceResult: RuntimeResult['intelligenceResult'], errors: string[], warnings: string[]): RuntimeResult;
}

export interface IRuntimeCoordinator {
  execute(request: RuntimeRequest): Promise<RuntimeResult>;
  pause(executionId: string): boolean;
  resume(resumeToken: ResumeToken): Promise<RuntimeResult>;
  cancel(executionId: string): Promise<RuntimeResult | null>;
  getExecution(executionId: string): RuntimeExecution | null;
}

// ── Workflow services ───────────────────────────────────────────────────────────

export interface IWorkflowDefinitionValidator {
  validate(definition: WorkflowDefinition): { valid: boolean; errors: string[] };
}

export interface IWorkflowGraphBuilder {
  buildFromRequest(request: RuntimeRequest): WorkflowDefinition;
  buildDefaultPipeline(organizationId: string): WorkflowDefinition;
}

export interface IWorkflowScheduler {
  schedule(definition: WorkflowDefinition, mode: 'SEQUENTIAL' | 'DAG'): string[][];
  /** Get the next executable nodes given completed nodes. */
  getNextNodes(definition: WorkflowDefinition, completedNodeIds: Set<string>): string[];
}

export interface IWorkflowRunner {
  run(execution: RuntimeExecution, definition: WorkflowDefinition, context: WorkflowRunContext): Promise<WorkflowExecution>;
}

export interface IWorkflowResumeManager {
  resume(execution: RuntimeExecution, definition: WorkflowDefinition, checkpoint: RuntimeCheckpoint, context: WorkflowRunContext): Promise<WorkflowExecution>;
  createResumeToken(executionId: string, organizationId: string, checkpoint: RuntimeCheckpoint): ResumeToken;
}

export interface IWorkflowCancellationManager {
  cancel(execution: RuntimeExecution, context: WorkflowRunContext): Promise<RuntimeExecution>;
}

export interface WorkflowRunContext {
  runtime: CompilerRuntimeDeps;
  request: RuntimeRequest;
  events: RuntimeEvent[];
  checkpoints: RuntimeCheckpoint[];
  approvalManager: IApprovalManager;
}

// ── Approval services ───────────────────────────────────────────────────────────

export interface IApprovalManager {
  requestApproval(req: Omit<ApprovalRequest, 'approvalId' | 'status' | 'decision' | 'createdAt'>): ApprovalRequest;
  submitDecision(approvalId: string, decision: ApprovalDecision): ApprovalRequest;
  getApproval(approvalId: string): ApprovalRequest | null;
  getPendingApprovals(organizationId: string): ApprovalRequest[];
}

export interface IApprovalPolicyEvaluator {
  evaluate(node: WorkflowDefinition['nodes'][number], context: { riskLevel: string; confidenceScore: number; confidenceThreshold: number }): { requiresApproval: boolean; reason: string | null };
}

export interface IHumanTaskManager {
  createTask(task: Omit<HumanTask, 'taskId' | 'status' | 'createdAt' | 'completedAt'>): HumanTask;
  completeTask(taskId: string, result: Record<string, unknown>): HumanTask;
  getTask(taskId: string): HumanTask | null;
  getPendingTasks(organizationId: string): HumanTask[];
}
