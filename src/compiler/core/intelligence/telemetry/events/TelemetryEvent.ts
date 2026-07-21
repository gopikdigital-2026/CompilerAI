// ─── Telemetry event base ──────────────────────────────────────────────────────
// Base type for all telemetry events and the canonical event type registry.

import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';

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

export type TelemetryStageStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'SKIPPED'
  | 'REQUIRES_REVIEW';

/** Base shape shared by all concrete telemetry events. */
export interface TelemetryEvent {
  eventId:        string;
  eventType:      TelemetryEventType;
  executionId:    string;
  requestId:      string;
  organizationId: string;
  timestamp:      string;   // ISO
  summary:        string;
  metadata:       Record<string, unknown>;
}

export type { IntelligenceStage, CompilerIntelligenceStatus };
