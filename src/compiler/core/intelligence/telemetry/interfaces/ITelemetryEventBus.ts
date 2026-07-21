// ─── ITelemetryEventBus ─────────────────────────────────────────────────────────
// Synchronous, decoupled event bus for telemetry events.

import type { TelemetryEventPayload } from '../models/TelemetryEventPayload';
import type { TelemetryEventType } from '../models/TelemetryEvent';

export type TelemetryEventHandler = (event: TelemetryEventPayload) => void;

export interface ITelemetryEventBus {
  readonly id: string;
  /** Subscribe to all events. Returns an unsubscribe function. */
  subscribe(handler: TelemetryEventHandler): () => void;
  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  subscribeTo(eventType: TelemetryEventType, handler: TelemetryEventHandler): () => void;
  /** Emit an event synchronously to all subscribers. */
  emit(event: TelemetryEventPayload): void;
  /** Get all emitted events. */
  getEvents(): TelemetryEventPayload[];
  /** Clear all events and handlers. */
  clear(): void;
}
