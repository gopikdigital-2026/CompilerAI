// ─── Telemetry event factory ────────────────────────────────────────────────────
// Builds telemetry event payloads from stage and pipeline data.

import type { TelemetryEventPayload } from '../models/TelemetryEventPayload';
import type { TelemetryEventType, TelemetryStageStatus } from '../models/TelemetryEvent';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';

export function buildEvent(
  eventType: TelemetryEventType,
  executionId: string,
  requestId: string,
  organizationId: string,
  idGenerator: () => string,
  clock: () => string,
  options: {
    stage?:           IntelligenceStage;
    stageStatus?:     TelemetryStageStatus;
    pipelineStatus?:  CompilerIntelligenceStatus;
    durationMs?:      number | null;
    confidenceScore?: number | null;
    riskLevel?:       string | null;
    estimatedCost?:   number | null;
    tokensUsed?:      number | null;
    warnings?:        string[];
    errors?:          string[];
    blockers?:        string[];
    summary?:         string;
    requiresHumanReview?: boolean;
    metadata?:        Record<string, unknown>;
  } = {},
): TelemetryEventPayload {
  return {
    eventId:        idGenerator(),
    eventType,
    executionId,
    requestId,
    organizationId,
    stage:          options.stage ?? null,
    stageStatus:    options.stageStatus ?? null,
    pipelineStatus: options.pipelineStatus ?? null,
    timestamp:      clock(),
    durationMs:     options.durationMs ?? null,
    confidenceScore: options.confidenceScore ?? null,
    riskLevel:      options.riskLevel ?? null,
    estimatedCost:  options.estimatedCost ?? null,
    tokensUsed:     options.tokensUsed ?? null,
    warnings:       options.warnings ?? [],
    errors:         options.errors ?? [],
    blockers:       options.blockers ?? [],
    summary:        options.summary ?? '',
    requiresHumanReview: options.requiresHumanReview ?? false,
    metadata:       options.metadata ?? {},
  };
}
