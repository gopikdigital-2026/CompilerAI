// ─── CompilerAI — Decision Engine ──────────────────────────────────────────────
// Public API surface for src/compiler/core/intelligence/decision

// ── Service (main entry point) ────────────────────────────────────────────────
export { DecisionEngine } from './services/DecisionEngine';
export type { DecisionEngineDeps } from './interfaces/IDecisionEngine';

// ── Services ───────────────────────────────────────────────────────────────────
export { DecisionExtractor } from './services/DecisionExtractor';
export { AlternativeGenerator } from './services/AlternativeGenerator';
export { AlternativeEvaluator } from './services/AlternativeEvaluator';
export { ConflictDetector } from './services/ConflictDetector';
export { DecisionValidator } from './services/DecisionValidator';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type { IDecisionEngine } from './interfaces/IDecisionEngine';
export type { IDecisionExtractor } from './interfaces/IDecisionExtractor';
export type { IAlternativeGenerator } from './interfaces/IAlternativeGenerator';
export type { IAlternativeEvaluator } from './interfaces/IAlternativeEvaluator';
export type { IConflictDetector } from './interfaces/IConflictDetector';
export type { IDecisionValidator } from './interfaces/IDecisionValidator';

// ── Models ──────────────────────────────────────────────────────────────────────
export type { DecisionRequest, EvaluationPreferences, DecisionScope } from './models/DecisionRequest';
export type { DecisionResult, SelectedStrategy } from './models/DecisionResult';
export type { DecisionItem } from './models/DecisionItem';
export type { DecisionAlternative } from './models/DecisionAlternative';
export type { AlternativeEvaluation } from './models/AlternativeEvaluation';
export type { DecisionCriterion, CriterionKind } from './models/DecisionCriterion';
export { CRITERION_KINDS } from './models/DecisionCriterion';
export type { DecisionStatus } from './models/DecisionStatus';
export { DECISION_STATUSES } from './models/DecisionStatus';
export type { DecisionType } from './models/DecisionType';
export { DECISION_TYPES } from './models/DecisionType';
export type { DecisionConflict, ConflictType } from './models/DecisionConflict';
export type { DecisionRationale } from './models/DecisionRationale';
export type {
  DecisionValidationResult, DecisionValidationError, DecisionValidationWarning,
} from './models/DecisionValidationResult';

// ── Errors ───────────────────────────────────────────────────────────────────────
export { InvalidDecisionInputError } from './errors/InvalidDecisionInputError';
export { DecisionBlockedError } from './errors/DecisionBlockedError';
export { NoViableAlternativeError } from './errors/NoViableAlternativeError';

// ── Rules (exposed for advanced callers and unit tests) ──────────────────────────
export { nodeTypeToDecisionType, isDecisionNode, shouldExtractFromRisk } from './rules/DecisionRules';
export { resolveConfig, evaluateAlternative, rankEvaluations } from './rules/EvaluationRules';
export type { EvaluationConfig } from './rules/EvaluationRules';
export { evaluateDecisionApproval } from './rules/ApprovalDecisionRules';
export type { ApprovalDecision as DecisionApprovalDecision } from './rules/ApprovalDecisionRules';
export { detectConflicts } from './rules/ConflictRules';
export { evaluateReplanning } from './rules/ReplanningRules';
export type { ReplanningDecision } from './rules/ReplanningRules';
