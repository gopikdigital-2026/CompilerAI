// ─── StageFailed event ──────────────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface StageFailedEvent extends TelemetryEvent {
  eventType:  'StageFailed';
  stage:      IntelligenceStage;
  durationMs: number;
  errors:     string[];
}
