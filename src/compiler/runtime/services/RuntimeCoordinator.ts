// ─── RuntimeCoordinator ─────────────────────────────────────────────────────────
// Coordinates the full runtime execution: validate → intelligence → workflow → result.

import type { IRuntimeCoordinator, CompilerRuntimeDeps, WorkflowRunContext } from '../interfaces/RuntimeInterfaces';
import type { RuntimeRequest } from '../models/RuntimeRequest';
import type { RuntimeResult } from '../models/RuntimeResult';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { RuntimeEvent } from '../models/RuntimeEvent';
import type { RuntimeCheckpoint } from '../models/CheckpointModels';
import type { ResumeToken } from '../models/CheckpointModels';
import type { CompilerIntelligenceResult } from '../../core/intelligence/orchestrator/models/CompilerIntelligenceModels';
import { RuntimeRequestValidator } from './RuntimeRequestValidator';
import { RuntimeStateManager } from './RuntimeStateManager';
import { RuntimeResultBuilder } from './RuntimeResultBuilder';
import { RuntimeEventBus } from '../events/RuntimeEventBus';
import { WorkflowEngine } from '../workflow/WorkflowEngine';
import { WorkflowResumeManager } from '../workflow/WorkflowResumeManager';
import { WorkflowCancellationManager } from '../workflow/WorkflowCancellationManager';
import { ApprovalManager } from './ApprovalManager';
import { HumanTaskManager } from './HumanTaskManager';
import { IdempotencyDuplicateError, RuntimeValidationError } from '../errors/RuntimeErrors';
import type { InMemoryRuntimeRepository, InMemoryWorkflowRepository, InMemoryApprovalRepository, InMemoryCheckpointStore } from '../repositories/InMemoryRepositories';

const VERSION = '1.0.0';

export class RuntimeCoordinator implements IRuntimeCoordinator {
  private readonly deps: CompilerRuntimeDeps;
  private readonly requestValidator: RuntimeRequestValidator;
  private readonly stateManager: RuntimeStateManager;
  private readonly resultBuilder: RuntimeResultBuilder;
  private readonly eventBus: RuntimeEventBus;
  private readonly workflowEngine: WorkflowEngine;
  private readonly resumeManager: WorkflowResumeManager;
  private readonly cancellationManager: WorkflowCancellationManager;
  private readonly approvalManager: ApprovalManager;
  private readonly humanTaskManager: HumanTaskManager;
  private readonly runtimeRepo: InMemoryRuntimeRepository;
  private readonly checkpointStore: InMemoryCheckpointStore;

  constructor(
    deps: CompilerRuntimeDeps,
    runtimeRepo: InMemoryRuntimeRepository,
    workflowRepo: InMemoryWorkflowRepository,
    approvalRepo: InMemoryApprovalRepository,
    checkpointStore: InMemoryCheckpointStore,
  ) {
    this.deps = deps;
    this.runtimeRepo = runtimeRepo;
    this.checkpointStore = checkpointStore;

    this.requestValidator = new RuntimeRequestValidator();
    this.stateManager = new RuntimeStateManager();
    this.resultBuilder = new RuntimeResultBuilder(deps.clock);
    this.eventBus = new RuntimeEventBus(deps.idGenerator, deps.clock, deps.telemetry);
    this.workflowEngine = new WorkflowEngine(workflowRepo, deps.idGenerator, deps.clock);
    this.resumeManager = new WorkflowResumeManager(deps.idGenerator, deps.clock);
    this.cancellationManager = new WorkflowCancellationManager(deps.idGenerator, deps.clock);
    this.approvalManager = new ApprovalManager(approvalRepo, deps.idGenerator, deps.clock);
    this.humanTaskManager = new HumanTaskManager(checkpointStore, deps.idGenerator, deps.clock);
  }

