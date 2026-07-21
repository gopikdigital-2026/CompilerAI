// ─── TraceBuilder ───────────────────────────────────────────────────────────────
// Builds StageTrace and ExecutionTrace objects from raw telemetry data.

import type { StageTrace } from '../models/StageTrace';
import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { TelemetryStageStatus } from '../events/TelemetryEvent';

const VERSION = '1.0.0';

export class TraceBuilder {
  buildStageTrace(
    stageId: string,
    stage: IntelligenceStage,
    status: TelemetryStageStatus,
    startedAt: string,
    completedAt: string | null,
    summary: string,
    engineId: string | null = null,
    resultId: string | null = null,
    warnings: string[] = [],
    errors: string[] = [],
    confidenceScore: number | null = null,
    riskLevel: string | null = null,
    estimatedCost: number | null = null,
    memoryUsageMb: number | null = null,
    tokensUsed: number | null = null,
    modelUsed: string | null = null,
    decisionsEvaluated: number | null = null,
  ): StageTrace {
    const durationMs = completedAt
      ? Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime())
      : null;
    return {
      stageId, stage, status, startedAt, completedAt, durationMs,
      warnings, errors, confidenceScore, riskLevel, estimatedCost,
      memoryUsageMb, tokensUsed, modelUsed, decisionsEvaluated,
      engineId, resultId, summary,
    };
  }

  buildExecutionTrace(
    traceId: string,
    executionId: string,
    requestId: string,
    organizationId: string,
    pipelineStatus: CompilerIntelligenceStatus,
    startedAt: string,
    completedAt: string,
    stages: StageTrace[],
    requiresHumanReview: boolean,
    currentStage: IntelligenceStage,
  ): ExecutionTrace {
    const startedMs = new Date(startedAt).getTime();
    const totalDurationMs = Math.max(0, new Date(completedAt).getTime() - startedMs);

    let finalConfidence: number | null = null;
    let finalRiskLevel: string | null = null;
    let estimatedTotalCost: number | null = null;
    let totalTokensUsed: number | null = null;
    let totalDecisionsEvaluated: number | null = null;

    for (const s of stages) {
      if (s.confidenceScore !== null) finalConfidence = s.confidenceScore;
      if (s.riskLevel !== null) finalRiskLevel = s.riskLevel;
      if (s.estimatedCost !== null) estimatedTotalCost = (estimatedTotalCost ?? 0) + s.estimatedCost;
      if (s.tokensUsed !== null) totalTokensUsed = (totalTokensUsed ?? 0) + s.tokensUsed;
      if (s.decisionsEvaluated !== null) totalDecisionsEvaluated = (totalDecisionsEvaluated ?? 0) + s.decisionsEvaluated;
    }

    return {
      traceId, executionId, requestId, organizationId,
      pipelineStatus, startedAt, completedAt, totalDurationMs,
      stages,
      totalWarnings: stages.reduce((sum, s) => sum + s.warnings.length, 0),
      totalErrors: stages.reduce((sum, s) => sum + s.errors.length, 0),
      totalBlockers: pipelineStatus === 'BLOCKED' ? 1 : 0,
      finalConfidence, finalRiskLevel, estimatedTotalCost, totalTokensUsed,
      totalDecisionsEvaluated,
      requiresHumanReview, currentStage, version: VERSION,
    };
  }

  computeDurationMs(startedAt: string, completedAt: string): number {
    return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
  }
}
