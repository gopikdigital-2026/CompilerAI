// ─── Confidence Engine — public API ────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { ConfidenceEngine } from './services/ConfidenceEngine';
export { ConfidenceCalculator } from './services/ConfidenceCalculator';
export { UncertaintyAnalyzer } from './services/UncertaintyAnalyzer';
export { EvidenceEvaluator } from './services/EvidenceEvaluator';
export { ConfidenceValidator } from './services/ConfidenceValidator';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type { IConfidenceEngine, ConfidenceEngineDeps } from './interfaces/IConfidenceEngine';
export type { IConfidenceCalculator, ConfidenceCalculatorDeps } from './interfaces/IConfidenceCalculator';
export type { IUncertaintyAnalyzer } from './interfaces/IUncertaintyAnalyzer';
export type { IEvidenceEvaluator } from './interfaces/IEvidenceEvaluator';
export type { IConfidenceValidator } from './interfaces/IConfidenceValidator';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ConfidenceRequest, AssessmentScope } from './models/ConfidenceRequest';
export type { ConfidenceResult } from './models/ConfidenceResult';
export type { ConfidenceAssessment, AssessedSourceType } from './models/ConfidenceAssessment';
export type { ConfidenceFactor, FactorKind, FactorDirection } from './models/ConfidenceFactor';
export type { UncertaintyItem, UncertaintyType } from './models/UncertaintyItem';
export type { EvidenceItem, EvidenceKind } from './models/EvidenceItem';
export type { ConfidenceLevel } from './models/ConfidenceLevel';
export { CONFIDENCE_LEVELS } from './models/ConfidenceLevel';
export type { ConfidenceStatus } from './models/ConfidenceStatus';
export { CONFIDENCE_STATUSES } from './models/ConfidenceStatus';
export type { ConfidenceValidationResult } from './models/ConfidenceValidationResult';

// ── Rules ──────────────────────────────────────────────────────────────────────
export {
  DEFAULT_FACTOR_WEIGHTS, clampScore, levelFromScore, normalizeWeights, makeFactor,
  scoreContextCompleteness, scoreContextStatus,
  scoreIntentClarity, scoreIntentStatus,
  scoreGraphValidity, scoreUnresolvedRisks, scoreExternalDependency, scoreAssumptionCount,
  scoreAlternativeGap, scoreConflictSeverity, scoreReversibility, scorePendingApproval,
  scoreCrossEngineConsistency, aggregateAssessments,
} from './rules/ConfidenceRules';
export {
  detectContextUncertainties, detectIntentUncertainties,
  detectPlanUncertainties, detectDecisionUncertainties, detectMissingDataUncertainties,
} from './rules/UncertaintyRules';
export {
  collectContextEvidence, collectIntentEvidence,
  collectPlanEvidence, collectDecisionEvidence, detectMissingEvidence,
} from './rules/EvidenceRules';
export {
  evaluateHumanEscalation, shouldEscalate,
} from './rules/HumanEscalationRules';
export type { EscalationInput, EscalationReason } from './rules/HumanEscalationRules';
export {
  evaluateBlocking, shouldBlock,
} from './rules/BlockingRules';
export type { BlockingInput, BlockingReason } from './rules/BlockingRules';
