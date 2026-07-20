import type { IPlanRiskAnalyzer } from '../interfaces/IPlanRiskAnalyzer';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import type { PlanRisk } from '../models/PlanRisk';
import { classifyRisks } from '../rules/RiskClassificationRules';

// ─── Plan Risk Analyzer ────────────────────────────────────────────────────────
// Analyzes the execution graph for enterprise risks. Delegates to the pure
// risk classification rules.

export class PlanRiskAnalyzer implements IPlanRiskAnalyzer {
  readonly id = 'plan-risk-analyzer-v1';

  analyze(graph: ExecutionGraph, intent: IntentResult): PlanRisk[] {
    return classifyRisks(graph, intent);
  }
}
