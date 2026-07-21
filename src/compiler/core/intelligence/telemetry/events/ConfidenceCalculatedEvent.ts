// ─── ConfidenceCalculated event ─────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface ConfidenceCalculatedEvent extends TelemetryEvent {
  eventType:       'ConfidenceCalculated';
  stage:           IntelligenceStage;
  confidenceScore: number;
  riskLevel:       string | null;
}
