// ─── Evaluation rules ──────────────────────────────────────────────────────────
// Pure, deterministic rules for scoring alternatives against criteria.

import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { AlternativeEvaluation } from '../models/AlternativeEvaluation';
import type { DecisionCriterion, CriterionKind } from '../models/DecisionCriterion';
import type { EvaluationPreferences } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';

const DEFAULT_WEIGHTS: Record<CriterionKind, number> = {
  EXPECTED_VALUE: 0.15, COST: 0.10, TIME_TO_VALUE: 0.08, RISK: 0.15,
  REVERSIBILITY: 0.10, STRATEGIC_ALIGNMENT: 0.12, OPERATIONAL_FEASIBILITY: 0.08,
  DATA_QUALITY: 0.07, LEGAL_COMPLIANCE: 0.05, HUMAN_IMPACT: 0.05,
  CUSTOMER_IMPACT: 0.03, CONFIDENCE: 0.02,
};

const DEFAULT_RISK_PENALTIES: Record<RiskLevel, number> = {
  LOW: 0, MEDIUM: 10, HIGH: 20, CRITICAL: 35,
};

const DEFAULT_MIN_VIABLE = 40;

export interface EvaluationConfig {
  weights:       Record<CriterionKind, number>;
  riskPenalties: Record<RiskLevel, number>;
  minViable:     number;
}

export function resolveConfig(preferences: EvaluationPreferences): EvaluationConfig {
  const weights = { ...DEFAULT_WEIGHTS };
  if (preferences.criterionWeights) {
    for (const [key, val] of Object.entries(preferences.criterionWeights)) {
      if (key in weights && typeof val === 'number') {
        weights[key as CriterionKind] = val;
      }
    }
  }
  const riskPenalties = { ...DEFAULT_RISK_PENALTIES };
  if (preferences.riskPenalties) {
    for (const [key, val] of Object.entries(preferences.riskPenalties)) {
      if (key in riskPenalties && typeof val === 'number') {
        riskPenalties[key as RiskLevel] = val;
      }
    }
  }
  return {
    weights,
    riskPenalties,
    minViable: preferences.minViableScore ?? DEFAULT_MIN_VIABLE,
  };
}

export function evaluateAlternative(
  alt: DecisionAlternative,
  config: EvaluationConfig,
  riskTolerance: RiskLevel,
): AlternativeEvaluation {
  const criteria: DecisionCriterion[] = [];

  // ── Score each criterion deterministically ──────────────────────────────────
  criteria.push(scoreExpectedValue(alt));
  criteria.push(scoreCost(alt));
  criteria.push(scoreTimeToValue(alt));
  criteria.push(scoreRisk(alt, riskTolerance));
  criteria.push(scoreReversibility(alt));
  criteria.push(scoreStrategicAlignment(alt));
  criteria.push(scoreOperationalFeasibility(alt));
  criteria.push(scoreDataQuality(alt));
  criteria.push(scoreLegalCompliance(alt));
  criteria.push(scoreHumanImpact(alt));
  criteria.push(scoreCustomerImpact(alt));
  criteria.push(scoreConfidence(alt));

  // ── Weighted aggregate ────────────────────────────────────────────────────────
  let weightedSum = 0;
  let weightTotal = 0;
  for (const c of criteria) {
    const w = config.weights[c.kind] ?? 0;
    weightedSum += c.score * w;
    weightTotal += w;
  }
  let weightedScore = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // ── Penalties ──────────────────────────────────────────────────────────────────
  const altRiskLevel = inferAltRiskLevel(alt);
  weightedScore -= config.riskPenalties[altRiskLevel] ?? 0;

  if (alt.requiredCapabilities.length === 0) {
    weightedScore -= 5;   // no capabilities = uncertain execution
  }
  if (alt.requiredData.length > 0) {
    weightedScore -= 3;   // needs data = slight penalty
  }
  if (alt.reversibility === 'IRREVERSIBLE') {
    weightedScore -= 10;
  } else if (alt.reversibility === 'PARTIALLY_REVERSIBLE') {
    weightedScore -= 5;
  }

  weightedScore = clamp(weightedScore, 0, 100);

  return {
    alternativeId: alt.alternativeId,
    weightedScore,
    criteria,
    rank: 0,   // assigned after sorting
    viable: weightedScore >= config.minViable,
    summary: buildSummary(alt, weightedScore),
  };
}

export function rankEvaluations(evals: AlternativeEvaluation[]): AlternativeEvaluation[] {
  // Sort by weightedScore descending; tie-break by criteria count (more = better),
  // then by alternativeId ascending for determinism.
  const sorted = [...evals].sort((a, b) => {
    if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
    if (b.criteria.length !== a.criteria.length) return b.criteria.length - a.criteria.length;
    return a.alternativeId.localeCompare(b.alternativeId);
  });
  sorted.forEach((e, i) => { e.rank = i + 1; });
  return sorted;
}

