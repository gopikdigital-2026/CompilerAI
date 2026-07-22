// ─── Application services ───────────────────────────────────────────────────────
// Bridge between controllers and CompilerRuntime — no business logic duplication.

import type { CompilerRuntime } from '../../../compiler/runtime/services/CompilerRuntime';
import type { RuntimeRequest } from '../../../compiler/runtime/models/RuntimeRequest';
import type { RuntimeResult } from '../../../compiler/runtime/models/RuntimeResult';
import type { RuntimeExecution } from '../../../compiler/runtime/models/RuntimeExecution';
import type { RuntimeEvent } from '../../../compiler/runtime/models/RuntimeEvent';
import type { WorkflowDefinition } from '../../../compiler/runtime/models/WorkflowModels';
import type { ApprovalRequest, ApprovalDecision, ApprovalDecisionType } from '../../../compiler/runtime/models/ApprovalModels';
import type { ResumeToken } from '../../../compiler/runtime/models/CheckpointModels';
import type { CreateExecutionRequestDto, CreateWorkflowRequestDto } from '../dto/ApiDtos';
import type { CompilerIntelligenceRequest } from '../../../compiler/core/intelligence/orchestrator/models/CompilerIntelligenceModels';
import { computeContentHash } from '../../../compiler/runtime/policies/RuntimePolicies';

export class ExecutionApplicationService {
  private readonly runtime: CompilerRuntime;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(runtime: CompilerRuntime, idGenerator: () => string, clock: () => string) {
    this.runtime = runtime;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  async createExecution(dto: CreateExecutionRequestDto, organizationId: string, actorId: string): Promise<RuntimeResult> {
    const intelRequest: CompilerIntelligenceRequest = {
      contextRequest: {
        requestId: this.idGenerator(),
        prompt: (dto.input.prompt as string) ?? 'Execute workflow',
        organizationId,
        userId: actorId,
        locale: 'en',
        receivedAt: Date.now(),
      },
      memory: {
        organizationId,
        workingMemory: [], sessionMemory: [], organizationMemory: [],
        semanticMemory: [], executionMemory: [],
      } as never,
      riskTolerance: 'MEDIUM',
      minimumConfidenceThreshold: 50,
    };

    const runtimeReq: RuntimeRequest = {
      requestId: this.idGenerator(),
      organizationId,
      userId: actorId,
      intelligenceRequest: intelRequest,
      riskTolerance: 'MEDIUM',
      minimumConfidenceThreshold: 50,
      idempotencyKey: dto.idempotencyKey,
      maxDurationMs: 60_000,
      allowRollback: true,
      requireApproval: false,
      locale: 'en',
      metadata: dto.metadata ?? {},
      receivedAt: this.clock(),
    };

    return this.runtime.execute(runtimeReq);
  }

  getExecution(executionId: string, organizationId: string): RuntimeExecution | null {
    const exec = this.runtime.getExecution(executionId);
    if (!exec) return null;
    if (exec.organizationId !== organizationId) return null;
    return exec;
  }

  getResultFromExecution(exec: RuntimeExecution): RuntimeResult {
    const events = this.runtime.getEvents(exec.executionId);
    return {
      executionId: exec.executionId,
      requestId: exec.requestId,
      organizationId: exec.organizationId,
      status: exec.status,
      intelligenceResult: null,
      execution: exec,
      events,
      warnings: exec.warnings,
      errors: exec.errorMessage ? [exec.errorMessage] : [],
      startedAt: exec.startedAt,
      completedAt: exec.completedAt ?? this.clock(),
      durationMs: 0,
      version: '1.0.0',
    };
  }

  pause(executionId: string): boolean {
    return this.runtime.pause(executionId);
  }

  async resume(resumeToken: string): Promise<RuntimeResult> {
    const token: ResumeToken = JSON.parse(resumeToken);
    return this.runtime.resume(token);
  }

  async cancel(executionId: string, _reason: string): Promise<RuntimeResult | null> {
    return this.runtime.cancel(executionId);
  }

  getEvents(executionId: string): RuntimeEvent[] {
    return this.runtime.getEvents(executionId);
  }
}

export class WorkflowApplicationService {
  private readonly workflows = new Map<string, WorkflowDefinition[]>();
  private readonly activeVersions = new Map<string, number>();
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  createWorkflow(dto: CreateWorkflowRequestDto, organizationId: string): WorkflowDefinition {
    const workflowId = this.idGenerator();
    const def: WorkflowDefinition = {
      workflowId, organizationId,
      name: dto.name, description: dto.description,
      nodes: dto.nodes.map(n => ({
        nodeId: n.nodeId, type: n.type as WorkflowDefinition['nodes'][number]['type'],
        label: n.label, order: n.order, config: {}, dependsOn: n.dependsOn,
        condition: null, branches: [], requiresApproval: n.requiresApproval,
        maxRetries: 2, timeoutMs: 30_000,
      })),
      edges: dto.edges.map((e, i) => ({ edgeId: `e${i}`, ...e })),
      mode: dto.mode, version: '1', createdAt: this.clock(), contentHash: '',
    };
    def.contentHash = computeContentHash(def);
    this.workflows.set(workflowId, [def]);
    this.activeVersions.set(workflowId, 0);
    return def;
  }

