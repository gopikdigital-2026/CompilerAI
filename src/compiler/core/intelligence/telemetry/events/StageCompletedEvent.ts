// ─── StageCompleted event ───────────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface StageCompletedEvent extends TelemetryEvent {
  eventType:       'StageCompleted';
  stage:           IntelligenceStage;
  durationMs:      number;
  confidenceScore: number | null;
  riskLevel:       string | null;
  estimatedCost:   number | null;
  tokensUsed:      number | null;
  resultId:        string | null;
  warnings:        string[];
  errors:          string[];
}
