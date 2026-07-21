import type { IDecisionEngine, DecisionEngineDeps } from '../interfaces/IDecisionEngine';
import type { IDecisionExtractor } from '../interfaces/IDecisionExtractor';
import type { IAlternativeGenerator } from '../interfaces/IAlternativeGenerator';
import type { IAlternativeEvaluator } from '../interfaces/IAlternativeEvaluator';
import type { IConflictDetector } from '../interfaces/IConflictDetector';
import type { IDecisionValidator } from '../interfaces/IDecisionValidator';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionResult } from '../models/DecisionResult';
import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { DecisionConflict } from '../models/DecisionConflict';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import type { PlanRisk } from '../../planning/models/PlanRisk';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import { DecisionExtractor } from './DecisionExtractor';
import { AlternativeGenerator } from './AlternativeGenerator';
import { AlternativeEvaluator } from './AlternativeEvaluator';
import { ConflictDetector } from './ConflictDetector';
import { DecisionValidator } from './DecisionValidator';
import { evaluateDecisionApproval } from '../rules/ApprovalDecisionRules';
import { evaluateReplanning } from '../rules/ReplanningRules';
import { InvalidDecisionInputError } from '../errors/InvalidDecisionInputError';
import { DecisionBlockedError } from '../errors/DecisionBlockedError';
import { maxRiskLevel } from '../../planning/rules/RiskClassificationRules';

// ─── Decision Engine ───────────────────────────────────────────────────────────
// Orchestrates the decision pipeline:
// ExecutionPlan → DecisionExtractor → AlternativeGenerator → AlternativeEvaluator
// → ConflictDetector → DecisionValidator → DecisionResult.
// Contains no business rules of its own.

const DEFAULT_ID_GENERATOR = (): string => `decision-result-${Math.random().toString(36).slice(2, 10)}`;
const DEFAULT_CLOCK = (): string => new Date().toISOString();

export class DecisionEngine implements IDecisionEngine {
  readonly id = 'decision-engine-v1';

