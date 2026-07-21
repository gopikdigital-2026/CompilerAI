// ─── Confidence rules ──────────────────────────────────────────────────────────
// Deterministic factor scorers and aggregation helpers.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import type { ConfidenceFactor, FactorKind, FactorDirection } from '../models/ConfidenceFactor';
import type { ConfidenceAssessment } from '../models/ConfidenceAssessment';
import type { ConfidenceLevel } from '../models/ConfidenceLevel';

export const DEFAULT_FACTOR_WEIGHTS: Record<FactorKind, number> = {
  CONTEXT_COMPLETENESS:    1.2,
  INTENT_CLARITY:          1.0,
  INTENT_PLAN_COHERENCE:   1.0,
  GRAPH_VALIDITY:          1.3,
  DATA_QUALITY:            1.0,
  ASSUMPTION_COUNT:        0.8,
  CONFLICT_SEVERITY:       1.1,
  UNRESOLVED_RISKS:        1.0,
  ALTERNATIVE_GAP:         0.9,
  EVIDENCE_SUFFICIENCY:     1.1,
  RESTRICTED_DATA:         0.8,
  EXTERNAL_DEPENDENCY:     0.7,
  REVERSIBILITY:           0.8,
  PENDING_APPROVAL:        0.7,
  CROSS_ENGINE_CONSISTENCY: 1.0,
};

const RISK_RANK: Record<RiskLevel, number> = {
  LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4,
};

