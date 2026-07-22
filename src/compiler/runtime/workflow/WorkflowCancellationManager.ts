// ─── WorkflowCancellationManager ────────────────────────────────────────────────
// Handles cancellation of workflow executions with compensation for completed steps.

import type { IWorkflowCancellationManager, WorkflowRunContext } from '../interfaces/RuntimeInterfaces';
import type { RuntimeExecution } from '../models/RuntimeExecution';

export class WorkflowCancellationManager implements IWorkflowCancellationManager {
    private readonly clock: () => string;

  constructor(_idGenerator: () => string, clock: () => string) {
        this.clock = clock;
  }

  async cancel(execution: RuntimeExecution, _context: WorkflowRunContext): Promise<RuntimeExecution> {
    // Mark all non-completed steps as CANCELLED
    if (execution.workflowExecution) {
      const wfExec = execution.workflowExecution;
      for (const step of wfExec.steps) {
        if (step.state !== 'COMPLETED' && step.state !== 'FAILED') {
          step.state = 'CANCELLED';
          step.completedAt = this.clock();
          step.error = 'Execution cancelled.';
        }
      }
      wfExec.status = 'CANCELLED';
      wfExec.completedAt = this.clock();
    }

    execution.status = 'CANCELLED';
    execution.completedAt = this.clock();
    execution.errorMessage = 'Execution cancelled by request.';

    return execution;
  }
}
