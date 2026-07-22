// ─── Compiler Runtime — public API ──────────────────────────────────────────────

// ── Main entry point ──────────────────────────────────────────────────────────
export { CompilerRuntime } from './services/CompilerRuntime';
export { RuntimeCoordinator } from './services/RuntimeCoordinator';

// ── Runtime services ──────────────────────────────────────────────────────────
export { RuntimeRequestValidator } from './services/RuntimeRequestValidator';
export { RuntimeStateManager } from './services/RuntimeStateManager';
export { RuntimeResultBuilder } from './services/RuntimeResultBuilder';
export { ApprovalManager } from './services/ApprovalManager';
export { ApprovalPolicyEvaluator } from './services/ApprovalPolicyEvaluator';
export { HumanTaskManager } from './services/HumanTaskManager';

// ── Workflow services ──────────────────────────────────────────────────────────
export { WorkflowEngine } from './workflow/WorkflowEngine';
export { WorkflowDefinitionValidator } from './workflow/WorkflowDefinitionValidator';
export { WorkflowGraphBuilder } from './workflow/WorkflowGraphBuilder';
export { WorkflowScheduler } from './workflow/WorkflowScheduler';
export { WorkflowRunner } from './workflow/WorkflowRunner';
export { WorkflowResumeManager } from './workflow/WorkflowResumeManager';
export { WorkflowCancellationManager } from './workflow/WorkflowCancellationManager';

// ── Event bus ──────────────────────────────────────────────────────────────────
export { RuntimeEventBus } from './events/RuntimeEventBus';

// ── Repositories ───────────────────────────────────────────────────────────────
export {
  InMemoryRuntimeRepository,
  InMemoryWorkflowRepository,
  InMemoryApprovalRepository,
  InMemoryCheckpointStore,
} from './repositories/InMemoryRepositories';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  CompilerRuntimeDeps, IRuntimeRequestValidator, IRuntimeStateManager,
  IRuntimeResultBuilder, IRuntimeCoordinator,
  IWorkflowDefinitionValidator, IWorkflowGraphBuilder, IWorkflowScheduler,
  IWorkflowRunner, IWorkflowResumeManager, IWorkflowCancellationManager,
  WorkflowRunContext,
  IApprovalManager, IApprovalPolicyEvaluator, IHumanTaskManager,
} from './interfaces/RuntimeInterfaces';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { RuntimeStatus, WorkflowNodeType, NodeExecutionState } from './models/RuntimeModels';
export { RUNTIME_STATUSES, WORKFLOW_NODE_TYPES, NODE_EXECUTION_STATES } from './models/RuntimeModels';
export type { RuntimeRequest } from './models/RuntimeRequest';
export type { RuntimeExecution } from './models/RuntimeExecution';
export type { RuntimeResult } from './models/RuntimeResult';
export type { WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowExecution, WorkflowStepExecution, WorkflowBranch } from './models/WorkflowModels';
export type { ApprovalRequest, ApprovalDecision, ApprovalDecisionType, ApprovalReason } from './models/ApprovalModels';
export { APPROVAL_DECISIONS } from './models/ApprovalModels';
export type { RuntimeCheckpoint, ResumeToken, HumanTask } from './models/CheckpointModels';
export type { RuntimeEvent, RuntimeEventType } from './models/RuntimeEvent';
export { RUNTIME_EVENT_TYPES } from './models/RuntimeEvent';

// ── Policies ───────────────────────────────────────────────────────────────────
export {
  validateRequest, checkTenantAccess, validateWorkflowDefinition, detectCycles,
  validateCheckpointCompatibility, validateResumeToken, shouldRequireApproval,
  validateRetryLimit, computeContentHash, sanitizeForLogging,
} from './policies/RuntimePolicies';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  RuntimeError, RuntimeValidationError, WorkflowValidationError, WorkflowCycleError,
  CheckpointIncompatibleError, ResumeTokenExpiredError, ResumeTokenConsumedError,
  IdempotencyDuplicateError, ApprovalRejectedError, ApprovalExpiredError,
  RuntimeTimeoutError, TenantIsolationError,
} from './errors/RuntimeErrors';
