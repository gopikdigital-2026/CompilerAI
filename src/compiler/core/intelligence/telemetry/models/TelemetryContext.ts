// ─── Telemetry context ─────────────────────────────────────────────────────────
// Carries identifiers and injected dependencies through the telemetry pipeline.

export interface TelemetryContext {
  executionId:    string;
  requestId:      string;
  organizationId: string;
  locale:         string;
  version:        string;
  /** Injected clock — returns ISO timestamps. */
  clock:          () => string;
  /** Injected ID generator. */
  idGenerator:    () => string;
}
