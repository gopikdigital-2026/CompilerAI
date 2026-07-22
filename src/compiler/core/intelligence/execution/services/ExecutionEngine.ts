// ─── ExecutionEngine ────────────────────────────────────────────────────────────
// Main entry point — validates, executes, records telemetry/memory, returns result.

import type { IExecutionEngine, ExecutionEngineDeps } from '../interfaces/IExecutionEngine';
import type { ExecutionRequest } from '../models/ExecutionRequest';
import type { ExecutionResult } from '../models/ExecutionResult';
import type { ExecutionEvent } from '../models/ExecutionEvent';
import type { ExecutionTraceEntry } from '../models/ExecutionTraceEntry';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';
import { ExecutionPolicyValidator } from './ExecutionPolicyValidator';
import { RetryManager } from './RetryManager';
import { TimeoutManager } from './TimeoutManager';
import { CompensationManager } from './CompensationManager';
import { ExecutionResultBuilder } from './ExecutionResultBuilder';
import { ToolExecutor } from './ToolExecutor';
import { ExecutionCoordinator } from './ExecutionCoordinator';
import { SimulatedToolAdapter } from '../adapters/SimulatedToolAdapter';
import type { SimulatedToolConfig } from '../adapters/SimulatedToolAdapter';

export class ExecutionEngine implements IExecutionEngine {
  readonly id = 'execution-engine-v1';

  private readonly coordinator: ExecutionCoordinator;
  private readonly telemetry: ITelemetryEngine | null;
  private readonly memory: IMemoryEngine | null;

  constructor(deps: ExecutionEngineDeps, adapterConfig?: Partial<SimulatedToolConfig>) {
    this.telemetry = deps.telemetry ?? null;
    this.memory = deps.memory ?? null;

    const adapter = new SimulatedToolAdapter(deps.idGenerator, deps.clock, adapterConfig);
    const retryManager = new RetryManager(deps.clock);
    const timeoutManager = new TimeoutManager();
    const executor = new ToolExecutor(adapter, retryManager, timeoutManager, deps.idGenerator, deps.clock);
    const compensationManager = new CompensationManager(executor, deps.idGenerator, deps.clock);
    const resultBuilder = new ExecutionResultBuilder(deps.clock);
    const policyValidator = new ExecutionPolicyValidator();

    this.coordinator = new ExecutionCoordinator(
      executor, compensationManager, resultBuilder, policyValidator,
      deps.idGenerator, deps.clock,
    );
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const result = await this.coordinator.execute(request);

    // Record to telemetry if available
    if (this.telemetry) {
      try {
        this.telemetry.recordPipelineEvent('ConfidenceCalculated', {
          summary: `Execution ${result.executionId} ${result.state}: ${result.completedSteps} completed, ${result.failedSteps} failed.`,
        });
      } catch { /* telemetry failures must not break execution */ }
    }

    // Record to memory if available
    if (this.memory) {
      try {
        this.memory.write({
          organizationId: result.organizationId,
          executionId: result.executionId,
          type: 'EXECUTION',
          content: `Execution ${result.executionId} ${result.state}: ${result.completedSteps}/${result.stepResults.length} steps completed.`,
          source: 'execution-engine',
          confidence: result.state === 'COMPLETED' ? 90 : 40,
          relevance: 90,
          sensitivity: 'INTERNAL',
          consentGranted: true,
          tags: ['execution', result.state],
          metadata: {
            planId: result.planId,
            mode: result.mode,
            rollbackTriggered: result.rollbackTriggered,
            totalDurationMs: result.totalDurationMs,
          },
          executionStatus: result.state,
          completedStages: result.stepResults.filter(s => s.state === 'COMPLETED').map(s => s.stepId),
          finalConfidence: result.state === 'COMPLETED' ? 90 : 40,
          requiredHumanReview: result.state === 'PARTIAL',
        });
      } catch { /* memory write failures must not break execution */ }
    }

    return result;
  }

  cancel(executionId: string): boolean {
    return this.coordinator.cancel(executionId);
  }

  getEvents(): ExecutionEvent[] {
    return this.coordinator.getEvents();
  }

  getTraces(): ExecutionTraceEntry[] {
    return this.coordinator.getTraces();
  }

  isRunning(executionId: string): boolean {
    return this.coordinator.isRunning(executionId);
  }
}