export function clampScore(score: number): number {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function levelFromScore(score: number): ConfidenceLevel {
  if (score >= 90) return 'VERY_HIGH';
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  if (score >= 25) return 'LOW';
  return 'VERY_LOW';
}

/** Normalize weights so they sum to 1. */
export function normalizeWeights(weights: Record<string, number>): Map<FactorKind, number> {
  const entries = Object.entries(weights) as [FactorKind, number][];
  const total = entries.reduce((sum, [, w]) => sum + (w > 0 ? w : 0), 0);
  const map = new Map<FactorKind, number>();
  if (total <= 0) {
    const even = 1 / entries.length;
    for (const [k] of entries) map.set(k, even);
    return map;
  }
  for (const [k, w] of entries) map.set(k, (w > 0 ? w : 0) / total);
  return map;
}

export function makeFactor(
  kind: FactorKind,
  direction: FactorDirection,
  score: number,
  weight: number,
  description: string,
  evidenceRefs: string[] = [],
): ConfidenceFactor {
  const contribution = direction === 'POSITIVE'
    ? (score / 100) * weight
    : -((100 - score) / 100) * weight;
  return {
    factorId: `factor-${kind.toLowerCase()}`,
    kind,
    direction,
    weight,
    score: clampScore(score),
    contribution: Math.round(contribution * 1000) / 1000,
    description,
    evidenceRefs,
  };
}

// ── Context factors ────────────────────────────────────────────────────────────

export function scoreContextCompleteness(ctx: ContextResult): number {
  if (ctx.missingInformation.length === 0) return 100;
  const penalty = ctx.missingInformation.reduce((sum, m) => {
    const sev = m.severity === 'critical' ? 35
      : m.severity === 'high' ? 22
      : m.severity === 'medium' ? 12
      : 5;
    return sum + sev;
  }, 0);
  return clampScore(100 - penalty);
}

export function scoreContextStatus(ctx: ContextResult): number {
  if (ctx.status === 'READY') return 100;
  if (ctx.status === 'NEEDS_CLARIFICATION') return 35;
  if (ctx.status === 'NEEDS_DATA') return 30;
  return 0; // BLOCKED
}

// ── Intent factors ─────────────────────────────────────────────────────────────

export function scoreIntentClarity(intent: IntentResult): number {
  let score = intent.confidenceScore;
  score -= intent.ambiguityScore * 0.4;
  if (intent.requiresClarification) score -= 20;
  if (intent.primaryIntent === 'UNKNOWN') score -= 25;
  return clampScore(score);
}

export function scoreIntentStatus(intent: IntentResult): number {
  if (intent.status === 'READY') return 100;
  if (intent.status === 'NEEDS_CLARIFICATION') return 35;
  return 0; // BLOCKED
}

// ── Plan factors ───────────────────────────────────────────────────────────────

export function scoreGraphValidity(plan: ExecutionPlan): number {
  if (plan.status === 'INVALID') return 0;
  if (plan.status === 'BLOCKED') return 15;
  if (plan.graph.nodes.length === 0) return 20;
  if (plan.graph.topologicalOrder.length !== plan.graph.nodes.length) return 40;
  if (plan.graph.entryNodeIds.length === 0) return 50;
  if (plan.graph.terminalNodeIds.length === 0) return 50;
  return 100;
}

export function scoreUnresolvedRisks(plan: ExecutionPlan): number {
  if (plan.risks.length === 0) return 100;
  const penalty = plan.risks.reduce((sum, r) => sum + RISK_RANK[r.level] * 8, 0);
  return clampScore(100 - penalty);
}

export function scoreExternalDependency(plan: ExecutionPlan): number {
  const ext = plan.requiredDataSources.length;
  if (ext === 0) return 100;
  return clampScore(100 - ext * 10);
}

export function scoreAssumptionCount(assumptions: string[]): number {
  if (assumptions.length === 0) return 100;
  return clampScore(100 - assumptions.length * 8);
}

// ── Decision factors ───────────────────────────────────────────────────────────

export function scoreAlternativeGap(decision: DecisionResult): number {
  if (!decision.selectedStrategy) return 30;
  const items = decision.decisions;
  if (items.length === 0) return 50;
  let minGap = 100;
  for (const item of items) {
    const evals = item.alternatives
      .flatMap(a => a.evaluations)
      .sort((a, b) => b.weightedScore - a.weightedScore);
    if (evals.length >= 2) {
      const gap = evals[0].weightedScore - evals[1].weightedScore;
      if (gap < minGap) minGap = gap;
    }
  }
  if (minGap >= 25) return 100;
  if (minGap >= 15) return 70;
  if (minGap >= 5) return 50;
  return 30;
}

export function scoreConflictSeverity(decision: DecisionResult): number {
  if (decision.unresolvedConflicts.length === 0) return 100;
  const penalty = decision.unresolvedConflicts.reduce((sum, c) => {
    return sum + RISK_RANK[c.severity] * 10;
  }, 0);
  return clampScore(100 - penalty);
}

export function scoreReversibility(decision: DecisionResult): number {
  const items = decision.decisions;
  if (items.length === 0) return 80;
  const irreversible = items.filter(d => !d.reversible).length;
  if (irreversible === 0) return 100;
  return clampScore(100 - irreversible * 20);
}

export function scorePendingApproval(decision: DecisionResult): number {
  if (decision.humanApprovalRequirements.length === 0 && !decision.decisions.some(d => d.requiresHumanApproval)) {
    return 100;
  }
  return 40;
}

// ── Cross-engine consistency ──────────────────────────────────────────────────

export function scoreCrossEngineConsistency(
  ctx: ContextResult | undefined,
  intent: IntentResult | undefined,
  plan: ExecutionPlan | undefined,
  decision: DecisionResult | undefined,
): number {
  let score = 100;
  if (ctx && intent) {
    if (ctx.requestId !== intent.requestId) score -= 15;
    if (ctx.organizationId !== intent.organizationId) score -= 15;
  }
  if (intent && plan) {
    if (intent.intentId !== plan.intentId) score -= 15;
    if (intent.requestId !== plan.requestId) score -= 10;
  }
  if (plan && decision) {
    if (plan.planId !== decision.planId) score -= 15;
    if (plan.requestId !== decision.requestId) score -= 10;
  }
  // Status coherence: if upstream is blocked/invalid, downstream should not be READY
  if (ctx && intent) {
    if ((ctx.status === 'BLOCKED' || ctx.status === 'NEEDS_CLARIFICATION') && intent.status === 'READY') score -= 10;
  }
  if (intent && plan) {
    if (intent.status === 'BLOCKED' && plan.status === 'READY') score -= 10;
  }
  if (plan && decision) {
    if ((plan.status === 'BLOCKED' || plan.status === 'INVALID') && decision.status === 'READY') score -= 10;
  }
  return clampScore(score);
}

// ── Aggregation ────────────────────────────────────────────────────────────────

export function aggregateAssessments(
  assessments: ConfidenceAssessment[],
  weights: Record<string, number>,
): { overallScore: number; positiveFactors: ConfidenceFactor[]; negativeFactors: ConfidenceFactor[] } {
  if (assessments.length === 0) {
    return { overallScore: 0, positiveFactors: [], negativeFactors: [] };
  }
  const allFactors = assessments.flatMap(a => a.factors);
  const positive = allFactors.filter(f => f.direction === 'POSITIVE');
  const negative = allFactors.filter(f => f.direction === 'NEGATIVE');
  const normMap = normalizeWeights(weights);
  let totalContribution = 0;
  let totalWeight = 0;
  for (const f of allFactors) {
    const w = normMap.get(f.kind) ?? 0;
    totalContribution += f.contribution * w;
    totalWeight += w;
  }
  // Convert contribution space to 0-100: positive factors contribute positively,
  // negative factors subtract. Base of 50, then add net contribution scaled.
  const netContribution = totalContribution / (totalWeight || 1);
  const overallScore = clampScore(50 + netContribution * 50);
  return { overallScore, positiveFactors: positive, negativeFactors: negative };
}
