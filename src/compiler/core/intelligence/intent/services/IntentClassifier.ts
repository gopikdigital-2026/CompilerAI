import type { IIntentClassifier } from '../interfaces/IIntentClassifier';
import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { IntentClassification } from '../models/IntentClassification';
import type { IntentCategory } from '../models/IntentCategory';
import type { BusinessArea } from '../models/BusinessArea';
import type { DecisionLevel } from '../models/DecisionLevel';
import type { ComplexityLevel } from '../models/ComplexityLevel';
import type { ImpactLevel } from '../models/ImpactLevel';
import type { Urgency } from '../models/UrgencyLevel';

import {
  scoreCategories, detectContradictions, CategoryScore,
} from '../rules/IntentClassificationRules';
import { scoreAreas } from '../rules/BusinessAreaRules';
import { mapCapabilities } from '../rules/CapabilityMappingRules';

// ─── Intent Classifier ─────────────────────────────────────────────────────────
// Deterministic, rule-based classifier. Turns a validated ContextResult into a
// structured, explainable IntentClassification. No LLM provider coupling.

const SECONDARY_INTENT_THRESHOLD = 25;   // minimum score to count as a secondary intent
const DOMINANCE_RATIO = 0.6;             // primary must be >= 60% of top score to be unambiguous

export class IntentClassifier implements IIntentClassifier {
  readonly id = 'intent-classifier-v1';

