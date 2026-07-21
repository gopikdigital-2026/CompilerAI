// ─── Orchestrator errors ────────────────────────────────────────────────────────

/** Base error for all orchestrator failures. */
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public readonly stage: string,
    public readonly executionId: string,
  ) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

/** Thrown when the pipeline is blocked and cannot continue. */
export class PipelineBlockedError extends OrchestratorError {
  constructor(
    message: string,
    stage: string,
    executionId: string,
    public readonly blockers: string[],
  ) {
    super(message, stage, executionId);
    this.name = 'PipelineBlockedError';
  }
}

/** Thrown when the pipeline input is invalid. */
export class InvalidOrchestratorInputError extends OrchestratorError {
  constructor(message: string, executionId: string) {
    super(message, 'CONTEXT', executionId);
    this.name = 'InvalidOrchestratorInputError';
  }
}