  async execute(request: RuntimeRequest): Promise<RuntimeResult> {
    // Validate request
    const validation = this.requestValidator.validate(request);
    if (!validation.valid) {
      throw new RuntimeValidationError(`Invalid runtime request: ${validation.errors.join('; ')}`);
    }

    // Idempotency check
    const existing = this.runtimeRepo.findByIdempotencyKey(request.idempotencyKey);
    if (existing) {
      throw new IdempotencyDuplicateError(request.idempotencyKey);
    }

    // Create execution
    const executionId = this.deps.idGenerator();
    const execution: RuntimeExecution = {
      executionId,
      requestId: request.requestId,
      organizationId: request.organizationId,
      idempotencyKey: request.idempotencyKey,
      status: 'CREATED',
      workflowExecution: null,
      checkpoints: [],
      nodeResults: {},
      rollbackTriggered: false,
      startedAt: this.deps.clock(),
      completedAt: null,
      errorMessage: null,
      warnings: [],
      version: VERSION,
    };
    this.runtimeRepo.save(execution);
    this.stateManager.setStatus(executionId, 'CREATED');

    const events: RuntimeEvent[] = [];
    const checkpoints: RuntimeCheckpoint[] = [];
    const errors: string[] = [];
    const warnings: string[] = [...request.intelligenceRequest ? [] : ['No intelligence request provided.']];

    // Emit started
    this.eventBus.emit('RuntimeStarted', executionId, request.organizationId, `Runtime started for request ${request.requestId}.`);

    // Validate
    this.stateManager.setStatus(executionId, 'VALIDATING');
    execution.status = 'VALIDATING';

    // Build workflow definition
    const definition = this.workflowEngine.buildDefaultPipeline(request.organizationId);
    const defValidation = this.workflowEngine.validateDefinition(definition);
    if (!defValidation.valid) {
      errors.push(...defValidation.errors);
      execution.status = 'FAILED';
      execution.errorMessage = 'Workflow validation failed.';
      execution.completedAt = this.deps.clock();
      this.runtimeRepo.update(execution);
      return this.buildResult(execution, events, null, errors, warnings);
    }

    // Run intelligence pipeline
    this.stateManager.setStatus(executionId, 'RUNNING');
    execution.status = 'RUNNING';

    let intelligenceResult: CompilerIntelligenceResult | null = null;
    try {
      intelligenceResult = await this.deps.orchestrator.execute(request.intelligenceRequest);
      execution.nodeResults['intelligence'] = { status: intelligenceResult.status, executionId: intelligenceResult.executionId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Intelligence pipeline failed: ${msg}`);
      execution.status = 'FAILED';
      execution.errorMessage = msg;
      execution.completedAt = this.deps.clock();
      this.runtimeRepo.update(execution);
      this.eventBus.emit('RuntimeFailed', executionId, request.organizationId, `Runtime failed: ${msg}.`);
      return this.buildResult(execution, this.eventBus.getEvents(executionId), null, errors, warnings);
    }

    // Run workflow
    const runContext: WorkflowRunContext = {
      runtime: this.deps,
      request,
      events,
      checkpoints,
      approvalManager: this.approvalManager,
    };

    this.eventBus.emit('WorkflowStarted', executionId, request.organizationId, 'Workflow execution started.');

    try {
      const wfExec = await this.workflowEngine.runWorkflow(execution, definition, runContext);
      execution.workflowExecution = wfExec;
      execution.checkpoints = checkpoints;

      if (wfExec.status === 'COMPLETED') {
        execution.status = 'COMPLETED';
        this.eventBus.emit('WorkflowCompleted', executionId, request.organizationId, 'Workflow completed successfully.');
        this.eventBus.emit('RuntimeCompleted', executionId, request.organizationId, 'Runtime execution completed.');
      } else if (wfExec.status === 'PARTIAL') {
        execution.status = 'PARTIAL';
        warnings.push('Workflow completed with partial failures.');
        this.eventBus.emit('RuntimeCompleted', executionId, request.organizationId, 'Runtime completed with partial results.');
      } else if (wfExec.status === 'FAILED') {
        execution.status = 'FAILED';
        errors.push('Workflow execution failed.');
        execution.errorMessage = 'Workflow execution failed.';
        this.eventBus.emit('RuntimeFailed', executionId, request.organizationId, 'Runtime failed during workflow execution.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Workflow execution error: ${msg}`);
      execution.status = 'FAILED';
      execution.errorMessage = msg;
      this.eventBus.emit('RuntimeFailed', executionId, request.organizationId, `Runtime failed: ${msg}.`);
    }

    execution.completedAt = this.deps.clock();
    this.runtimeRepo.update(execution);

    // Store events
    for (const ev of this.eventBus.getEvents(executionId)) {
      this.checkpointStore.addEvent(ev);
    }
    for (const ev of events) {
      this.checkpointStore.addEvent(ev);
    }

    return this.buildResult(execution, [...this.eventBus.getEvents(executionId), ...events], intelligenceResult, errors, warnings);
  }

  pause(executionId: string): boolean {
    const exec = this.runtimeRepo.findById(executionId);
    if (!exec) return false;
    if (!this.stateManager.canTransition(exec.status, 'PAUSED')) return false;
    this.stateManager.setStatus(executionId, 'PAUSED');
    exec.status = 'PAUSED';
    this.runtimeRepo.update(exec);
    this.eventBus.emit('RuntimePaused', executionId, exec.organizationId, 'Execution paused.');
    return true;
  }

