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

// ── Confidence Engine ────────────────────────────────────────────────────────────
export {
  ConfidenceEngine, ConfidenceCalculator, UncertaintyAnalyzer,
  EvidenceEvaluator, ConfidenceValidator,
  CONFIDENCE_LEVELS, CONFIDENCE_STATUSES,
  DEFAULT_FACTOR_WEIGHTS, clampScore, levelFromScore, normalizeWeights, makeFactor,
  scoreContextCompleteness, scoreContextStatus,
  scoreIntentClarity, scoreIntentStatus,
  scoreGraphValidity, scoreUnresolvedRisks, scoreExternalDependency, scoreAssumptionCount,
  scoreAlternativeGap, scoreConflictSeverity, scoreReversibility, scorePendingApproval,
  scoreCrossEngineConsistency, aggregateAssessments,
  detectContextUncertainties, detectIntentUncertainties,
  detectPlanUncertainties, detectDecisionUncertainties, detectMissingDataUncertainties,
  collectContextEvidence, collectIntentEvidence,
  collectPlanEvidence, collectDecisionEvidence, detectMissingEvidence,
  evaluateHumanEscalation, shouldEscalate,
  evaluateBlocking, shouldBlock,
} from './confidence';
export type {
  ConfidenceEngineDeps, IConfidenceEngine, IConfidenceCalculator, IUncertaintyAnalyzer,
  IEvidenceEvaluator, IConfidenceValidator,
  ConfidenceRequest, AssessmentScope,
  ConfidenceResult, ConfidenceAssessment, AssessedSourceType,
  ConfidenceFactor, FactorKind, FactorDirection,
  UncertaintyItem, UncertaintyType,
  EvidenceItem, EvidenceKind,
  ConfidenceLevel, ConfidenceStatus, ConfidenceValidationResult,
  EscalationInput, EscalationReason, BlockingInput, BlockingReason,
} from './confidence';

// ── Orchestrator ────────────────────────────────────────────────────────────────
export {
  CompilerIntelligenceOrchestrator,
  PIPELINE_STAGES, COMPILER_INTELLIGENCE_STATUSES,
  OrchestratorError, PipelineBlockedError, InvalidOrchestratorInputError,
} from './orchestrator';
export type {
  ICompilerIntelligenceOrchestrator, CompilerIntelligenceOrchestratorDeps,
  IntelligenceStage, CompilerIntelligenceStatus,
  TraceEntry, CompilerIntelligenceResult, CompilerIntelligenceRequest,
} from './orchestrator';

// ── Telemetry Engine ───────────────────────────────────────────────────────────
export {
  TelemetryEngine, TelemetryEventBus, MetricsCollector, TraceBuilder, ExplainabilityBuilder,
  TELEMETRY_EVENT_TYPES,
  TelemetryError, TelemetryNotInitializedError, InvalidTelemetryEventError, TraceRepositoryError,
} from './telemetry';
export type {
  ITelemetryEngine, TelemetryEngineDeps,
  ITelemetryEventBus, TelemetryEventHandler,
  IExecutionTraceRepository, IMetricsCollector,
  TelemetryEventType, TelemetryStageStatus,
  StageTrace, ExecutionTrace, TelemetryMetrics, StageMetric,
  ExplainabilityRecord, DecisionSummary, AlternativeSummary,
  PerformanceSnapshot, TelemetryContext,
  StageCompleteData, PipelineEventData, PipelineResults,
  TelemetryEvent,
  StageStartedEvent, StageCompletedEvent, StageFailedEvent,
  PipelineBlockedEvent, HumanReviewRequestedEvent,
  ConfidenceCalculatedEvent, DecisionRejectedEvent,
} from './telemetry';

// ── Memory Intelligence Engine ─────────────────────────────────────────────────
export {
  MemoryEngine, InMemoryMemoryRepository,
  MemoryExtractor, MemoryValidator, MemoryRetriever,
  MemoryRanker, MemoryConsolidator, MemoryLifecycleManager,
  MEMORY_VERSION, MEMORY_TYPES, MEMORY_SENSITIVITIES, SENSITIVE_LEVELS, isSensitive,
  DEFAULT_TTL_MS, enforceConsent, validateEntry, computeExpiry,
  isExpired, computeContentHash, isDuplicate, filterByMaxSensitivity,
  MemoryError, SensitiveDataBlockedError, MemoryValidationError,
  MemoryNotFoundError, DuplicateMemoryError, TenantIsolationError,
} from './memory';
export type {
  IMemoryEngine, MemoryEngineDeps, MemoryWriteRequest,
  IMemoryExtractor, IMemoryValidator, IMemoryRetriever,
  IMemoryRanker, IMemoryConsolidator, IMemoryLifecycleManager,
  IMemoryRepository,
  MemoryEntry, WorkingMemory, SessionMemory, OrganizationMemory,
  SemanticMemory, ExecutionMemory,
  MemoryQuery, MemoryRetrievalResult,
  MemoryEvent, MemoryEventType,
  MemoryType, MemorySensitivity,
} from './memory';