  createVersion(workflowId: string, dto: CreateWorkflowRequestDto, organizationId: string): WorkflowDefinition {
    const versions = this.workflows.get(workflowId);
    if (!versions) throw Object.assign(new Error('Workflow not found'), { code: 'WORKFLOW_NOT_FOUND', httpStatus: 404 });
    const latest = versions[versions.length - 1];
    if (latest.organizationId !== organizationId) throw Object.assign(new Error('Workflow not found'), { code: 'WORKFLOW_NOT_FOUND', httpStatus: 404 });
    const newVersion: WorkflowDefinition = {
      ...latest,
      version: String(parseInt(latest.version, 10) + 1),
      name: dto.name, description: dto.description,
      nodes: dto.nodes.map(n => ({
        nodeId: n.nodeId, type: n.type as WorkflowDefinition['nodes'][number]['type'],
        label: n.label, order: n.order, config: {}, dependsOn: n.dependsOn,
        condition: null, branches: [], requiresApproval: n.requiresApproval,
        maxRetries: 2, timeoutMs: 30_000,
      })),
      edges: dto.edges.map((e, i) => ({ edgeId: `e${i}`, ...e })),
      mode: dto.mode, createdAt: this.clock(), contentHash: '',
    };
    newVersion.contentHash = computeContentHash(newVersion);
    versions.push(newVersion);
    return newVersion;
  }

  getWorkflow(workflowId: string, organizationId: string): WorkflowDefinition | null {
    const versions = this.workflows.get(workflowId);
    if (!versions) return null;
    const latest = versions[versions.length - 1];
    if (latest.organizationId !== organizationId) return null;
    return latest;
  }

  listWorkflows(organizationId: string): WorkflowDefinition[] {
    const result: WorkflowDefinition[] = [];
    for (const versions of this.workflows.values()) {
      const latest = versions[versions.length - 1];
      if (latest.organizationId === organizationId) result.push(latest);
    }
    return result;
  }

  validateWorkflow(dto: CreateWorkflowRequestDto): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!dto.name) errors.push('name is required.');
    if (!dto.nodes || dto.nodes.length === 0) errors.push('nodes must be non-empty.');
    for (const node of dto.nodes ?? []) {
      if (!node.nodeId) errors.push('Each node must have a nodeId.');
    }
    return { valid: errors.length === 0, errors };
  }

  activateVersion(workflowId: string, version: string, organizationId: string): boolean {
    const versions = this.workflows.get(workflowId);
    if (!versions) return false;
    const idx = versions.findIndex(v => v.version === version);
    if (idx < 0) return false;
    if (versions[idx].organizationId !== organizationId) return false;
    this.activeVersions.set(workflowId, idx);
    return true;
  }

  deactivate(workflowId: string, organizationId: string): boolean {
    const versions = this.workflows.get(workflowId);
    if (!versions) return false;
    if (versions[0].organizationId !== organizationId) return false;
    this.activeVersions.delete(workflowId);
    return true;
  }

  isActive(workflowId: string): boolean {
    return this.activeVersions.has(workflowId);
  }
}

export class ApprovalApplicationService {
  private readonly runtime: CompilerRuntime;
  private readonly decisionIdGen: () => string;

  constructor(runtime: CompilerRuntime, decisionIdGen?: () => string) {
    this.runtime = runtime;
    this.decisionIdGen = decisionIdGen ?? (() => `dec-${Math.random().toString(36).slice(2)}`);
  }

  getPendingApprovals(organizationId: string): ApprovalRequest[] {
    return this.runtime.getCoordinator().getApprovalManager().getPendingApprovals(organizationId);
  }

  getApproval(approvalId: string): ApprovalRequest | null {
    return this.runtime.getCoordinator().getApprovalManager().getApproval(approvalId);
  }

  decide(approvalId: string, decision: ApprovalDecisionType, reviewedBy: string, comment: string): ApprovalRequest {
    const approval = this.getApproval(approvalId);
    if (!approval) throw Object.assign(new Error('Approval not found'), { code: 'APPROVAL_NOT_FOUND', httpStatus: 404 });
    if (approval.status !== 'PENDING') throw Object.assign(new Error('Approval already resolved'), { code: 'INVALID_EXECUTION_STATE', httpStatus: 409 });

    const decisionRecord: ApprovalDecision = {
      decisionId: this.decisionIdGen(),
      approvalId,
      decision,
      reviewedBy,
      comment,
      decidedAt: new Date().toISOString(),
      requestedChanges: decision === 'CHANGES_REQUESTED' ? [comment] : [],
    };
    return this.runtime.getCoordinator().getApprovalManager().submitDecision(approvalId, decisionRecord);
  }
}

export class TelemetryApplicationService {
  private readonly runtime: CompilerRuntime;

  constructor(runtime: CompilerRuntime) {
    this.runtime = runtime;
  }

  getEvents(executionId: string): RuntimeEvent[] {
    return this.runtime.getEvents(executionId);
  }
}

export class CapabilityApplicationService {
  getCapabilities(): Record<string, unknown> {
    return {
      engines: ['context', 'intent', 'planning', 'decision', 'confidence', 'telemetry', 'memory', 'tools', 'execution', 'learning', 'runtime'],
      nodeTypes: ['INTELLIGENCE', 'MEMORY_READ', 'MEMORY_WRITE', 'TOOL_SELECTION', 'TOOL_EXECUTION', 'HUMAN_APPROVAL', 'CONDITION', 'PARALLEL', 'JOIN', 'LEARNING', 'FINALIZATION'],
      toolTypes: ['SIMULATED'],
      runtimeStatuses: ['CREATED', 'VALIDATING', 'RUNNING', 'WAITING_FOR_APPROVAL', 'PAUSED', 'RESUMING', 'COMPLETED', 'PARTIAL', 'BLOCKED', 'CANCELLED', 'FAILED'],
      apiVersion: 'v1',
      runtimeVersion: '1.0.0',
      features: {
        idempotency: true,
        checkpoints: true,
        humanApproval: true,
        compensation: true,
        rateLimiting: true,
        pagination: true,
      },
    };
  }
}
