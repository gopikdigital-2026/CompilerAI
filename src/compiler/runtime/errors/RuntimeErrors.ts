// ─── Runtime errors ─────────────────────────────────────────────────────────────

export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}

export class RuntimeValidationError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeValidationError';
  }
}

export class WorkflowValidationError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

export class WorkflowCycleError extends RuntimeError {
  constructor(nodeId: string) {
    super(`Cycle detected in workflow graph at node: ${nodeId}.`);
    this.name = 'WorkflowCycleError';
  }
}

export class CheckpointIncompatibleError extends RuntimeError {
  constructor(checkpointId: string, expected: string, actual: string) {
    super(`Checkpoint ${checkpointId} is incompatible: expected hash ${expected}, got ${actual}.`);
    this.name = 'CheckpointIncompatibleError';
  }
}

export class ResumeTokenExpiredError extends RuntimeError {
  constructor(tokenId: string) {
    super(`Resume token ${tokenId} has expired.`);
    this.name = 'ResumeTokenExpiredError';
  }
}

export class ResumeTokenConsumedError extends RuntimeError {
  constructor(tokenId: string) {
    super(`Resume token ${tokenId} has already been consumed.`);
    this.name = 'ResumeTokenConsumedError';
  }
}

export class IdempotencyDuplicateError extends RuntimeError {
  constructor(idempotencyKey: string) {
    super(`Duplicate request with idempotency key: ${idempotencyKey}.`);
    this.name = 'IdempotencyDuplicateError';
  }
}

export class ApprovalRejectedError extends RuntimeError {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} was rejected.`);
    this.name = 'ApprovalRejectedError';
  }
}

export class ApprovalExpiredError extends RuntimeError {
  constructor(approvalId: string) {
    super(`Approval ${approvalId} has expired.`);
    this.name = 'ApprovalExpiredError';
  }
}

export class RuntimeTimeoutError extends RuntimeError {
  constructor(executionId: string, maxDurationMs: number) {
    super(`Runtime execution ${executionId} timed out after ${maxDurationMs}ms.`);
    this.name = 'RuntimeTimeoutError';
  }
}

export class TenantIsolationError extends RuntimeError {
  constructor(expected: string, actual: string) {
    super(`Tenant isolation violation: expected org ${expected}, got ${actual}.`);
    this.name = 'TenantIsolationError';
  }
}
