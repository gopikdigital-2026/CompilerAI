// ─── Execution Engine — public API ──────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { ExecutionEngine } from './services/ExecutionEngine';
export { ExecutionCoordinator } from './services/ExecutionCoordinator';
export { ToolExecutor } from './services/ToolExecutor';
export { ExecutionPolicyValidator } from './services/ExecutionPolicyValidator';
export { RetryManager } from './services/RetryManager';
export { TimeoutManager } from './services/TimeoutManager';
export { CompensationManager } from './services/CompensationManager';
export { ExecutionResultBuilder } from './services/ExecutionResultBuilder';

// ── Adapter ────────────────────────────────────────────────────────────────────
export { SimulatedToolAdapter } from './adapters/SimulatedToolAdapter';
export type { SimulatedToolConfig } from './adapters/SimulatedToolAdapter';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  IExecutionEngine, IExecutionCoordinator, IToolExecutor,
  IRetryManager, ITimeoutManager, ICompensationManager,
  IExecutionResultBuilder, IExecutionPolicyValidator,
  ExecutionEngineDeps,
} from './interfaces/IExecutionEngine';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ExecutionState, StepState, ExecutionMode } from './models/ExecutionState';
export { EXECUTION_STATES, STEP_STATES } from './models/ExecutionState';
export type { ExecutionRequest } from './models/ExecutionRequest';
export type { ExecutionResult } from './models/ExecutionResult';
export type { StepResult } from './models/StepResult';
export type { ExecutionEvent, ExecutionEventType } from './models/ExecutionEvent';
export type { ExecutionTraceEntry } from './models/ExecutionTraceEntry';
export type { RetryConfig, RetryAttempt } from './models/RetryConfig';
export type { CompensationRecord } from './models/CompensationRecord';

// ── Policies ───────────────────────────────────────────────────────────────────
export {
  isPlanApproved, isPlanExecutable, checkOrganizationMatch,
  shouldTriggerRollback, computeIdempotencyKey, validateRetryConfig,
  deriveExecutionState,
} from './policies/ExecutionPolicies';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  ExecutionError, PlanNotApprovedError, ExecutionTimeoutError,
  ExecutionCancelledError, ExecutionPermissionError,
  IdempotencyViolationError, CompensationError,
} from './errors/ExecutionErrors';
