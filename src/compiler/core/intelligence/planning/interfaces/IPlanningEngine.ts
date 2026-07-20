import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../models/ExecutionPlan';

// ─── Planning Engine interface ─────────────────────────────────────────────────
// Orchestrates the planning pipeline:
// IntentResult → PlanGenerator → ExecutionGraphBuilder → PlanValidator → PlanRiskAnalyzer → ExecutionPlan.
// Contains no business rules of its own.

export interface PlanningEngineDeps {
  generator?:  unknown;   // IPlanGenerator
  graphBuilder?: unknown; // IExecutionGraphBuilder
  validator?:  unknown;   // IPlanValidator
  riskAnalyzer?: unknown; // IPlanRiskAnalyzer
  idGenerator?: () => string;
  clock?:       () => string;
}

export interface IPlanningEngine {
  readonly id: string;

  /** Generate and validate an execution plan from a validated intent. */
  plan(intent: IntentResult, deps?: PlanningEngineDeps): Promise<ExecutionPlan>;
}
