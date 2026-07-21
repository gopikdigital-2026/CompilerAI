// ─── Approval decision rules ───────────────────────────────────────────────────
// Pure rules for determining when a decision requires human approval.

import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { ApprovalReason } from '../../planning/models/HumanApprovalRequirement';

export interface ApprovalDecision {
  requiresApproval: boolean;
  reason?: ApprovalReason;
  rationale?: string;
}

export function evaluateDecisionApproval(
  decision:    DecisionItem,
  plan:         ExecutionPlan,
  recommendedAlt?: DecisionAlternative,
): ApprovalDecision {
  // Inherit from planning engine
  if (plan.humanApprovalRequirements.length > 0) {
    return {
      requiresApproval: true,
      reason: plan.humanApprovalRequirements[0].reason,
      rationale: 'Planning engine already mandates approval',
    };
  }

  // Workforce impact
  if (decision.title.toLowerCase().includes('plantilla')
      || decision.title.toLowerCase().includes('workforce')) {
    return {
      requiresApproval: true, reason: 'WORKFORCE_REDUCTION',
      rationale: 'Workforce impact requires human approval',
    };
  }

  // Financial movement
  if (decision.title.toLowerCase().includes('financ')
      || decision.decisionType === 'RESOURCE_ALLOCATION') {
    return {
      requiresApproval: true, reason: 'FINANCIAL_MOVEMENT',
      rationale: 'Financial movement requires human approval',
    };
  }

  // Restricted data
  if (plan.risks.some(r => r.kind === 'RESTRICTED_INFORMATION')) {
    return {
      requiresApproval: true, reason: 'RESTRICTED_DATA_ACCESS',
      rationale: 'Restricted data access requires human approval',
    };
  }

  // Irreversible action
  if (recommendedAlt?.reversibility === 'IRREVERSIBLE') {
    return {
      requiresApproval: true, reason: 'IRREVERSIBLE_ACTION',
      rationale: 'Irreversible action requires human approval',
    };
  }

  // Low confidence + high impact
  if (decision.confidenceScore < 50 && decision.riskLevel !== 'LOW') {
    return {
      requiresApproval: true, reason: 'HIGH_IMPACT_LOW_CONFIDENCE',
      rationale: 'High impact with low confidence requires human approval',
    };
  }

  // Selected alternative has HIGH or CRITICAL risk
  if (recommendedAlt && altRiskIsHighOrCritical(recommendedAlt)) {
    return {
      requiresApproval: true, reason: 'HIGH_IMPACT_EXTERNAL_EXECUTION',
      rationale: 'Selected alternative carries HIGH or CRITICAL risk',
    };
  }

  return { requiresApproval: false };
}

function altRiskIsHighOrCritical(alt: DecisionAlternative): boolean {
  const riskStr = alt.risks.join(' ').toLowerCase();
  return /high|critical|severo|grave/i.test(riskStr);
}
