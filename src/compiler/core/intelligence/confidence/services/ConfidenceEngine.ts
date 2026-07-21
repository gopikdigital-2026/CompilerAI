// ─── Confidence engine ─────────────────────────────────────────────────────────
// Top-level orchestrator that produces a ConfidenceResult from existing
// engine artifacts.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ConfidenceResult } from '../models/ConfidenceResult';
import type { ConfidenceAssessment } from '../models/ConfidenceAssessment';
import type { UncertaintyItem } from '../models/UncertaintyItem';
import type { EvidenceItem } from '../models/EvidenceItem';
import type { IConfidenceEngine, ConfidenceEngineDeps } from '../interfaces/IConfidenceEngine';
import { ConfidenceCalculator } from './ConfidenceCalculator';
import { UncertaintyAnalyzer } from './UncertaintyAnalyzer';
import { EvidenceEvaluator } from './EvidenceEvaluator';
import { ConfidenceValidator } from './ConfidenceValidator';
import { DEFAULT_FACTOR_WEIGHTS, levelFromScore } from '../rules/ConfidenceRules';
import { evaluateHumanEscalation, shouldEscalate } from '../rules/HumanEscalationRules';
import { evaluateBlocking, shouldBlock } from '../rules/BlockingRules';

const VERSION = '1.0.0';

export class ConfidenceEngine implements IConfidenceEngine {
  private readonly calculator: ConfidenceCalculator;
  private readonly uncertaintyAnalyzer: UncertaintyAnalyzer;
  private readonly evidenceEvaluator: EvidenceEvaluator;
  private readonly validator: ConfidenceValidator;

  constructor(private readonly deps: ConfidenceEngineDeps) {
    this.calculator = new ConfidenceCalculator({ factorWeights: deps.factorWeights });
    this.uncertaintyAnalyzer = new UncertaintyAnalyzer();
    this.evidenceEvaluator = new EvidenceEvaluator();
    this.validator = new ConfidenceValidator();
  }

  evaluate(request: ConfidenceRequest): ConfidenceResult {
    // 1. Per-source assessments
    const assessments: ConfidenceAssessment[] = [];
    const ctxAssessment = this.calculator.assessContext(request);
    if (ctxAssessment) assessments.push(ctxAssessment);
    const intentAssessment = this.calculator.assessIntent(request);
    if (intentAssessment) assessments.push(intentAssessment);
    const planAssessment = this.calculator.assessPlan(request);
    if (planAssessment) assessments.push(planAssessment);
    const decisionAssessment = this.calculator.assessDecision(request);
    if (decisionAssessment) assessments.push(decisionAssessment);

    // 2. Aggregate
    const { overallScore, positiveFactors, negativeFactors } =
      this.calculator.aggregate(assessments, request);

    // 3. Uncertainties
    const uncertainties: UncertaintyItem[] = this.uncertaintyAnalyzer.analyze(request);

    // 4. Evidence
    const evidence: EvidenceItem[] = this.evidenceEvaluator.collect(request);
    const missingEvidence: string[] = this.evidenceEvaluator.missingEvidence(request);

    // 5. Contradictions and assumptions
    const contradictions: string[] = [];
    const assumptions: string[] = [];
    for (const a of assessments) {
      contradictions.push(...a.contradictions);
      assumptions.push(...a.assumptions);
    }

    // 6. Marginal alternative gap detection
    let marginalAlternativeGap = false;
    if (request.decisionResult) {
      for (const item of request.decisionResult.decisions) {
        const evals = item.alternatives
          .flatMap(a => a.evaluations)
          .sort((a, b) => b.weightedScore - a.weightedScore);
        if (evals.length >= 2 && (evals[0].weightedScore - evals[1].weightedScore) < 5) {
          marginalAlternativeGap = true;
          break;
        }
      }
    }

    // 7. Human escalation
    const escalationReasons = evaluateHumanEscalation({
      overallScore,
      minimumConfidenceThreshold: request.minimumConfidenceThreshold,
      ctx: request.contextResult,
      intent: request.intentResult,
      plan: request.executionPlan,
      decision: request.decisionResult,
      missingCriticalEvidence: missingEvidence.length > 0,
      marginalAlternativeGap,
    });
    const requiresHumanReview = shouldEscalate(escalationReasons);

    // 8. Blocking
    const blockingReasons = evaluateBlocking({
      ctx: request.contextResult,
      intent: request.intentResult,
      plan: request.executionPlan,
      decision: request.decisionResult,
      overallScore,
      missingEvidenceCount: missingEvidence.length,
      contradictions,
    });
    const blocked = shouldBlock(blockingReasons);

    // 9. Flags
    const requiresMoreData = uncertainties.some(u => u.type === 'MISSING_DATA')
      || (request.contextResult?.status === 'NEEDS_DATA')
      || (request.executionPlan?.status === 'NEEDS_DATA')
      || (request.decisionResult?.requiresMoreData ?? false);
    const requiresClarification = uncertainties.some(u => u.type === 'AMBIGUOUS_OBJECTIVE')
      || (request.contextResult?.status === 'NEEDS_CLARIFICATION')
      || (request.intentResult?.requiresClarification ?? false)
      || (request.decisionResult?.requiresClarification ?? false);

    // 10. Status determination
    const status = this.determineStatus({
      blocked, requiresHumanReview, requiresMoreData, requiresClarification,
      overallScore, threshold: request.minimumConfidenceThreshold,
      ctx: request.contextResult, intent: request.intentResult,
      plan: request.executionPlan, decision: request.decisionResult,
    });

    // 11. Recommended actions
    const recommendedActions = this.buildRecommendedActions({
      requiresMoreData, requiresClarification, requiresHumanReview, blocked,
      escalationReasons: escalationReasons.map(r => r.description),
      blockingReasons: blockingReasons.map(r => r.description),
      missingEvidence,
    });

    // 12. Explanation
    const explanation = this.buildExplanation({
      overallScore, status, assessments,
      positiveCount: positiveFactors.length,
      negativeCount: negativeFactors.length,
      uncertaintyCount: uncertainties.length,
      evidenceCount: evidence.length,
      missingEvidenceCount: missingEvidence.length,
    });

    // 13. Assemble result
    const result: ConfidenceResult = {
      confidenceResultId: this.deps.idGenerator(),
      requestId: request.requestId,
      organizationId: request.organizationId,
      overallScore,
      level: levelFromScore(overallScore),
      status,
      assessments,
      positiveFactors,
      negativeFactors,
      uncertainties,
      evidence,
      missingEvidence,
      contradictions,
      assumptions,
      requiresMoreData,
      requiresClarification,
      requiresHumanReview,
      blocked,
      recommendedActions,
      explanation,
      createdAt: this.deps.clock(),
      version: VERSION,
    };

    // 14. Validate
    const validation = this.validator.validate(result);
    if (!validation.valid) {
      // Return result with INVALID status if validation fails
      result.status = 'INVALID';
      result.recommendedActions = [...result.recommendedActions, ...validation.errors];
    }

    return result;
  }

