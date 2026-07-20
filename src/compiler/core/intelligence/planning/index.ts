// ─── CompilerAI — Planning Engine ──────────────────────────────────────────────
// Public API surface for src/compiler/core/intelligence/planning

// ── Service (main entry point) ────────────────────────────────────────────────
export { PlanningEngine } from './services/PlanningEngine';
export type { PlanningEngineDeps } from './interfaces/IPlanningEngine';

// ── Services ───────────────────────────────────────────────────────────────────
export { PlanGenerator } from './services/PlanGenerator';
export { ExecutionGraphBuilder } from './services/ExecutionGraphBuilder';
export { PlanValidator } from './services/PlanValidator';
export { PlanRiskAnalyzer } from './services/PlanRiskAnalyzer';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type { IPlanningEngine } from './interfaces/IPlanningEngine';
export type { IPlanGenerator, PlanGenerationOutput } from './interfaces/IPlanGenerator';
export type { IExecutionGraphBuilder } from './interfaces/IExecutionGraphBuilder';
export type { IPlanValidator } from './interfaces/IPlanValidator';
export type { IPlanRiskAnalyzer } from './interfaces/IPlanRiskAnalyzer';

// ── Models ──────────────────────────────────────────────────────────────────────
export type { ExecutionPlan } from './models/ExecutionPlan';
export type { ExecutionGraph } from './models/ExecutionGraph';
export type { PlanNode } from './models/PlanNode';
export type { PlanEdge, DependencyType } from './models/PlanEdge';
export type { PlanNodeType } from './models/PlanNodeType';
export { PLAN_NODE_TYPES } from './models/PlanNodeType';
export type { PlanStatus } from './models/PlanStatus';
export { PLAN_STATUSES } from './models/PlanStatus';
export type { PlanRisk, RiskLevel, RiskKind } from './models/PlanRisk';
export { RISK_LEVELS } from './models/PlanRisk';
export type { PlanInput } from './models/PlanInput';
export type { PlanOutput } from './models/PlanOutput';
export type {
  PlanValidationResult, PlanValidationError, PlanValidationWarning,
} from './models/PlanValidationResult';
export type {
  HumanApprovalRequirement, ApprovalReason,
} from './models/HumanApprovalRequirement';

// ── Errors ───────────────────────────────────────────────────────────────────────
export { InvalidPlanError } from './errors/InvalidPlanError';
export { CircularDependencyError } from './errors/CircularDependencyError';
export { PlanningBlockedError } from './errors/PlanningBlockedError';

// ── Rules (exposed for advanced callers and unit tests) ──────────────────────────
export {
  blueprintForIntent,
} from './rules/PlanningRules';
export type { NodeBlueprint, PlanBlueprint } from './rules/PlanningRules';
export { deriveDependencyType, isConditional } from './rules/DependencyRules';
export { canParallelize, groupParallelNodes } from './rules/ParallelizationRules';
export { evaluateApproval } from './rules/HumanApprovalRules';
export type { ApprovalDecision } from './rules/HumanApprovalRules';
export { classifyRisks, maxRiskLevel } from './rules/RiskClassificationRules';
