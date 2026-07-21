// ─── ITelemetryEventBus ─────────────────────────────────────────────────────────
// Synchronous, decoupled event bus for telemetry events.

import type { TelemetryEvent, TelemetryEventType } from '../events/TelemetryEvent';

export type TelemetryEventHandler = (event: TelemetryEvent) => void;

export interface ITelemetryEventBus {
  readonly id: string;
  subscribe(handler: TelemetryEventHandler): () => void;
  subscribeTo(eventType: TelemetryEventType, handler: TelemetryEventHandler): () => void;
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  clear(): void;
}
