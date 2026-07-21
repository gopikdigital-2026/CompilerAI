// ─── DecisionRejected event ─────────────────────────────────────────────────────

import type { TelemetryEvent } from './TelemetryEvent';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface DecisionRejectedEvent extends TelemetryEvent {
  eventType: 'DecisionRejected';
  stage:     IntelligenceStage;
  reason:    string;
  rejectedDecisionIds: string[];
}
