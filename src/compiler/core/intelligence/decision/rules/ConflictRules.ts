// ─── Conflict rules ────────────────────────────────────────────────────────────
// Pure, deterministic rules for detecting conflicts between decisions.

import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionConflict, ConflictType } from '../models/DecisionConflict';
import type { RiskLevel } from '../../planning/models/PlanRisk';

let conflictCounter = 0;

export function detectConflicts(decisions: DecisionItem[]): DecisionConflict[] {
  const conflicts: DecisionConflict[] = [];

  for (let i = 0; i < decisions.length; i++) {
    for (let j = i + 1; j < decisions.length; j++) {
      const a = decisions[i];
      const b = decisions[j];
      const c = checkPair(a, b);
      if (c) conflicts.push(c);
    }
  }

  // Per-decision: urgency vs approval
  for (const d of decisions) {
    const urgencyText = `${d.title} ${d.description} ${d.objective}`;
    const hasUrgencySignal = /inmediat|immediately|urgent|urgente/i.test(urgencyText)
      || d.decisionType === 'RISK_RESPONSE' && d.riskLevel === 'CRITICAL';
    if (d.requiresHumanApproval && hasUrgencySignal) {
      conflicts.push(mkConflict(
        'URGENCY_VS_APPROVAL',
        `Decision "${d.title}" requires immediate action but also human approval`,
        [d.decisionId], 'HIGH', true,
        'Escalate to approver with expedited review or reduce scope to non-urgent steps',
      ));
    }
  }

  // Per-decision: automation vs restricted data
  for (const d of decisions) {
    if (d.requiresHumanApproval && d.alternatives.some(alt => alt.requiresHumanApproval === false)) {
      conflicts.push(mkConflict(
        'AUTOMATION_VS_RESTRICTED_DATA',
        `Decision "${d.title}" mixes automated alternatives with restricted data`,
        [d.decisionId], 'HIGH', true,
        'Mark all alternatives as requiring approval when restricted data is involved',
      ));
    }
  }

  // Per-decision: high impact vs low confidence
  for (const d of decisions) {
    if ((d.riskLevel === 'HIGH' || d.riskLevel === 'CRITICAL') && d.confidenceScore < 45) {
      conflicts.push(mkConflict(
        'HIGH_IMPACT_VS_LOW_CONFIDENCE',
        `Decision "${d.title}" has high impact but low confidence (${d.confidenceScore})`,
        [d.decisionId], 'HIGH', true,
        'Request additional data or reduce the decision scope',
      ));
    }
  }

  return conflicts;
}

function checkPair(a: DecisionItem, b: DecisionItem): DecisionConflict | null {
  // Contradictory objectives
  if (a.objective && b.objective && areContradictory(a.objective, b.objective)) {
    return mkConflict(
      'CONTRADICTORY_OBJECTIVES',
      `Decisions "${a.title}" and "${b.title}" have contradictory objectives`,
      [a.decisionId, b.decisionId], 'MEDIUM', true,
      'Align objectives or prioritize one decision over the other',
    );
  }

  // Cost vs risk
  if (a.decisionType === 'RESOURCE_ALLOCATION' && b.riskLevel === 'CRITICAL') {
    return mkConflict(
      'COST_VS_RISK',
      `Decision "${a.title}" allocates resources while "${b.title}" carries CRITICAL risk`,
      [a.decisionId, b.decisionId], 'MEDIUM', true,
      'Reassess resource allocation in light of critical risk',
    );
  }

  return null;
}

function areContradictory(a: string, b: string): boolean {
  const pairs: Array<[RegExp, RegExp]> = [
    [/reduc|decreas|cut|minimiz/i, /aument|increas|expand|grow|boost/i],
    [/abrir|open|launch/i, /cerrar|close|shutdown|cancel/i],
  ];
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return pairs.some(([p1, p2]) =>
    (p1.test(al) && p2.test(bl)) || (p2.test(al) && p1.test(bl)),
  );
}

function mkConflict(
  type: ConflictType, description: string,
  involvedDecisionIds: string[], severity: RiskLevel,
  resolvable: boolean, suggestedResolution: string,
): DecisionConflict {
  return {
    conflictId: `conflict-${conflictCounter++}`,
    type, description, involvedDecisionIds, severity, resolvable, suggestedResolution,
  };
}
