// ─── Confidence calculator ─────────────────────────────────────────────────────
// Computes per-source assessments and aggregates them into an overall score.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ConfidenceAssessment } from '../models/ConfidenceAssessment';
import type { ConfidenceFactor, FactorKind } from '../models/ConfidenceFactor';
import type { IConfidenceCalculator, ConfidenceCalculatorDeps } from '../interfaces/IConfidenceCalculator';
import {
  DEFAULT_FACTOR_WEIGHTS, makeFactor, levelFromScore, aggregateAssessments,
  scoreContextCompleteness, scoreContextStatus,
  scoreIntentClarity, scoreIntentStatus,
  scoreGraphValidity, scoreUnresolvedRisks, scoreExternalDependency, scoreAssumptionCount,
  scoreAlternativeGap, scoreConflictSeverity, scoreReversibility, scorePendingApproval,
  scoreCrossEngineConsistency,
} from '../rules/ConfidenceRules';

export class ConfidenceCalculator implements IConfidenceCalculator {
  constructor(private readonly deps: ConfidenceCalculatorDeps) {}

  assessContext(request: ConfidenceRequest): ConfidenceAssessment | null {
    const ctx = request.contextResult;
    if (!ctx) return null;
    const weights = this.deps.factorWeights;
    const factors: ConfidenceFactor[] = [];

    factors.push(makeFactor('CONTEXT_COMPLETENESS', 'POSITIVE',
      scoreContextCompleteness(ctx), weights['CONTEXT_COMPLETENESS'] ?? DEFAULT_FACTOR_WEIGHTS.CONTEXT_COMPLETENESS,
      `Context completeness: ${ctx.missingInformation.length} missing item(s).`,
      [ctx.requestId]));

    factors.push(makeFactor('DATA_QUALITY', 'POSITIVE',
      scoreContextStatus(ctx), weights['DATA_QUALITY'] ?? DEFAULT_FACTOR_WEIGHTS.DATA_QUALITY,
      `Context status: ${ctx.status}.`, [ctx.requestId]));

    // Restricted data reduces confidence
    const hasRestricted = ctx.recommendedSources.some(s => s.classification === 'RESTRICTED');
    if (hasRestricted) {
      factors.push(makeFactor('RESTRICTED_DATA', 'NEGATIVE',
        40, weights['RESTRICTED_DATA'] ?? DEFAULT_FACTOR_WEIGHTS.RESTRICTED_DATA,
        'Context includes RESTRICTED data sources.', [ctx.requestId]));
    }

    const score = this.computeAssessmentScore(factors);
    return {
      sourceType: 'CONTEXT',
      sourceId: ctx.requestId,
      score,
      level: levelFromScore(score),
      factors,
      uncertainties: [],
      evidence: [],
      contradictions: [],
      assumptions: [],
      explanation: `Context assessment: status=${ctx.status}, missing=${ctx.missingInformation.length}, restricted=${hasRestricted}.`,
    };
  }

  assessIntent(request: ConfidenceRequest): ConfidenceAssessment | null {
    const intent = request.intentResult;
    if (!intent) return null;
    const weights = this.deps.factorWeights;
    const factors: ConfidenceFactor[] = [];

    factors.push(makeFactor('INTENT_CLARITY', 'POSITIVE',
      scoreIntentClarity(intent), weights['INTENT_CLARITY'] ?? DEFAULT_FACTOR_WEIGHTS.INTENT_CLARITY,
      `Intent clarity: confidence=${intent.confidenceScore}, ambiguity=${intent.ambiguityScore}.`,
      [intent.intentId]));

    factors.push(makeFactor('INTENT_PLAN_COHERENCE', 'POSITIVE',
      scoreIntentStatus(intent), weights['INTENT_PLAN_COHERENCE'] ?? DEFAULT_FACTOR_WEIGHTS.INTENT_PLAN_COHERENCE,
      `Intent status: ${intent.status}.`, [intent.intentId]));

    if (intent.requiresHumanApproval) {
      factors.push(makeFactor('PENDING_APPROVAL', 'NEGATIVE',
        30, weights['PENDING_APPROVAL'] ?? DEFAULT_FACTOR_WEIGHTS.PENDING_APPROVAL,
        'Intent requires human approval.', [intent.intentId]));
    }

    const score = this.computeAssessmentScore(factors);
    return {
      sourceType: 'INTENT',
      sourceId: intent.intentId,
      score,
      level: levelFromScore(score),
      factors,
      uncertainties: [],
      evidence: [],
      contradictions: [],
      assumptions: intent.assumptions,
      explanation: `Intent assessment: primary=${intent.primaryIntent}, impact=${intent.impact}, status=${intent.status}.`,
    };
  }