// ── Criterion scorers ─────────────────────────────────────────────────────────────

function scoreExpectedValue(alt: DecisionAlternative): DecisionCriterion {
  const benefits = alt.expectedBenefits.length;
  const score = clamp(50 + benefits * 10, 0, 100);
  return mkCriterion('EXPECTED_VALUE', score, `${benefits} expected benefit(s) identified`);
}

function scoreCost(alt: DecisionAlternative): DecisionCriterion {
  const costs = alt.expectedCosts.length;
  const score = clamp(80 - costs * 12, 0, 100);
  return mkCriterion('COST', score, `${costs} expected cost(s) identified`);
}

function scoreTimeToValue(alt: DecisionAlternative): DecisionCriterion {
  const deps = alt.dependencies.length;
  const score = clamp(70 - deps * 8, 0, 100);
  return mkCriterion('TIME_TO_VALUE', score, `${deps} dependency chain(s)`);
}

function scoreRisk(alt: DecisionAlternative, _tolerance: RiskLevel): DecisionCriterion {
  const risks = alt.risks.length;
  const score = clamp(80 - risks * 10, 0, 100);
  return mkCriterion('RISK', score, `${risks} risk factor(s)`);
}

function scoreReversibility(alt: DecisionAlternative): DecisionCriterion {
  const map = { REVERSIBLE: 100, PARTIALLY_REVERSIBLE: 60, IRREVERSIBLE: 20 };
  const score = map[alt.reversibility];
  return mkCriterion('REVERSIBILITY', score, `Reversibility: ${alt.reversibility}`);
}

function scoreStrategicAlignment(alt: DecisionAlternative): DecisionCriterion {
  const score = alt.description.length > 20 ? 75 : 50;
  return mkCriterion('STRATEGIC_ALIGNMENT', score, 'Alignment inferred from description');
}

function scoreOperationalFeasibility(alt: DecisionAlternative): DecisionCriterion {
  const score = alt.requiredCapabilities.length > 0 ? 70 : 40;
  return mkCriterion('OPERATIONAL_FEASIBILITY', score, `${alt.requiredCapabilities.length} capability(ies) required`);
}

function scoreDataQuality(alt: DecisionAlternative): DecisionCriterion {
  const missing = alt.requiredData.length;
  const score = clamp(80 - missing * 10, 0, 100);
  return mkCriterion('DATA_QUALITY', score, `${missing} data requirement(s)`);
}

function scoreLegalCompliance(alt: DecisionAlternative): DecisionCriterion {
  const hasCompliance = alt.constraints.some(c => /legal|gdpr|rgpd|compliance/i.test(c));
  const score = hasCompliance ? 60 : 80;
  return mkCriterion('LEGAL_COMPLIANCE', score,
    hasCompliance ? 'Compliance constraints detected' : 'No compliance constraints detected');
}

function scoreHumanImpact(alt: DecisionAlternative): DecisionCriterion {
  const hasHumanImpact = alt.risks.some(r => /plantilla|empleado|hr|workforce/i.test(r));
  const score = hasHumanImpact ? 30 : 80;
  return mkCriterion('HUMAN_IMPACT', score,
    hasHumanImpact ? 'Human impact detected' : 'No direct human impact');
}

function scoreCustomerImpact(alt: DecisionAlternative): DecisionCriterion {
  const hasCustomerImpact = alt.expectedBenefits.some(b => /client|customer|cliente/i.test(b));
  const score = hasCustomerImpact ? 75 : 55;
  return mkCriterion('CUSTOMER_IMPACT', score,
    hasCustomerImpact ? 'Positive customer impact' : 'Neutral customer impact');
}

function scoreConfidence(alt: DecisionAlternative): DecisionCriterion {
  const score = alt.requiresHumanApproval ? 50 : 70;
  return mkCriterion('CONFIDENCE', score,
    alt.requiresHumanApproval ? 'Approval required reduces confidence' : 'No approval gate');
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

function mkCriterion(kind: CriterionKind, score: number, explanation: string): DecisionCriterion {
  return {
    kind, weight: DEFAULT_WEIGHTS[kind], score, explanation,
    evidenceReferences: [], uncertainty: clamp(100 - score, 0, 100),
  };
}

function inferAltRiskLevel(alt: DecisionAlternative): RiskLevel {
  const riskStr = alt.risks.join(' ').toLowerCase();
  if (/critical|catastrophi/i.test(riskStr)) return 'CRITICAL';
  if (/high|severo|grave/i.test(riskStr)) return 'HIGH';
  if (/medium|moderado/i.test(riskStr)) return 'MEDIUM';
  return 'LOW';
}

function buildSummary(alt: DecisionAlternative, score: number): string {
  return `"${alt.title}" scored ${score.toFixed(1)} — ${alt.expectedBenefits.length} benefit(s), ${alt.risks.length} risk(s)`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
