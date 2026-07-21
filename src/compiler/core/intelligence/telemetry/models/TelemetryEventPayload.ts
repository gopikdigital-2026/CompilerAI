// ─── Telemetry event payload ────────────────────────────────────────────────────
// Concrete event emitted to the event bus.

import type { TelemetryEventType, TelemetryStageStatus } from './TelemetryEvent';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface TelemetryEventPayload {
  eventId:        string;
  eventType:      TelemetryEventType;
  executionId:    string;
  requestId:      string;
  organizationId: string;
  stage:          IntelligenceStage | null;
  stageStatus:    TelemetryStageStatus | null;
  pipelineStatus: CompilerIntelligenceStatus | null;
  timestamp:      string;   // ISO
  durationMs:     number | null;
  confidenceScore: number | null;
  riskLevel:      string | null;
  estimatedCost:  number | null;
  tokensUsed:     number | null;
  warnings:       string[];
  errors:         string[];
  blockers:       string[];
  summary:        string;
  requiresHumanReview: boolean;
  metadata:       Record<string, unknown>;
}
