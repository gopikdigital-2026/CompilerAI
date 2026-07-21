// ─── Explainability record ──────────────────────────────────────────────────────
// Human-readable record explaining what happened during a pipeline execution.

import type { ExecutionTrace } from './ExecutionTrace';
import type { StageTrace } from './StageTrace';

export interface ExplainabilityRecord {
  explainabilityId:    string;
  executionId:         string;
  requestId:           string;
  organizationId:      string;
  /** Plain-language summary of the pipeline outcome. */
  summary:             string;
  /** Per-stage explanations. */
  stageExplanations:   StageExplanation[];
  /** Why the pipeline ended in its current status. */
  outcomeReason:       string;
  /** What was done well. */
  strengths:           string[];
  /** What could be improved or what blocked progress. */
  concerns:            string[];
  /** Recommended next actions. */
  recommendations:     string[];
  createdAt:           string;   // ISO
}

export interface StageExplanation {
  stage:        string;
  explanation:  string;
  durationMs:   number | null;
  success:      boolean;
}

export function buildStageExplanations(stages: StageTrace[]): StageExplanation[] {
  return stages.map(s => ({
    stage: s.stage,
    explanation: s.summary,
    durationMs: s.durationMs,
    success: s.status === 'COMPLETED',
  }));
}

export function buildExplainabilityFromTrace(
  trace: ExecutionTrace,
  idGenerator: () => string,
  clock: () => string,
): ExplainabilityRecord {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const recommendations: string[] = [];

  for (const s of trace.stages) {
    if (s.status === 'COMPLETED' && (s.errors.length === 0)) {
      strengths.push(`${s.stage} completed successfully in ${s.durationMs ?? '?'}ms.`);
    }
    if (s.errors.length > 0) {
      concerns.push(`${s.stage} produced ${s.errors.length} error(s).`);
    }
    if (s.warnings.length > 0) {
      concerns.push(`${s.stage} produced ${s.warnings.length} warning(s).`);
    }
  }

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

  if (trace.requiresHumanReview) {
    concerns.push('Human review was requested during execution.');
  }

  if (trace.finalConfidence !== null && trace.finalConfidence < 60) {
    concerns.push(`Low final confidence score: ${trace.finalConfidence}/100.`);
  }

  const outcomeReasons: Record<string, string> = {
    COMPLETED: 'All pipeline stages completed successfully.',
    NEEDS_DATA: 'Pipeline paused because required data was missing.',
    NEEDS_CLARIFICATION: 'Pipeline paused because the request was ambiguous.',
    REQUIRES_APPROVAL: 'Pipeline paused pending human approval.',
    BLOCKED: 'Pipeline was blocked by one or more blockers.',
    FAILED: 'Pipeline failed due to one or more errors.',
  };

  return {
    explainabilityId: idGenerator(),
    executionId: trace.executionId,
    requestId: trace.requestId,
    organizationId: trace.organizationId,
    summary: `Pipeline ${trace.pipelineStatus} after ${trace.stages.length} stage(s) in ${trace.totalDurationMs ?? '?'}ms.`,
    stageExplanations: buildStageExplanations(trace.stages),
    outcomeReason: outcomeReasons[trace.pipelineStatus] ?? 'Unknown outcome.',
    strengths,
    concerns,
    recommendations,
    createdAt: clock(),
  };
}
