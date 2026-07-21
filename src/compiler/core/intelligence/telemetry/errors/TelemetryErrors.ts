// ─── Telemetry errors ───────────────────────────────────────────────────────────

export class TelemetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelemetryError';
  }
}

export class TelemetryNotInitializedError extends TelemetryError {
  constructor(message = 'Telemetry engine has not started an execution.') {
    super(message);
    this.name = 'TelemetryNotInitializedError';
  }
}

export class InvalidTelemetryEventError extends TelemetryError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidTelemetryEventError';
  }
}
