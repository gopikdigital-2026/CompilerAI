// ─── PipelineBlocked event ──────────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface PipelineBlockedEvent extends TelemetryEvent {
  eventType: 'PipelineBlocked';
  stage:     IntelligenceStage | null;
  blockers:  string[];
}
