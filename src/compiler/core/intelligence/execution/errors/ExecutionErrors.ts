// ─── Execution errors ───────────────────────────────────────────────────────────

export class ExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class PlanNotApprovedError extends ExecutionError {
  constructor(planId: string) {
    super(`ToolExecutionPlan ${planId} has not been approved for execution.`);
    this.name = 'PlanNotApprovedError';
  }
}

export class ExecutionTimeoutError extends ExecutionError {
  constructor(stepId: string, timeoutMs: number) {
    super(`Step ${stepId} timed out after ${timeoutMs}ms.`);
    this.name = 'ExecutionTimeoutError';
  }
}

export class ExecutionCancelledError extends ExecutionError {
  constructor(executionId: string) {
    super(`Execution ${executionId} was cancelled.`);
    this.name = 'ExecutionCancelledError';
  }
}

export class ExecutionPermissionError extends ExecutionError {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionPermissionError';
  }
}

export class IdempotencyViolationError extends ExecutionError {
  constructor(stepId: string) {
    super(`Idempotency violation: step ${stepId} was already executed.`);
    this.name = 'IdempotencyViolationError';
  }
}

export class CompensationError extends ExecutionError {
  constructor(stepId: string, reason: string) {
    super(`Compensation failed for step ${stepId}: ${reason}`);
    this.name = 'CompensationError';
  }
}
