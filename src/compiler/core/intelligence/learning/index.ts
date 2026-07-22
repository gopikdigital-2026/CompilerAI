// ─── Learning Engine — public API ───────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { LearningEngine } from './services/LearningEngine';
export { OutcomeEvaluator } from './services/OutcomeEvaluator';
export { FeedbackProcessor } from './services/FeedbackProcessor';
export { PatternExtractor } from './services/PatternExtractor';
export { RecommendationGenerator } from './services/RecommendationGenerator';
export { LearningValidator } from './services/LearningValidator';
export { InMemoryLearningRepository } from './services/InMemoryLearningRepository';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  ILearningEngine, ILearningRepository,
  IOutcomeEvaluator, IFeedbackProcessor,
  IPatternExtractor, IRecommendationGenerator, ILearningValidator,
  LearningEngineDeps,
} from './interfaces/ILearningEngine';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { LearningSource, LearningStatus, PatternType } from './models/LearningTypes';
export { LEARNING_SOURCES, LEARNING_STATUSES, PATTERN_TYPES } from './models/LearningTypes';
export type { LearningInput } from './models/LearningInput';
export type { LearningPattern } from './models/LearningPattern';
export type { LearningRecommendation, RecommendationType, RecommendationPriority } from './models/LearningRecommendation';
export type { LearningRecord } from './models/LearningRecord';
export type { FeedbackEntry } from './models/FeedbackEntry';
export type { OutcomeEvaluation } from './models/OutcomeEvaluation';
export type { LearningEvent, LearningEventType } from './models/LearningEvent';

// ── Policies ───────────────────────────────────────────────────────────────────
export {
  requiresHumanApproval, checkTenantIsolation, canApprove, canReject,
  validateLearningInput, nextVersion, isValidStatusTransition, isRegression,
} from './policies/LearningPolicies';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  LearningError, RecommendationNotApprovedError,
  RecommendationAlreadyProcessedError, LearningValidationError,
  PatternRegressionError,
} from './errors/LearningErrors';
