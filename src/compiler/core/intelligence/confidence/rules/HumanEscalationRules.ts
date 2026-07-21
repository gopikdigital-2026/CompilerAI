// ─── Human escalation rules ────────────────────────────────────────────────────
// Deterministic rules that decide whether human review is required.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';

export interface EscalationInput {
  overallScore: number;
  minimumConfidenceThreshold: number;
  ctx?: ContextResult;
  intent?: IntentResult;
  plan?: ExecutionPlan;
  decision?: DecisionResult;
  missingCriticalEvidence: boolean;
  marginalAlternativeGap: boolean;
}

export interface EscalationReason {
  reason: string;
  description: string;
}

export function evaluateHumanEscalation(input: EscalationInput): EscalationReason[] {
  const reasons: EscalationReason[] = [];

  // 1. Overall score below threshold
  if (input.overallScore < input.minimumConfidenceThreshold) {
    reasons.push({
      reason: 'BELOW_THRESHOLD',
      description: `Overall confidence ${input.overallScore} is below the minimum threshold ${input.minimumConfidenceThreshold}.`,
    });
  }

  // 2. Impact HIGH or CRITICAL
  if (input.intent) {
    if (input.intent.impact === 'HIGH' || input.intent.impact === 'CRITICAL') {
      reasons.push({
        reason: 'HIGH_IMPACT',
        description: `Intent impact is ${input.intent.impact}, requiring human review.`,
      });
    }
  }

  // 3. RESTRICTED data present
  if (input.ctx) {
    const hasRestricted = input.ctx.recommendedSources.some(s => s.classification === 'RESTRICTED');
    if (hasRestricted) {
      reasons.push({
        reason: 'RESTRICTED_DATA',
        description: 'Context includes RESTRICTED data sources.',
      });
    }
  }
  if (input.plan) {
    const restrictedRisk = input.plan.risks.some(r => r.kind === 'RESTRICTED_INFORMATION');
    if (restrictedRisk) {
      reasons.push({
        reason: 'RESTRICTED_DATA',
        description: 'Plan flags RESTRICTED information risk.',
      });
    }
  }

  // 4. Irreversible decisions
  if (input.decision) {
    const irreversible = input.decision.decisions.filter(d => !d.reversible);
    if (irreversible.length > 0) {
      reasons.push({
        reason: 'IRREVERSIBLE_DECISION',
        description: `${irreversible.length} irreversible decision(s) require human review.`,
      });
    }
  }

  // 5. Critical conflicts
  if (input.decision) {
    const criticalConflicts = input.decision.unresolvedConflicts.filter(
      c => c.severity === 'CRITICAL' || c.severity === 'HIGH',
    );
    if (criticalConflicts.length > 0) {
      reasons.push({
        reason: 'CRITICAL_CONFLICTS',
        description: `${criticalConflicts.length} unresolved high/critical conflict(s).`,
      });
    }
  }

  // 6. Missing critical evidence
  if (input.missingCriticalEvidence) {
    reasons.push({
      reason: 'MISSING_CRITICAL_EVIDENCE',
      description: 'Critical evidence is missing for the assessment.',
    });
  }

  // 7. Workforce, legal, or financial impact
  if (input.plan) {
    const sensitiveRisk = input.plan.risks.some(r =>
      r.kind === 'WORKFORCE_IMPACT' || r.kind === 'LEGAL_IMPACT' || r.kind === 'FINANCIAL_IMPACT',
    );
    if (sensitiveRisk) {
      reasons.push({
        reason: 'SENSITIVE_IMPACT',
        description: 'Plan involves workforce, legal, or financial impact.',
      });
    }
  }
  if (input.decision) {
    const sensitiveApproval = input.decision.humanApprovalRequirements.some(a =>
      a.reason === 'WORKFORCE_REDUCTION' || a.reason === 'LEGAL_OR_REGULATORY_CHANGE' || a.reason === 'FINANCIAL_MOVEMENT',
    );
    if (sensitiveApproval) {
      reasons.push({
        reason: 'SENSITIVE_IMPACT',
        description: 'Decision requires approval for workforce, legal, or financial reasons.',
      });
    }
  }

  // 8. Discrepancy between plan and decision
  if (input.plan && input.decision) {
    if (input.plan.status === 'BLOCKED' && input.decision.status === 'READY') {
      reasons.push({
        reason: 'PLAN_DECISION_DISCREPANCY',
        description: 'Plan is BLOCKED but decision is READY.',
      });
    }
    if (input.decision.requiresReplanning) {
      reasons.push({
        reason: 'PLAN_DECISION_DISCREPANCY',
        description: 'Decision engine requires replanning.',
      });
    }
  }

  // 9. Marginal alternative gap
  if (input.marginalAlternativeGap) {
    reasons.push({
      reason: 'MARGINAL_ALTERNATIVES',
      description: 'Alternatives are nearly tied, reducing decision confidence.',
    });
  }

  return reasons;
}

export function shouldEscalate(reasons: EscalationReason[]): boolean {
  return reasons.length > 0;
}
