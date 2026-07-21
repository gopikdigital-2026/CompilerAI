// ─── Blocking rules ────────────────────────────────────────────────────────────
// Deterministic rules that decide whether a result must be blocked.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { RiskLevel } from '../../planning/models/PlanRisk';

export interface BlockingInput {
  ctx?: ContextResult;
  intent?: IntentResult;
  plan?: ExecutionPlan;
  decision?: DecisionResult;
  overallScore: number;
  missingEvidenceCount: number;
  contradictions: string[];
}

export interface BlockingReason {
  reason: string;
  description: string;
}

const RISK_RANK: Record<RiskLevel, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

export function evaluateBlocking(input: BlockingInput): BlockingReason[] {
  const reasons: BlockingReason[] = [];

  // 1. Source result invalid
  if (input.ctx && input.ctx.status === 'BLOCKED') {
    reasons.push({
      reason: 'SOURCE_INVALID',
      description: 'Context result is BLOCKED.',
    });
  }
  if (input.intent && input.intent.status === 'BLOCKED') {
    reasons.push({
      reason: 'SOURCE_INVALID',
      description: 'Intent result is BLOCKED.',
    });
  }
  if (input.plan && (input.plan.status === 'INVALID' || input.plan.status === 'BLOCKED')) {
    reasons.push({
      reason: 'SOURCE_INVALID',
      description: `Execution plan is ${input.plan.status}.`,
    });
  }
  if (input.decision && (input.decision.status === 'BLOCKED' || input.decision.status === 'INVALID')) {
    reasons.push({
      reason: 'SOURCE_INVALID',
      description: `Decision result is ${input.decision.status}.`,
    });
  }

  // 2. Critical contradictions
  if (input.contradictions.length >= 3) {
    reasons.push({
      reason: 'CRITICAL_CONTRADICTIONS',
      description: `${input.contradictions.length} contradictions detected across engines.`,
    });
  }

  // 3. No minimum evidence
  if (input.missingEvidenceCount >= 3) {
    reasons.push({
      reason: 'NO_MINIMUM_EVIDENCE',
      description: `${input.missingEvidenceCount} critical evidence items missing.`,
    });
  }

  // 4. Extremely low confidence
  if (input.overallScore < 15) {
    reasons.push({
      reason: 'EXTREMELY_LOW_CONFIDENCE',
      description: `Overall confidence ${input.overallScore} is extremely low.`,
    });
  }

  // 5. RESTRICTED data + external execution proposed
  if (input.ctx && input.plan) {
    const hasRestricted = input.ctx.recommendedSources.some(s => s.classification === 'RESTRICTED');
    const hasExternal = input.plan.requiredDataSources.length > 0;
    if (hasRestricted && hasExternal) {
      reasons.push({
        reason: 'RESTRICTED_EXTERNAL_EXECUTION',
        description: 'RESTRICTED data present with external execution proposed.',
      });
    }
  }

  // 6. Missing mandatory approvals
  if (input.decision) {
    const missingApprovals = input.decision.humanApprovalRequirements.length > 0
      && input.decision.status !== 'REQUIRES_APPROVAL'
      && input.decision.status !== 'BLOCKED';
    if (missingApprovals) {
      reasons.push({
        reason: 'MISSING_APPROVALS',
        description: 'Mandatory approvals are pending but not flagged in decision status.',
      });
    }
  }

  // 7. CRITICAL unmitigated risk
  if (input.plan) {
    const criticalUnmitigated = input.plan.risks.some(
      r => r.level === 'CRITICAL' && (!r.mitigation || r.mitigation.trim() === ''),
    );
    if (criticalUnmitigated) {
      reasons.push({
        reason: 'CRITICAL_UNMITIGATED_RISK',
        description: 'CRITICAL risk without mitigation strategy.',
      });
    }
  }

  return reasons;
}

export function shouldBlock(reasons: BlockingReason[]): boolean {
  return reasons.length > 0;
}

export function maxRiskLevel(levels: RiskLevel[]): RiskLevel {
  if (levels.length === 0) return 'LOW';
  return levels.reduce((max, l) => RISK_RANK[l] > RISK_RANK[max] ? l : max, 'LOW');
}
