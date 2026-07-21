// ─── Telemetry Engine — public API ──────────────────────────────────────────────

// ── Services ──────────────────────────────────────────────────────────────────
export { TelemetryEngine } from './services/TelemetryEngine';
export { TelemetryEventBus } from './services/TelemetryEventBus';
export { MetricsCollector } from './services/MetricsCollector';
export { TraceBuilder } from './services/TraceBuilder';
export { ExplainabilityBuilder } from './services/ExplainabilityBuilder';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type {
  ITelemetryEngine, TelemetryEngineDeps,
  StageCompleteData, PipelineEventData, PipelineResults,
} from './interfaces/ITelemetryEngine';
export type { ITelemetryEventBus, TelemetryEventHandler } from './interfaces/ITelemetryEventBus';
export type { IExecutionTraceRepository } from './interfaces/IExecutionTraceRepository';
export type { IMetricsCollector } from './interfaces/IMetricsCollector';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ExecutionTrace } from './models/ExecutionTrace';
export type { StageTrace } from './models/StageTrace';
export type { TelemetryMetrics, StageMetric } from './models/TelemetryMetrics';
export type { ExplainabilityRecord, DecisionSummary, AlternativeSummary } from './models/ExplainabilityRecord';
export type { PerformanceSnapshot } from './models/PerformanceSnapshot';
export type { TelemetryContext } from './models/TelemetryContext';

// ── Events ─────────────────────────────────────────────────────────────────────
export type { TelemetryEvent, TelemetryEventType, TelemetryStageStatus } from './events/TelemetryEvent';
export { TELEMETRY_EVENT_TYPES } from './events/TelemetryEvent';
export type { StageStartedEvent } from './events/StageStartedEvent';
export type { StageCompletedEvent } from './events/StageCompletedEvent';
export type { StageFailedEvent } from './events/StageFailedEvent';
export type { PipelineBlockedEvent } from './events/PipelineBlockedEvent';
export type { HumanReviewRequestedEvent } from './events/HumanReviewRequestedEvent';
export type { ConfidenceCalculatedEvent } from './events/ConfidenceCalculatedEvent';
export type { DecisionRejectedEvent } from './events/DecisionRejectedEvent';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  TelemetryError, TelemetryNotInitializedError,
  InvalidTelemetryEventError, TraceRepositoryError,
} from './errors/TelemetryError';
