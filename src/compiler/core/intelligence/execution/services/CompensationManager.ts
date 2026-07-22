// ─── CompensationManager ────────────────────────────────────────────────────────
// Handles rollback/compensation for completed steps when a failure occurs.

import type { ICompensationManager } from '../interfaces/IExecutionEngine';
import type { IToolExecutor } from '../interfaces/IExecutionEngine';
import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { CompensationRecord } from '../models/CompensationRecord';

export class CompensationManager implements ICompensationManager {
  private readonly executor: IToolExecutor;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(
    executor: IToolExecutor,
    idGenerator: () => string,
    clock: () => string,
  ) {
    this.executor = executor;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  async compensate(
    steps: ToolExecutionPlan['steps'],
    completedStepIds: Set<string>,
    context: { executionId: string; organizationId: string },
  ): Promise<CompensationRecord[]> {
    const records: CompensationRecord[] = [];

    // Compensate in reverse order of execution
    const toCompensate = steps
      .filter(s => completedStepIds.has(s.stepId))
      .reverse();

    for (const step of toCompensate) {
      try {
        const record = await this.executor.compensate(step, { executionId: context.executionId });
        records.push(record);
      } catch {
        records.push({
          compensationId: this.idGenerator(),
          executionId: context.executionId,
          stepId: step.stepId,
          toolId: step.toolId,
          reason: 'Compensation threw an error.',
          success: false,
          timestamp: this.clock(),
          actions: [],
        });
      }
    }

    return records;
  }
}
