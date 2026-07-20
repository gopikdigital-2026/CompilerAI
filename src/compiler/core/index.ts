// ─── CompilerAI — Core Engine ─────────────────────────────────────────────────
// Public API surface for src/compiler/core

// ── Service (main entry point) ────────────────────────────────────────────────
export { compilerCore, CompilerCoreService, SIMULATION_MODE } from './services/CompilerCoreService';
export { SimulationProvider } from './services/SimulationProvider';

// ── Orchestrator ──────────────────────────────────────────────────────────────
export { CompilerOrchestrator } from './orchestrator/CompilerOrchestrator';
export { PipelineRunner } from './orchestrator/PipelineRunner';

// ── Memory ────────────────────────────────────────────────────────────────────
export { WorkingMemory } from './memory/WorkingMemory';
export { ContextWindow } from './memory/ContextWindow';

// ── Reasoning ─────────────────────────────────────────────────────────────────
export { ReasoningEngine } from './reasoning/ReasoningEngine';
export { IntentClassifier } from './reasoning/IntentClassifier';

// ── Tools ─────────────────────────────────────────────────────────────────────
export { BlueprintBuilderTool } from './tools/BlueprintBuilderTool';
export { AgentFactoryTool } from './tools/AgentFactoryTool';
export { ValidationTool } from './tools/ValidationTool';

// ── Models ────────────────────────────────────────────────────────────────────
export type { CompilationRequest, CompilationResult, CompilationStatus } from './models/CompilationResult';
export type { PipelineStage, StageId } from './models/PipelineStage';
export { DEFAULT_STAGES, STAGE_IDS } from './models/PipelineStage';
export type { CompilerEvent, CompilerEventType } from './models/CompilerEvent';
export { makeEvent } from './models/CompilerEvent';

// ── Interfaces ────────────────────────────────────────────────────────────────
export type { ICompilerCore, ICompilerProvider, ReasoningOutput } from './interfaces/ICompilerCore';
export type { IPipeline, PipelineContext, StageStatus } from './interfaces/IPipeline';
export type { IPlugin, IPluginRegistry } from './interfaces/IPlugin';
export type { IMemoryProvider, MemoryEntry } from './interfaces/IMemoryProvider';

// ── Intelligence (Context Intelligence Layer) ─────────────────────────────────
export {
  ContextIntelligenceService,
  ContextAnalyzer,
  ContextEnricher,
  ContextValidator,
  maxClassification,
} from './intelligence';
export type {
  ContextIntelligenceDeps,
  IContextAnalyzer,
  IContextEnricher,
  IContextValidator,
  ContextEnrichment,
  EnterpriseMemorySnapshot,
  ValidationOutcome,
  SufficiencyBreakdown,
  ContextRequest,
  BusinessContext,
  BusinessIntent,
  BusinessObjective,
  BusinessEntity,
  BusinessConstraint,
  Urgency,
  RelevantMemory,
  ContextResult,
  ContextStatus,
  ContextSource,
  SourceKind,
  DataClassification,
  MissingInformation,
  InformationGapKind,
} from './intelligence';

// ── Intent Engine ────────────────────────────────────────────────────────────────
export {
  IntentEngine,
  IntentClassifier as IntentClassifierService,
  IntentValidator as IntentValidatorService,
  INTENT_CATEGORIES, BUSINESS_AREAS, DECISION_LEVELS,
  COMPLEXITY_LEVELS, IMPACT_LEVELS, REQUIRED_CAPABILITIES,
  scoreCategories, detectContradictions, INTENT_RULES,
  AREA_RULES, scoreAreas, mapCapabilities,
} from './intelligence';
export type {
  IntentEngineDeps, IIntentClassifier, IIntentValidator, IIntentEngine,
  IntentValidationOptions, IntentValidationOutcome,
  IntentCategory, BusinessArea, DecisionLevel, ComplexityLevel, ImpactLevel,
  RequiredCapability, SuggestedAgentType, SuggestedToolCategory,
  IntentClassification, IntentResult, IntentStatus,
  IntentRule, CategoryScore, AreaRule, AreaScore, CapabilityMapping,
} from './intelligence';

// ── Planning Engine ────────────────────────────────────────────────────────────────
export {
  PlanningEngine, PlanGenerator, ExecutionGraphBuilder, PlanValidator, PlanRiskAnalyzer,
  PLAN_NODE_TYPES, PLAN_STATUSES, RISK_LEVELS,
  blueprintForIntent, deriveDependencyType, isConditional,
  canParallelize, groupParallelNodes, evaluateApproval, classifyRisks, maxRiskLevel,
  InvalidPlanError, CircularDependencyError, PlanningBlockedError,
} from './intelligence';
export type {
  PlanningEngineDeps, IPlanningEngine, IPlanGenerator, IExecutionGraphBuilder,
  IPlanValidator, IPlanRiskAnalyzer, PlanGenerationOutput,
  ExecutionPlan, ExecutionGraph, PlanNode, PlanEdge, DependencyType, PlanNodeType,
  PlanStatus, PlanRisk, RiskLevel, RiskKind, PlanInput, PlanOutput,
  PlanValidationResult, PlanValidationError, PlanValidationWarning,
  HumanApprovalRequirement, ApprovalReason,
  NodeBlueprint, PlanBlueprint, ApprovalDecision,
} from './intelligence';