  async decide(request: DecisionRequest, deps?: DecisionEngineDeps): Promise<DecisionResult> {
    // ── Validate input ──────────────────────────────────────────────────────────
    if (!request?.executionPlan?.planId) {
      throw new InvalidDecisionInputError('INVALID_PLAN', 'DecisionRequest has no valid ExecutionPlan');
    }

    // ── Resolve components ────────────────────────────────────────────────────────
    const extractor  = (deps?.extractor  as IDecisionExtractor | undefined)       ?? new DecisionExtractor();
    const generator  = (deps?.generator  as IAlternativeGenerator | undefined)     ?? new AlternativeGenerator();
    const evaluator  = (deps?.evaluator  as IAlternativeEvaluator | undefined)     ?? new AlternativeEvaluator();
    const conflictDetector = (deps?.conflictDetector as IConflictDetector | undefined) ?? new ConflictDetector();
    const validator  = (deps?.validator  as IDecisionValidator | undefined)       ?? new DecisionValidator();
    const idGenerator = deps?.idGenerator ?? DEFAULT_ID_GENERATOR;
    const clock        = deps?.clock ?? DEFAULT_CLOCK;

    const plan = request.executionPlan;

    // ── Step 1 — Extract decisions ──────────────────────────────────────────────
    const decisions = extractor.extract(plan, request.requestedDecisionScope);

    // ── Step 2 — Generate alternatives ──────────────────────────────────────────
    for (const decision of decisions) {
      const alts = generator.generate(
        decision, request.evaluationPreferences, request.riskTolerance,
      );
      decision.alternatives = alts;
    }

    // ── Step 3 — Evaluate alternatives ──────────────────────────────────────────
    for (const decision of decisions) {
      const evals = evaluator.evaluate(
        decision.alternatives, request.evaluationPreferences, request.riskTolerance,
      );
      // Attach evaluations to alternatives
      for (const alt of decision.alternatives) {
        alt.evaluations = evals.filter(e => e.alternativeId === alt.alternativeId);
      }
      // Select recommended = highest-ranked viable
      const best = evals.find(e => e.viable);
      if (best) {
        decision.recommendedAlternativeId = best.alternativeId;
        const recAlt = decision.alternatives.find(a => a.alternativeId === best.alternativeId);
        decision.rationale = this.buildRationale(decision, recAlt, evals);
      }
    }

    // ── Step 4 — Detect conflicts ────────────────────────────────────────────────
    const conflicts = conflictDetector.detect(decisions);
    for (const d of decisions) {
      d.conflicts = conflicts.filter(c => c.involvedDecisionIds.includes(d.decisionId));
    }

    // ── Step 5 — Evaluate approvals ─────────────────────────────────────────────
    for (const d of decisions) {
      const recAlt = d.alternatives.find(a => a.alternativeId === d.recommendedAlternativeId);
      const approval = evaluateDecisionApproval(d, plan, recAlt);
      if (approval.requiresApproval) {
        d.requiresHumanApproval = true;
        d.approvalReason = approval.reason;
        d.status = 'REQUIRES_APPROVAL';
      }
    }

    // ── Step 6 — Evaluate replanning ─────────────────────────────────────────────
    const replanning = evaluateReplanning(decisions, conflicts, plan, request.riskTolerance);

    // ── Step 7 — Validate ────────────────────────────────────────────────────────
    const validation = validator.validate(decisions, plan);

    // ── Step 8 — Compute overall confidence & risk ───────────────────────────────
    const overallConfidence = this.computeOverallConfidence(decisions, plan);
    const overallRiskLevel = this.computeOverallRisk(decisions, plan);

    // ── Step 9 — Determine missing data & clarification ─────────────────────────
    const missingData = this.collectMissingData(decisions);
    const requiresMoreData = missingData.length > 0 || plan.status === 'NEEDS_DATA';
    const requiresClarification = plan.status === 'NEEDS_CLARIFICATION';
    const clarificationQuestions = requiresClarification
      ? ['Please clarify the request before proceeding with decisions']
      : [];

    // ── Step 10 — Select strategy ────────────────────────────────────────────────
    const primaryDecision = decisions[0];
    const selectedStrategy = primaryDecision?.recommendedAlternativeId
      ? {
          decisionId:    primaryDecision.decisionId,
          alternativeId: primaryDecision.recommendedAlternativeId,
          title:         primaryDecision.alternatives.find(a => a.alternativeId === primaryDecision.recommendedAlternativeId)?.title ?? '',
          rationale:     primaryDecision.rationale.selectionReason,
        }
      : null;

    const rejectedAlternatives = decisions.flatMap(d =>
      d.alternatives.filter(a => a.alternativeId !== d.recommendedAlternativeId),
    );

    const unresolvedConflicts = conflicts.filter(c => !c.resolvable);

    // ── Step 11 — Determine final status ─────────────────────────────────────────
    let status = validation.recommendedStatus;
    if (replanning.requiresReplanning && status === 'READY') {
      status = 'REPLAN_REQUIRED';
    }
    if (requiresMoreData && status === 'READY') {
      status = 'NEEDS_DATA';
    }
    if (requiresClarification) {
      status = 'NEEDS_CLARIFICATION';
    }

    // ── Step 12 — Assemble result ─────────────────────────────────────────────────
    const result: DecisionResult = {
      decisionResultId:           idGenerator(),
      planId:                     plan.planId,
      requestId:                  plan.requestId,
      organizationId:             plan.organizationId,
      intentId:                   plan.intentId,
      status,
      decisions,
      selectedStrategy,
      rejectedAlternatives,
      unresolvedConflicts,
      assumptions:                plan.assumptions,
      risks:                     plan.risks,
      humanApprovalRequirements: plan.humanApprovalRequirements,
      requiresReplanning:        replanning.requiresReplanning,
      replanningReasons:         replanning.reasons,
      requiresMoreData,
      missingData,
      requiresClarification,
      clarificationQuestions,
      overallConfidenceScore:    overallConfidence,
      overallRiskLevel,
      rationaleSummary:          this.buildRationaleSummary(decisions, conflicts),
      createdAt:                 clock(),
      version:                   '1.0',
    };

    // ── Guard: blocked decisions throw ───────────────────────────────────────────
    if (status === 'BLOCKED' && validation.blockers.length > 0) {
      throw new DecisionBlockedError(validation.blockers);
    }

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildRationale(
    decision: DecisionItem, recAlt: DecisionAlternative | undefined,
    evals: DecisionAlternative['evaluations'],
  ): DecisionItem['rationale'] {
    const rejected = decision.alternatives
      .filter(a => a.alternativeId !== decision.recommendedAlternativeId)
      .map(a => ({
        alternativeId: a.alternativeId,
        reason: a.evaluations[0]?.summary ?? 'Lower ranked',
      }));

    return {
      chosenAlternativeId: decision.recommendedAlternativeId,
      chosenTitle: recAlt?.title ?? '',
      selectionReason: recAlt
        ? `Highest weighted score among viable alternatives`
        : 'No viable alternative found',
      rejectedAlternatives: rejected,
      remainingRisks: recAlt?.risks ?? [],
      assumptions: decision.assumptions,
      missingData: recAlt?.requiredData ?? [],
      criteriaSummary: `${evals.length} criteria evaluated`,
    };
  }

  private computeOverallConfidence(decisions: DecisionItem[], plan: ExecutionPlan): number {
    if (decisions.length === 0) return plan.confidenceScore;
    const avg = decisions.reduce((sum, d) => sum + d.confidenceScore, 0) / decisions.length;
    const conflictPenalty = decisions.reduce((sum, d) => sum + d.conflicts.length, 0) * 5;
    return Math.max(0, Math.min(100, Math.round(avg - conflictPenalty)));
  }

  private computeOverallRisk(decisions: DecisionItem[], plan: ExecutionPlan): RiskLevel {
    const decisionRisks = decisions.map(d => d.riskLevel);
    const planRisks = plan.risks.map(r => r.level);
    return maxRiskLevel([...planRisks, ...decisionRisks].map(level => ({ level } as PlanRisk)));
  }

  private collectMissingData(decisions: DecisionItem[]): string[] {
    const missing = new Set<string>();
    for (const d of decisions) {
      for (const alt of d.alternatives) {
        for (const data of alt.requiredData) {
          missing.add(data);
        }
      }
      for (const m of d.rationale.missingData) {
        missing.add(m);
      }
    }
    return Array.from(missing);
  }

  private buildRationaleSummary(
    decisions: DecisionItem[], conflicts: DecisionConflict[],
  ): string {
    const parts: string[] = [];
    parts.push(`${decisions.length} decision(s) evaluated`);
    parts.push(`${conflicts.length} conflict(s) detected`);
    const approvals = decisions.filter(d => d.requiresHumanApproval).length;
    if (approvals > 0) parts.push(`${approvals} decision(s) require human approval`);
    return parts.join('; ');
  }
}