  private determineStatus(input: {
    blocked: boolean;
    requiresHumanReview: boolean;
    requiresMoreData: boolean;
    requiresClarification: boolean;
    overallScore: number;
    threshold: number;
    ctx?: ConfidenceRequest['contextResult'];
    intent?: ConfidenceRequest['intentResult'];
    plan?: ConfidenceRequest['executionPlan'];
    decision?: ConfidenceRequest['decisionResult'];
  }): ConfidenceResult['status'] {
    // Check for invalid source results
    if (input.ctx?.status === 'BLOCKED' || input.intent?.status === 'BLOCKED'
      || input.plan?.status === 'INVALID' || input.plan?.status === 'BLOCKED'
      || input.decision?.status === 'INVALID' || input.decision?.status === 'BLOCKED') {
      return 'BLOCKED';
    }
    if (input.blocked) return 'BLOCKED';
    if (input.requiresClarification) return 'NEEDS_CLARIFICATION';
    if (input.requiresMoreData) return 'NEEDS_DATA';
    if (input.requiresHumanReview) return 'HUMAN_REVIEW_REQUIRED';
    if (input.overallScore >= input.threshold) return 'ACCEPTABLE';
    return 'HUMAN_REVIEW_REQUIRED';
  }

  private buildRecommendedActions(input: {
    requiresMoreData: boolean;
    requiresClarification: boolean;
    requiresHumanReview: boolean;
    blocked: boolean;
    escalationReasons: string[];
    blockingReasons: string[];
    missingEvidence: string[];
  }): string[] {
    const actions: string[] = [];
    if (input.blocked) {
      actions.push('Result is blocked. Address blocking reasons before proceeding.');
      actions.push(...input.blockingReasons);
    } else {
      if (input.requiresClarification) {
        actions.push('Clarify ambiguous objectives and constraints.');
      }
      if (input.requiresMoreData) {
        actions.push('Gather additional data to fill information gaps.');
        actions.push(...input.missingEvidence);
      }
      if (input.requiresHumanReview) {
        actions.push('Submit for human review before proceeding.');
        actions.push(...input.escalationReasons);
      }
    }
    if (actions.length === 0) {
      actions.push('Confidence is acceptable. Proceed with execution.');
    }
    return actions;
  }

  private buildExplanation(input: {
    overallScore: number;
    status: ConfidenceResult['status'];
    assessments: ConfidenceAssessment[];
    positiveCount: number;
    negativeCount: number;
    uncertaintyCount: number;
    evidenceCount: number;
    missingEvidenceCount: number;
  }): string {
    const parts: string[] = [];
    parts.push(`Overall confidence score: ${input.overallScore}/100 (${levelFromScore(input.overallScore)}).`);
    parts.push(`Status: ${input.status}.`);
    parts.push(`${input.assessments.length} source(s) assessed.`);
    parts.push(`${input.positiveCount} positive factor(s), ${input.negativeCount} negative factor(s).`);
    parts.push(`${input.uncertaintyCount} uncertainty item(s) detected.`);
    parts.push(`${input.evidenceCount} evidence item(s) collected, ${input.missingEvidenceCount} missing.`);
    return parts.join(' ');
  }
}

// Re-export for convenience
export { DEFAULT_FACTOR_WEIGHTS };
