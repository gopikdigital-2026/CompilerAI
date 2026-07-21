// ─── ExplainabilityBuilder ──────────────────────────────────────────────────────
// Builds ExplainabilityRecord from an ExecutionTrace and pipeline results.

import type { ExplainabilityRecord, DecisionSummary, AlternativeSummary } from '../models/ExplainabilityRecord';
import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';

export interface ExplainabilityBuilderDeps {
  idGenerator: () => string;
  clock:       () => string;
}

export class ExplainabilityBuilder {
  constructor(private readonly deps: ExplainabilityBuilderDeps) {}

  build(
    trace: ExecutionTrace,
    results?: {
      decisionResult?:   DecisionResult | null;
      confidenceResult?: ConfidenceResult | null;
      executionPlan?:    ExecutionPlan | null;
    },
  ): ExplainabilityRecord {
    const strengths: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];
    const rationales: string[] = [];
    const risks: string[] = [];
    const uncertainties: string[] = [];

    let acceptedDecisions: DecisionSummary[] = [];
    let rejectedDecisions: DecisionSummary[] = [];
    const alternativesEvaluated: AlternativeSummary[] = [];

    if (results?.decisionResult) {
      const dr = results.decisionResult;
      acceptedDecisions = dr.decisions
        .filter(d => d.status === 'READY' || d.status === 'REQUIRES_APPROVAL')
        .map(d => ({
          decisionId: d.decisionId, title: d.title, status: d.status,
          accepted: true, rationale: d.rationale.selectionReason,
          riskLevel: d.riskLevel, confidenceScore: d.confidenceScore,
        }));
      rejectedDecisions = dr.decisions
        .filter(d => d.status === 'BLOCKED' || d.status === 'INVALID')
        .map(d => ({
          decisionId: d.decisionId, title: d.title, status: d.status,
          accepted: false, rationale: d.rationale.selectionReason,
          riskLevel: d.riskLevel, confidenceScore: d.confidenceScore,
        }));

      for (const d of dr.decisions) {
        rationales.push(`${d.title}: ${d.rationale.selectionReason}`);
        for (const r of d.rationale.remainingRisks) risks.push(r);
        for (const ra of d.rationale.rejectedAlternatives) {
          alternativesEvaluated.push({
            alternativeId: ra.alternativeId, title: '',
            score: null, accepted: false, rejectionReason: ra.reason,
          });
        }
      }

      for (const d of dr.decisions) {
        for (const a of d.alternatives) {
          if (!alternativesEvaluated.some(av => av.alternativeId === a.alternativeId)) {
            const bestEval = a.evaluations.length > 0 ? a.evaluations[0] : null;
            alternativesEvaluated.push({
              alternativeId: a.alternativeId, title: a.title,
              score: bestEval?.weightedScore ?? null,
              accepted: a.alternativeId === d.recommendedAlternativeId,
              rejectionReason: a.alternativeId === d.recommendedAlternativeId ? null : 'Not recommended',
            });
          }
        }
      }

      for (const r of dr.risks) risks.push(`${r.kind} (${r.level}): ${r.description}`);
    }

    if (results?.confidenceResult) {
      const cr = results.confidenceResult;
      for (const u of cr.uncertainties) uncertainties.push(`${u.type}: ${u.description}`);
      if (cr.assumptions.length > 0) uncertainties.push(...cr.assumptions.map(a => `Assumption: ${a}`));
      if (cr.requiresMoreData) concerns.push('Confidence engine indicates more data is needed.');
      if (cr.requiresClarification) concerns.push('Confidence engine indicates clarification is needed.');
      if (cr.requiresHumanReview) concerns.push('Confidence engine requests human review.');
    }

    if (results?.executionPlan) {
      for (const r of results.executionPlan.risks) {
        if (!risks.some(x => x.includes(r.description))) risks.push(`${r.kind} (${r.level}): ${r.description}`);
      }
    }

    for (const s of trace.stages) {
      if (s.status === 'COMPLETED' && s.errors.length === 0) {
        strengths.push(`${s.stage} completed in ${s.durationMs ?? '?'}ms.`);
      }
      if (s.errors.length > 0) concerns.push(`${s.stage} produced ${s.errors.length} error(s).`);
      if (s.warnings.length > 0) concerns.push(`${s.stage} produced ${s.warnings.length} warning(s).`);
    }

    const outcomeReasons: Record<string, string> = {
      COMPLETED: 'All pipeline stages completed successfully.',
      NEEDS_DATA: 'Pipeline paused because required data was missing.',
      NEEDS_CLARIFICATION: 'Pipeline paused because the request was ambiguous.',
      REQUIRES_APPROVAL: 'Pipeline paused pending human approval.',
      BLOCKED: 'Pipeline was blocked by one or more blockers.',
      FAILED: 'Pipeline failed due to one or more errors.',
    };

    if (trace.pipelineStatus === 'BLOCKED') {
      concerns.push('Pipeline was blocked and could not complete.');
      recommendations.push('Review blockers and provide missing data before retrying.');
    } else if (trace.pipelineStatus === 'NEEDS_DATA') {
      recommendations.push('Provide the missing data identified in the warnings.');
    } else if (trace.pipelineStatus === 'NEEDS_CLARIFICATION') {
      recommendations.push('Clarify the ambiguous parts of the request.');
    } else if (trace.pipelineStatus === 'REQUIRES_APPROVAL') {
      recommendations.push('A human reviewer must approve before proceeding.');
    } else if (trace.pipelineStatus === 'FAILED') {
      recommendations.push('Investigate the errors and retry with corrected input.');
    } else if (trace.pipelineStatus === 'COMPLETED') {
      strengths.push('Pipeline completed without blockers.');
    }

    if (trace.requiresHumanReview) concerns.push('Human review was requested during execution.');
    if (trace.finalConfidence !== null && trace.finalConfidence < 60) {
      concerns.push(`Low final confidence score: ${trace.finalConfidence}/100.`);
    }

    const confidenceScore = results?.confidenceResult?.overallScore ?? trace.finalConfidence;

    return {
      explainabilityId: this.deps.idGenerator(),
      executionId: trace.executionId,
      requestId: trace.requestId,
      organizationId: trace.organizationId,
      summary: `Pipeline ${trace.pipelineStatus} after ${trace.stages.length} stage(s) in ${trace.totalDurationMs ?? '?'}ms.`,
      acceptedDecisions, rejectedDecisions, rationales, risks, uncertainties,
      alternativesEvaluated, confidenceScore,
      outcomeReason: outcomeReasons[trace.pipelineStatus] ?? 'Unknown outcome.',
      strengths, concerns, recommendations,
      createdAt: this.deps.clock(),
    };
  }
}
