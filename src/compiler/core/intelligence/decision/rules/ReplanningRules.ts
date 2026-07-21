// ─── Replanning rules ──────────────────────────────────────────────────────────
// Pure rules for determining when the Decision Engine should request replanning.

import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionConflict } from '../models/DecisionConflict';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { RiskLevel } from '../../planning/models/PlanRisk';

export interface ReplanningDecision {
  requiresReplanning:  boolean;
  reasons:             string[];
}

export function evaluateReplanning(
  decisions:  DecisionItem[],
  conflicts:  DecisionConflict[],
  plan:       ExecutionPlan,
  riskTolerance: RiskLevel,
): ReplanningDecision {
  const reasons: string[] = [];

  // No viable alternatives
  const noViable = decisions.filter(d => d.alternatives.length === 0);
  if (noViable.length > 0) {
    reasons.push(`${noViable.length} decision(s) have no viable alternatives`);
  }

  // Plan contains blockers
  if (plan.blockers.length > 0) {
    reasons.push(`Plan has ${plan.blockers.length} blocker(s): ${plan.blockers.join('; ')}`);
  }

  // Missing critical capabilities
  const missingCaps = plan.requiredCapabilities.filter(
    cap => !plan.graph.nodes.some(n => n.requiredCapabilities.includes(cap)),
  );
  if (missingCaps.length > 0) {
    reasons.push(`${missingCaps.length} critical capability(ies) not covered by any node`);
  }

  // Structural conflicts
  const structuralConflicts = conflicts.filter(c => !c.resolvable);
  if (structuralConflicts.length > 0) {
    reasons.push(`${structuralConflicts.length} unresolvable structural conflict(s)`);
  }

  // Risk exceeds tolerance
  const riskOrder: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const toleranceIdx = riskOrder.indexOf(riskTolerance);
  const exceedsRisk = decisions.filter(d => riskOrder.indexOf(d.riskLevel) > toleranceIdx);
  if (exceedsRisk.length > 0) {
    reasons.push(`${exceedsRisk.length} decision(s) exceed risk tolerance (${riskTolerance})`);
  }

  // Recommended strategy contradicts objective
  for (const d of decisions) {
    const rec = d.alternatives.find(a => a.alternativeId === d.recommendedAlternativeId);
    if (rec && rec.risks.some(r => /contradic|conflict|opposite/i.test(r))) {
      reasons.push(`Recommended strategy for "${d.title}" contradicts the original objective`);
    }
  }

  return {
    requiresReplanning: reasons.length > 0,
    reasons,
  };
}
