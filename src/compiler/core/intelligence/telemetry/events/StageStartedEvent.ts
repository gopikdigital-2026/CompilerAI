// ─── StageStarted event ─────────────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface StageStartedEvent extends TelemetryEvent {
  eventType: 'StageStarted';
  stage:     IntelligenceStage;
  engineId:  string | null;
}
