// ─── Stage trace ────────────────────────────────────────────────────────────────
// Per-stage execution record with metrics.

import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { TelemetryStageStatus } from './TelemetryEvent';

export interface StageTrace {
  stageId:        string;
  stage:          IntelligenceStage;
  status:         TelemetryStageStatus;
  startedAt:      string;   // ISO
  completedAt:    string | null;  // ISO
  durationMs:     number | null;
  warnings:       string[];
  errors:         string[];
  confidenceScore: number | null;  // 0–100
  riskLevel:      string | null;   // RiskLevel
  estimatedCost:  number | null;   // abstract units
  tokensUsed:     number | null;
  engineId:       string | null;
  resultId:       string | null;
  summary:        string;
}