// ── Tool Intelligence Engine ───────────────────────────────────────────────────
export {
  ToolIntelligenceEngine, ToolDiscoveryService, ToolSelector,
  ToolEligibilityValidator, ToolPermissionEvaluator,
  ToolRiskAnalyzer, ToolPlanBuilder, ToolRegistry,
  TOOL_CATEGORIES, TOOL_PERMISSIONS,
  isToolAllowed, hasRequiredPermissions, isWithinSensitivityLimit,
  checkConsent, checkOrgTier, findIncompatibleTools, meetsConfidenceThreshold,
  ToolError, ToolNotFoundError, ToolPermissionDeniedError,
  ToolIncompatibleError, ToolRegistryError, NoEligibleToolsError,
} from './tools';
export type {
  IToolIntelligenceEngine, ToolIntelligenceEngineDeps,
  ToolSelectionContext,
  IToolDiscoveryService, IToolSelector, IToolEligibilityValidator,
  IToolPermissionEvaluator, IToolRiskAnalyzer, IToolPlanBuilder,
  IToolRegistry,
  ToolDefinition, ToolStatus,
  ToolCapability, ToolCategory,
  ToolRequirement, ToolPermission,
  ToolCandidate, ToolSelection, ToolSelectionRationale,
  ToolExecutionPlan, ToolPlanStep, ToolPlanStatus,
  ToolPolicy, ToolRiskAssessment, ToolRiskFactor, ToolRiskLevel,
  ToolEvent, ToolEventType,
} from './tools';

// ── Execution Engine ───────────────────────────────────────────────────────────
export {
  ExecutionEngine, ExecutionCoordinator, ToolExecutor,
  ExecutionPolicyValidator, RetryManager, TimeoutManager,
  CompensationManager, ExecutionResultBuilder,
  SimulatedToolAdapter,
  EXECUTION_STATES, STEP_STATES,
  isPlanApproved, isPlanExecutable, checkOrganizationMatch,
  shouldTriggerRollback, computeIdempotencyKey, validateRetryConfig,
  deriveExecutionState,
  ExecutionError, PlanNotApprovedError, ExecutionTimeoutError,
  ExecutionCancelledError, ExecutionPermissionError,
  IdempotencyViolationError, CompensationError,
} from './execution';
export type {
  IExecutionEngine, IExecutionCoordinator, IToolExecutor,
  IRetryManager, ITimeoutManager, ICompensationManager,
  IExecutionResultBuilder, IExecutionPolicyValidator,
  ExecutionEngineDeps,
  ExecutionState, StepState, ExecutionMode,
  ExecutionRequest, ExecutionResult, StepResult,
  ExecutionEvent, ExecutionEventType,
  ExecutionTraceEntry, RetryConfig, RetryAttempt,
  CompensationRecord, SimulatedToolConfig,
} from './execution';

// ── Learning Engine ────────────────────────────────────────────────────────────
export {
  LearningEngine, OutcomeEvaluator, FeedbackProcessor,
  PatternExtractor, RecommendationGenerator, LearningValidator,
  InMemoryLearningRepository,
  LEARNING_SOURCES, LEARNING_STATUSES, PATTERN_TYPES,
  requiresHumanApproval, checkTenantIsolation, canApprove, canReject,
  validateLearningInput, nextVersion, isValidStatusTransition, isRegression,
  LearningError, RecommendationNotApprovedError,
  RecommendationAlreadyProcessedError, LearningValidationError,
  PatternRegressionError,
} from './learning';
export type {
  ILearningEngine, ILearningRepository,
  IOutcomeEvaluator, IFeedbackProcessor,
  IPatternExtractor, IRecommendationGenerator, ILearningValidator,
  LearningEngineDeps,
  LearningSource, LearningStatus, PatternType,
  LearningInput, LearningPattern,
  LearningRecommendation, RecommendationType, RecommendationPriority,
  LearningRecord, FeedbackEntry, OutcomeEvaluation,
  LearningEvent, LearningEventType,
} from './learning';
