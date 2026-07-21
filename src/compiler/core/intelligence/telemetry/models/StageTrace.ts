// ─── Stage trace ────────────────────────────────────────────────────────────────
// Per-stage execution record with full metrics.

import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { TelemetryStageStatus } from '../events/TelemetryEvent';

export interface StageTrace {
  stageId:           string;
  stage:             IntelligenceStage;
  status:            TelemetryStageStatus;
  startedAt:         string;   // ISO
  completedAt:       string | null;  // ISO
  durationMs:        number | null;
  warnings:          string[];
  errors:            string[];
  confidenceScore:   number | null;  // 0–100
  riskLevel:         string | null;   // RiskLevel
  estimatedCost:     number | null;   // abstract units
  memoryUsageMb:     number | null;
  tokensUsed:        number | null;
  modelUsed:         string | null;
  decisionsEvaluated: number | null;
  engineId:          string | null;
  resultId:          string | null;
  summary:           string;
}