  classify(context: ContextResult, request?: ContextRequest): IntentClassification {
    this.assertValid(context);

    const categoryScores = scoreCategories(context, request);
    const areaScores    = scoreAreas(context, request);

    const primaryIntent = this.pickPrimary(categoryScores);
    const secondaryIntents = this.pickSecondary(categoryScores, primaryIntent);
    const businessArea  = this.pickArea(areaScores);
    const decisionLevel = this.deriveDecisionLevel(primaryIntent, businessArea, context);
    const urgency       = this.deriveUrgency(context);
    const impact        = this.deriveImpact(primaryIntent, businessArea, context);
    const complexity    = this.deriveComplexity(context, secondaryIntents.length);

    const mapping = mapCapabilities(primaryIntent, businessArea);
    const secondaryMapping = secondaryIntents.map(c => mapCapabilities(c, businessArea));
    const requiredCapabilities = dedupe([
      ...mapping.capabilities,
      ...secondaryMapping.flatMap(m => m.capabilities),
    ]);

    const { confidenceScore, ambiguityScore } = this.scoreConfidence(
      context, categoryScores, areaScores, secondaryIntents.length, request,
    );

    const classificationReasons = this.buildReasons(categoryScores, areaScores);
    const assumptions = this.buildAssumptions(context, primaryIntent, businessArea);

    return {
      primaryIntent,
      secondaryIntents,
      businessArea,
      decisionLevel,
      urgency,
      impact,
      complexity,
      requiredCapabilities:   requiredCapabilities,
      suggestedAgentTypes:     dedupe([
        ...mapping.agentTypes,
        ...secondaryMapping.flatMap(m => m.agentTypes),
      ]),
      suggestedToolCategories: dedupe([
        ...mapping.toolCategories,
        ...secondaryMapping.flatMap(m => m.toolCategories),
      ]),
      confidenceScore,
      ambiguityScore,
      classificationReasons,
      assumptions,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private assertValid(context: ContextResult): void {
    if (!context || !context.requestId) {
      throw new Error('IntentClassifier: invalid context result');
    }
  }

  private pickPrimary(scores: CategoryScore[]): IntentCategory {
    const top = scores[0];
    if (!top || top.score === 0) return 'UNKNOWN';
    return top.category;
  }

  private pickSecondary(scores: CategoryScore[], primary: IntentCategory): IntentCategory[] {
    return scores
      .filter(s => s.category !== primary && s.score >= SECONDARY_INTENT_THRESHOLD)
      .slice(0, 3)
      .map(s => s.category);
  }

  private pickArea(scores: ReturnType<typeof scoreAreas>): BusinessArea {
    const top = scores[0];
    if (!top || top.score === 0) return 'UNKNOWN';
    return top.area;
  }

  private deriveDecisionLevel(
    primary: IntentCategory, area: BusinessArea, context: ContextResult,
  ): DecisionLevel {
    if (primary === 'EXECUTE' && context.constraints.some(c => c.type === 'compliance')) {
      return 'EXECUTIVE';
    }
    if (area === 'STRATEGY' || primary === 'DECIDE' || primary === 'PLAN') {
      return 'STRATEGIC';
    }
    if (primary === 'OPTIMIZE' || primary === 'RECOMMEND' || primary === 'PREDICT') {
      return 'TACTICAL';
    }
    return 'OPERATIONAL';
  }

  private deriveUrgency(context: ContextResult): Urgency {
    // Context urgency is carried in the originating BusinessContext, but
    // ContextResult does not surface it. We infer from constraints.
    const hasDeadline = context.constraints.some(c => c.type === 'deadline');
    if (context.status === 'BLOCKED') return 'normal';
    return hasDeadline ? 'high' : 'normal';
  }

  private deriveImpact(
    primary: IntentCategory, area: BusinessArea, context: ContextResult,
  ): ImpactLevel {
    // Restricted entities or compliance constraints mandate at least HIGH impact.
    const hasRestricted =
      context.entities.some(e => e.classification === 'RESTRICTED') ||
      context.constraints.some(c => c.classification === 'RESTRICTED' || c.type === 'compliance');
    if (primary === 'EXECUTE' && area === 'HUMAN_RESOURCES') return 'CRITICAL';
    if (hasRestricted && (primary === 'EXECUTE' || primary === 'UNKNOWN')) return 'HIGH';
    if (primary === 'EXECUTE' || primary === 'DECIDE') return 'HIGH';
    if (area === 'STRATEGY' || area === 'FINANCE') return 'HIGH';
    if (hasRestricted) return 'HIGH';
    if (primary === 'OPTIMIZE' || primary === 'PREDICT') return 'MEDIUM';
    if (context.entities.length === 0) return 'LOW';
    return 'MEDIUM';
  }

  private deriveComplexity(context: ContextResult, secondaryCount: number): ComplexityLevel {
    const signals = context.entities.length + context.constraints.length + secondaryCount;
    if (signals >= 6) return 'VERY_HIGH';
    if (signals >= 4) return 'HIGH';
    if (signals >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private scoreConfidence(
    context: ContextResult,
    categoryScores: CategoryScore[],
    areaScores: ReturnType<typeof scoreAreas>,
    secondaryCount: number,
    request?: ContextRequest,
  ): { confidenceScore: number; ambiguityScore: number } {
    const topCategory = categoryScores[0]?.score ?? 0;
    const secondCategory = categoryScores[1]?.score ?? 0;
    const topArea = areaScores[0]?.score ?? 0;

    // ── Confidence signals ────────────────────────────────────────────────────
    let confidence = 0;
    if (topCategory > 0) confidence += 30;
    if (topCategory >= 50) confidence += 15;
    if (topArea > 0) confidence += 15;
    if (context.objectives.length > 0) confidence += 10;
    if (context.entities.length > 0) confidence += 10;
    if (context.constraints.length > 0) confidence += 10;
    if (context.sufficiencyScore >= 75) confidence += 10;

    // ── Ambiguity signals ──────────────────────────────────────────────────────
    let ambiguity = 0;
    if (topCategory === 0) ambiguity += 40;
    if (topArea === 0) ambiguity += 20;
    if (context.objectives.length === 0) ambiguity += 15;
    if (context.entities.length === 0) ambiguity += 10;
    if (secondaryCount >= 2) ambiguity += 15;
    if (secondCategory > 0 && topCategory > 0 && (secondCategory / topCategory) > DOMINANCE_RATIO) {
      ambiguity += 10;
    }
    if (context.missingInformation.some(g => g.severity === 'high' || g.severity === 'critical')) {
      ambiguity += 15;
    }
    // No entities AND no constraints means the request is too vague to act on,
    // even if a lexical intent pattern matched.
    if (context.entities.length === 0 && context.constraints.length === 0) {
      ambiguity += 20;
    }
    // Very short prompts carry almost no signal — boost ambiguity.
    const promptLen = request?.prompt?.length ?? 0;
    if (promptLen > 0 && promptLen < 25) ambiguity += 20;

    // Contradictions boost ambiguity.
    const contradictions = detectContradictions(categoryScores);
    ambiguity += contradictions.length * 10;

    confidence = clamp(confidence, 0, 100);
    ambiguity   = clamp(ambiguity, 0, 100);

    return { confidenceScore: confidence, ambiguityScore: ambiguity };
  }

  private buildReasons(
    categoryScores: CategoryScore[], areaScores: ReturnType<typeof scoreAreas>,
  ): string[] {
    const reasons: string[] = [];
    const topCat = categoryScores[0];
    if (topCat && topCat.score > 0) {
      reasons.push(`Intención principal "${topCat.category}" (${topCat.score} pts): ${topCat.reasons.join('; ')}`);
    } else {
      reasons.push('No se detectaron señales léxicas suficientes para una intención principal.');
    }
    const topArea = areaScores[0];
    if (topArea && topArea.score > 0) {
      reasons.push(`Área empresarial "${topArea.area}" (${topArea.score} pts): ${topArea.reasons.join('; ')}`);
    }
    return reasons;
  }

  private buildAssumptions(
    context: ContextResult, primary: IntentCategory, area: BusinessArea,
  ): string[] {
    const assumptions: string[] = [];
    if (primary === 'UNKNOWN') {
      assumptions.push('No se identificó una intención clara; se asume intención general.');
    }
    if (area === 'UNKNOWN') {
      assumptions.push('No se identificó un área empresarial; se asume ámbito general.');
    }
    if (context.objectives.length === 0) {
      assumptions.push('No se detectaron objetivos explícitos; se asume objetivo exploratorio.');
    }
    return assumptions;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function dedupe<T>(items: readonly T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const item of items) {
    if (!seen.has(item)) { seen.add(item); out.push(item); }
  }
  return out;
}
