// ─── Telemetry event types ──────────────────────────────────────────────────────
// All events that can be emitted by the telemetry engine.

import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';

export type TelemetryEventType =
  | 'StageStarted'
  | 'StageCompleted'
  | 'StageFailed'
  | 'PipelineBlocked'
  | 'HumanReviewRequested'
  | 'ConfidenceCalculated'
  | 'DecisionRejected'
  | 'PipelineStarted'
  | 'PipelineCompleted';

export const TELEMETRY_EVENT_TYPES: readonly TelemetryEventType[] = [
  'PipelineStarted', 'StageStarted', 'StageCompleted', 'StageFailed',
  'PipelineBlocked', 'HumanReviewRequested', 'ConfidenceCalculated',
  'DecisionRejected', 'PipelineCompleted',
] as const;

/** Stage-level status at the time of the event. */
export type TelemetryStageStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED'
  | 'REQUIRES_REVIEW';

export type { IntelligenceStage, CompilerIntelligenceStatus };
