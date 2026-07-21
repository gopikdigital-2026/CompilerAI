// ─── CompilerAI — Context Intelligence Layer ───────────────────────────────────
// Public API surface for src/compiler/core/intelligence

// ── Service (main entry point) ────────────────────────────────────────────────
export { ContextIntelligenceService } from './ContextIntelligenceService';
export type { ContextIntelligenceDeps } from './ContextIntelligenceService';

// ── Context components ─────────────────────────────────────────────────────────
export { ContextAnalyzer } from './context/ContextAnalyzer';
export { ContextEnricher } from './context/ContextEnricher';
export { ContextValidator } from './context/ContextValidator';
export { maxClassification } from './context/ContextAnalyzer';

// ── Interfaces ────────────────────────────────────────────────────────────────
export type { IContextAnalyzer } from './interfaces/IContextAnalyzer';
export type {
  IContextEnricher, ContextEnrichment, EnterpriseMemorySnapshot,
} from './interfaces/IContextEnricher';
export type {
  IContextValidator, ValidationOutcome, SufficiencyBreakdown,
} from './interfaces/IContextValidator';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ContextRequest } from './models/ContextRequest';
export type {
  BusinessContext, BusinessIntent, BusinessObjective, BusinessEntity,
  BusinessConstraint, Urgency, RelevantMemory,
} from './models/BusinessContext';
export type {
  ContextResult, ContextStatus,
} from './models/ContextResult';
export type {
  ContextSource, SourceKind, DataClassification,
} from './models/ContextSource';
export type {
  MissingInformation, InformationGapKind,
} from './models/MissingInformation';

// ── Intent Engine ────────────────────────────────────────────────────────────────
export {
  IntentEngine, IntentClassifier, IntentValidator,
  INTENT_CATEGORIES, BUSINESS_AREAS, DECISION_LEVELS,
  COMPLEXITY_LEVELS, IMPACT_LEVELS, REQUIRED_CAPABILITIES,
  scoreCategories, detectContradictions, INTENT_RULES,
  AREA_RULES, scoreAreas, mapCapabilities,
} from './intent';
export type {
  IntentEngineDeps, IIntentClassifier, IIntentValidator, IIntentEngine,
  IntentValidationOptions, IntentValidationOutcome,
  IntentCategory, BusinessArea, DecisionLevel, ComplexityLevel, ImpactLevel,
  RequiredCapability, SuggestedAgentType, SuggestedToolCategory,
  IntentClassification, IntentResult, IntentStatus,
  IntentRule, CategoryScore, AreaRule, AreaScore, CapabilityMapping,
} from './intent';

// ── Planning Engine ────────────────────────────────────────────────────────────────
export {
  PlanningEngine, PlanGenerator, ExecutionGraphBuilder, PlanValidator, PlanRiskAnalyzer,
  PLAN_NODE_TYPES, PLAN_STATUSES, RISK_LEVELS,
  blueprintForIntent, deriveDependencyType, isConditional,
  canParallelize, groupParallelNodes, evaluateApproval, classifyRisks, maxRiskLevel,
  InvalidPlanError, CircularDependencyError, PlanningBlockedError,
} from './planning';
export type {
  PlanningEngineDeps, IPlanningEngine, IPlanGenerator, IExecutionGraphBuilder,
  IPlanValidator, IPlanRiskAnalyzer, PlanGenerationOutput,
  ExecutionPlan, ExecutionGraph, PlanNode, PlanEdge, DependencyType, PlanNodeType,
  PlanStatus, PlanRisk, RiskLevel, RiskKind, PlanInput, PlanOutput,
  PlanValidationResult, PlanValidationError, PlanValidationWarning,
  HumanApprovalRequirement, ApprovalReason,
  NodeBlueprint, PlanBlueprint, ApprovalDecision,
} from './planning';

// ── Decision Engine ────────────────────────────────────────────────────────────────
export {
  DecisionEngine, DecisionExtractor, AlternativeGenerator, AlternativeEvaluator,
  ConflictDetector, DecisionValidator,
  DECISION_STATUSES, DECISION_TYPES, CRITERION_KINDS,
  nodeTypeToDecisionType, isDecisionNode, shouldExtractFromRisk,
  resolveConfig, evaluateAlternative, rankEvaluations,
  evaluateDecisionApproval, detectConflicts, evaluateReplanning,
  InvalidDecisionInputError, DecisionBlockedError, NoViableAlternativeError,
} from './decision';
export type {
  DecisionEngineDeps, IDecisionEngine, IDecisionExtractor, IAlternativeGenerator,
  IAlternativeEvaluator, IConflictDetector, IDecisionValidator,
  DecisionRequest, EvaluationPreferences, DecisionScope,
  DecisionResult, SelectedStrategy, DecisionItem, DecisionAlternative,
  AlternativeEvaluation, DecisionCriterion, CriterionKind,
  DecisionStatus, DecisionType, DecisionConflict, ConflictType, DecisionRationale,
  DecisionValidationResult, DecisionValidationError, DecisionValidationWarning,
  EvaluationConfig, DecisionApprovalDecision, ReplanningDecision,
} from './decision';