  async resume(resumeToken: ResumeToken): Promise<RuntimeResult> {
    const exec = this.runtimeRepo.findById(resumeToken.executionId);
    if (!exec) throw new RuntimeValidationError(`Execution ${resumeToken.executionId} not found.`);

    // Validate token
    const checkpoint = this.checkpointStore.findCheckpoint(resumeToken.checkpointId);
    if (!checkpoint) throw new RuntimeValidationError(`Checkpoint ${resumeToken.checkpointId} not found.`);

    this.resumeManager.validateToken(resumeToken, checkpoint.contentHash);

    this.stateManager.setStatus(exec.executionId, 'RESUMING');
    exec.status = 'RESUMING';
    this.runtimeRepo.update(exec);
    this.eventBus.emit('RuntimeResumed', exec.executionId, exec.organizationId, 'Execution resumed.');

    // Rebuild definition
    const definition = this.workflowEngine.buildDefaultPipeline(exec.organizationId);

    const events: RuntimeEvent[] = [];
    const checkpoints: RuntimeCheckpoint[] = [...exec.checkpoints];
    const runContext: WorkflowRunContext = {
      runtime: this.deps,
      request: { organizationId: exec.organizationId } as RuntimeRequest,
      events, checkpoints,
      approvalManager: this.approvalManager,
    };

    const wfExec = await this.resumeManager.resume(exec, definition, checkpoint, runContext);
    exec.workflowExecution = wfExec;
    exec.checkpoints = checkpoints;

    if (wfExec.status === 'COMPLETED') {
      exec.status = 'COMPLETED';
      this.eventBus.emit('RuntimeCompleted', exec.executionId, exec.organizationId, 'Execution completed after resume.');
    } else if (wfExec.status === 'PARTIAL') {
      exec.status = 'PARTIAL';
    } else {
      exec.status = 'FAILED';
    }

    exec.completedAt = this.deps.clock();
    this.runtimeRepo.update(exec);

    // Consume token
    resumeToken.consumed = true;
    this.checkpointStore.updateToken(resumeToken);

    return this.buildResult(exec, this.eventBus.getEvents(exec.executionId), null, [], []);
  }

  async cancel(executionId: string): Promise<RuntimeResult | null> {
    const exec = this.runtimeRepo.findById(executionId);
    if (!exec) return null;
    if (this.stateManager.isTerminal(exec.status)) return null;

    const events: RuntimeEvent[] = [];
    const checkpoints: RuntimeCheckpoint[] = [...exec.checkpoints];
    const runContext: WorkflowRunContext = {
      runtime: this.deps,
      request: { organizationId: exec.organizationId } as RuntimeRequest,
      events, checkpoints,
      approvalManager: this.approvalManager,
    };

    const cancelled = await this.cancellationManager.cancel(exec, runContext);
    this.runtimeRepo.update(cancelled);
    this.stateManager.setStatus(executionId, 'CANCELLED');
    this.eventBus.emit('RuntimeCancelled', executionId, exec.organizationId, 'Execution cancelled.');

    return this.buildResult(cancelled, this.eventBus.getEvents(executionId), null, [], ['Execution cancelled.']);
  }

  getExecution(executionId: string): RuntimeExecution | null {
    return this.runtimeRepo.findById(executionId);
  }

  // ── Accessors for tests ──────────────────────────────────────────────────────

  getApprovalManager(): ApprovalManager { return this.approvalManager; }
  getHumanTaskManager(): HumanTaskManager { return this.humanTaskManager; }
  getWorkflowEngine(): WorkflowEngine { return this.workflowEngine; }
  getResumeManager(): WorkflowResumeManager { return this.resumeManager; }
  getCheckpointStore(): InMemoryCheckpointStore { return this.checkpointStore; }
  getRuntimeRepo(): InMemoryRuntimeRepository { return this.runtimeRepo; }
  getStateManager(): RuntimeStateManager { return this.stateManager; }

  // ── Private ──────────────────────────────────────────────────────────────────

  private buildResult(
    execution: RuntimeExecution,
    events: RuntimeEvent[],
    intelligenceResult: CompilerIntelligenceResult | null,
    errors: string[],
    warnings: string[],
  ): RuntimeResult {
    const allEvents = events;
    return this.resultBuilder.build(execution, allEvents, intelligenceResult, errors, warnings);
  }
}