  assessPlan(request: ConfidenceRequest): ConfidenceAssessment | null {
    const plan = request.executionPlan;
    if (!plan) return null;
    const weights = this.deps.factorWeights;
    const factors: ConfidenceFactor[] = [];

    factors.push(makeFactor('GRAPH_VALIDITY', 'POSITIVE',
      scoreGraphValidity(plan), weights['GRAPH_VALIDITY'] ?? DEFAULT_FACTOR_WEIGHTS.GRAPH_VALIDITY,
      `Graph validity: ${plan.graph.nodes.length} nodes, status=${plan.status}.`,
      [plan.planId]));

    factors.push(makeFactor('UNRESOLVED_RISKS', 'NEGATIVE',
      scoreUnresolvedRisks(plan), weights['UNRESOLVED_RISKS'] ?? DEFAULT_FACTOR_WEIGHTS.UNRESOLVED_RISKS,
      `Unresolved risks: ${plan.risks.length}.`, [plan.planId]));

    factors.push(makeFactor('EXTERNAL_DEPENDENCY', 'NEGATIVE',
      scoreExternalDependency(plan), weights['EXTERNAL_DEPENDENCY'] ?? DEFAULT_FACTOR_WEIGHTS.EXTERNAL_DEPENDENCY,
      `External dependencies: ${plan.requiredDataSources.length}.`, [plan.planId]));

    factors.push(makeFactor('ASSUMPTION_COUNT', 'NEGATIVE',
      scoreAssumptionCount(plan.assumptions), weights['ASSUMPTION_COUNT'] ?? DEFAULT_FACTOR_WEIGHTS.ASSUMPTION_COUNT,
      `Assumptions: ${plan.assumptions.length}.`, [plan.planId]));

    if (plan.humanApprovalRequirements.length > 0) {
      factors.push(makeFactor('PENDING_APPROVAL', 'NEGATIVE',
        40, weights['PENDING_APPROVAL'] ?? DEFAULT_FACTOR_WEIGHTS.PENDING_APPROVAL,
        `Pending approvals: ${plan.humanApprovalRequirements.length}.`, [plan.planId]));
    }

    const score = this.computeAssessmentScore(factors);
    return {
      sourceType: 'PLAN',
      sourceId: plan.planId,
      score,
      level: levelFromScore(score),
      factors,
      uncertainties: [],
      evidence: [],
      contradictions: [],
      assumptions: plan.assumptions,
      explanation: `Plan assessment: status=${plan.status}, risks=${plan.risks.length}, approvals=${plan.humanApprovalRequirements.length}.`,
    };
  }

  assessDecision(request: ConfidenceRequest): ConfidenceAssessment | null {
    const decision = request.decisionResult;
    if (!decision) return null;
    const weights = this.deps.factorWeights;
    const factors: ConfidenceFactor[] = [];

    factors.push(makeFactor('ALTERNATIVE_GAP', 'POSITIVE',
      scoreAlternativeGap(decision), weights['ALTERNATIVE_GAP'] ?? DEFAULT_FACTOR_WEIGHTS.ALTERNATIVE_GAP,
      `Alternative gap analysis.`, [decision.decisionResultId]));

    factors.push(makeFactor('CONFLICT_SEVERITY', 'NEGATIVE',
      scoreConflictSeverity(decision), weights['CONFLICT_SEVERITY'] ?? DEFAULT_FACTOR_WEIGHTS.CONFLICT_SEVERITY,
      `Conflicts: ${decision.unresolvedConflicts.length}.`, [decision.decisionResultId]));

    factors.push(makeFactor('REVERSIBILITY', 'POSITIVE',
      scoreReversibility(decision), weights['REVERSIBILITY'] ?? DEFAULT_FACTOR_WEIGHTS.REVERSIBILITY,
      `Reversibility assessment.`, [decision.decisionResultId]));

    factors.push(makeFactor('PENDING_APPROVAL', 'NEGATIVE',
      scorePendingApproval(decision), weights['PENDING_APPROVAL'] ?? DEFAULT_FACTOR_WEIGHTS.PENDING_APPROVAL,
      `Pending approvals: ${decision.humanApprovalRequirements.length}.`, [decision.decisionResultId]));

    const score = this.computeAssessmentScore(factors);
    return {
      sourceType: 'DECISION',
      sourceId: decision.decisionResultId,
      score,
      level: levelFromScore(score),
      factors,
      uncertainties: [],
      evidence: [],
      contradictions: decision.unresolvedConflicts.map(c => c.description),
      assumptions: decision.assumptions,
      explanation: `Decision assessment: status=${decision.status}, decisions=${decision.decisions.length}, conflicts=${decision.unresolvedConflicts.length}.`,
    };
  }

  aggregate(assessments: ConfidenceAssessment[], request: ConfidenceRequest): {
    overallScore: number;
    positiveFactors: ConfidenceFactor[];
    negativeFactors: ConfidenceFactor[];
  } {
    const base = aggregateAssessments(assessments, this.deps.factorWeights);

    // Cross-engine consistency penalty/bonus
    const consistency = scoreCrossEngineConsistency(
      request.contextResult, request.intentResult,
      request.executionPlan, request.decisionResult,
    );
    const consistencyAdjustment = (consistency - 100) * 0.15;
    const adjusted = Math.round(base.overallScore + consistencyAdjustment);
    const overallScore = Math.max(0, Math.min(100, adjusted));

    return {
      overallScore,
      positiveFactors: base.positiveFactors,
      negativeFactors: base.negativeFactors,
    };
  }

  private computeAssessmentScore(factors: ConfidenceFactor[]): number {
    const normMap = ((): Map<FactorKind, number> => {
      const entries = Object.entries(this.deps.factorWeights) as [FactorKind, number][];
      const total = entries.reduce((sum, [, w]) => sum + (w > 0 ? w : 0), 0);
      const map = new Map<FactorKind, number>();
      if (total <= 0) {
        const even = 1 / entries.length;
        for (const [k] of entries) map.set(k, even);
        return map;
      }
      for (const [k, w] of entries) map.set(k, (w > 0 ? w : 0) / total);
      return map;
    })();

    let totalContribution = 0;
    let totalWeight = 0;
    for (const f of factors) {
      const w = normMap.get(f.kind) ?? 0;
      totalContribution += f.contribution * w;
      totalWeight += w;
    }
    const net = totalContribution / (totalWeight || 1);
    return Math.max(0, Math.min(100, Math.round(50 + net * 50)));
  }
}
