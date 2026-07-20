import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import type { PlanRisk } from '../models/PlanRisk';

// ─── Plan Risk Analyzer interface ───────────────────────────────────────────────
// Analyzes the execution graph for enterprise risks.

export interface IPlanRiskAnalyzer {
  readonly id: string;

  analyze(graph: ExecutionGraph, intent: IntentResult): PlanRisk[];
}
