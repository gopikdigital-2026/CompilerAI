// ─── Telemetry Engine — public API ──────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { TelemetryEngine } from './services/TelemetryEngine';
export { TelemetryEventBus } from './services/TelemetryEventBus';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  ITelemetryEngine, TelemetryEngineDeps,
  StageCompleteData, PipelineEventData,
} from './interfaces/ITelemetryEngine';
export type {
  ITelemetryEventBus, TelemetryEventHandler,
} from './interfaces/ITelemetryEventBus';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { TelemetryEventType, TelemetryStageStatus } from './models/TelemetryEvent';
export { TELEMETRY_EVENT_TYPES } from './models/TelemetryEvent';
export type { StageTrace } from './models/StageTrace';
export type { ExecutionTrace } from './models/ExecutionTrace';
export type { TelemetryMetrics, StageMetric } from './models/TelemetryMetrics';
export type { ExplainabilityRecord, StageExplanation } from './models/ExplainabilityRecord';
export { buildExplainabilityFromTrace, buildStageExplanations } from './models/ExplainabilityRecord';
export type { TelemetryEventPayload } from './models/TelemetryEventPayload';

// ── Events ─────────────────────────────────────────────────────────────────────
export { buildEvent as buildTelemetryEvent } from './events/TelemetryEventFactory';

// ── Errors ─────────────────────────────────────────────────────────────────────
export { TelemetryError, TelemetryNotInitializedError, InvalidTelemetryEventError } from './errors/TelemetryErrors';
