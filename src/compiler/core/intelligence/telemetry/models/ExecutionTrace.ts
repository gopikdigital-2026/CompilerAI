// ─── Execution trace ────────────────────────────────────────────────────────────
// Full pipeline trace containing all stage traces and aggregate metrics.

import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { StageTrace } from './StageTrace';

export interface ExecutionTrace {
  traceId:              string;
  executionId:          string;
  requestId:            string;
  organizationId:       string;
  pipelineStatus:       CompilerIntelligenceStatus;
  startedAt:            string;   // ISO
  completedAt:           string | null;  // ISO
  totalDurationMs:      number | null;
  stages:               StageTrace[];
  totalWarnings:        number;
  totalErrors:          number;
  totalBlockers:        number;
  finalConfidence:      number | null;  // 0–100
  finalRiskLevel:       string | null;
  estimatedTotalCost:   number | null;
  totalTokensUsed:      number | null;
  totalDecisionsEvaluated: number | null;
  requiresHumanReview:  boolean;
  currentStage:         IntelligenceStage;
  version:              string;
}
