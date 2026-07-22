// ─── Tool Intelligence service interfaces ──────────────────────────────────────

import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolCandidate } from '../models/ToolCandidate';
import type { ToolSelection } from '../models/ToolSelection';
import type { ToolExecutionPlan } from '../models/ToolExecutionPlan';
import type { ToolPolicy } from '../models/ToolPolicy';
import type { ToolRiskAssessment } from '../models/ToolRiskAssessment';
import type { ToolEvent } from '../models/ToolEvent';
import type { IToolRegistry } from './IToolRegistry';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';

export interface ToolIntelligenceEngineDeps {
  idGenerator: () => string;
  clock:       () => string;
  registry:    IToolRegistry;
}

/** Input context for tool selection — pulls from all pipeline stages. */
export interface ToolSelectionContext {
  organizationId:  string;
  contextResult?:  ContextResult | null;
  intentResult?:   IntentResult | null;
  executionPlan?:  ExecutionPlan | null;
  decisionResult?: DecisionResult | null;
  confidenceResult?: ConfidenceResult | null;
  /** Retrieved memory entries relevant to the request. */
  memoryEntries?:  Array<{ content: string; type: string; relevance: number }>;
  /** Risk tolerance from the request. */
  riskTolerance?:  string;
}

export interface IToolDiscoveryService {
  discover(context: ToolSelectionContext): ToolDefinition[];
}

export interface IToolSelector {
  select(candidates: ToolCandidate[], context: ToolSelectionContext, policy: ToolPolicy): ToolSelection[];
}

export interface IToolEligibilityValidator {
  validate(tool: ToolDefinition, context: ToolSelectionContext, policy: ToolPolicy): ToolCandidate;
}

export interface IToolPermissionEvaluator {
  evaluate(tool: ToolDefinition, policy: ToolPolicy): { allowed: boolean; reasons: string[] };
}

export interface IToolRiskAnalyzer {
  analyze(selected: ToolDefinition[], context: ToolSelectionContext): ToolRiskAssessment;
}

export interface IToolPlanBuilder {
  build(selections: ToolSelection[], candidates: ToolCandidate[], riskAssessment: ToolRiskAssessment, context: ToolSelectionContext): ToolExecutionPlan;
}

export interface IToolIntelligenceEngine {
  readonly id: string;
  selectTools(context: ToolSelectionContext, policy: ToolPolicy): ToolExecutionPlan;
  getRegistry(): IToolRegistry;
  getEvents(): ToolEvent[];
}
