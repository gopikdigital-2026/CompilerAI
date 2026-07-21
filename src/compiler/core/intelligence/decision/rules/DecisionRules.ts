// ─── Decision rules ─────────────────────────────────────────────────────────────
// Maps plan node types to decision types. Pure data — no side effects.

import type { PlanNodeType } from '../../planning/models/PlanNodeType';
import type { DecisionType } from '../models/DecisionType';

export function nodeTypeToDecisionType(nodeType: PlanNodeType): DecisionType | null {
  switch (nodeType) {
    case 'RECOMMENDATION':     return 'RECOMMENDATION_SELECTION';
    case 'COMPARISON':         return 'STRATEGY_SELECTION';
    case 'OPTIMIZATION':       return 'OPTIMIZATION_CHOICE';
    case 'FORECASTING':        return 'FORECAST_BASED_DECISION';
    case 'WORKFLOW_DESIGN':    return 'WORKFLOW_SELECTION';
    case 'HUMAN_APPROVAL':     return 'HUMAN_APPROVAL_GATE';
    case 'DECISION_PREPARATION': return 'GO_NO_GO';
    case 'EXTERNAL_RESEARCH':  return 'STRATEGY_SELECTION';
    default:                   return null;
  }
}

export function isDecisionNode(nodeType: PlanNodeType): boolean {
  return nodeTypeToDecisionType(nodeType) !== null;
}

export function shouldExtractFromRisk(riskLevel: string): boolean {
  return riskLevel === 'HIGH' || riskLevel === 'CRITICAL';
}
