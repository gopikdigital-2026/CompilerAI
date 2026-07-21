// ─── HumanReviewRequested event ─────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface HumanReviewRequestedEvent extends TelemetryEvent {
  eventType: 'HumanReviewRequested';
  stage:     IntelligenceStage | null;
  reason:    string;
}
