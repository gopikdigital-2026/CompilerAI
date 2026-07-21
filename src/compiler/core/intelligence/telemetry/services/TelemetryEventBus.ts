// ─── TelemetryEventBus ──────────────────────────────────────────────────────────
// Synchronous, decoupled event bus for telemetry events.

import type { TelemetryEventPayload } from '../models/TelemetryEventPayload';
import type { TelemetryEventType } from '../models/TelemetryEvent';
import type { ITelemetryEventBus, TelemetryEventHandler } from '../interfaces/ITelemetryEventBus';

export class TelemetryEventBus implements ITelemetryEventBus {
  readonly id = 'telemetry-event-bus-v1';
  private readonly handlers = new Set<TelemetryEventHandler>();
  private readonly typedHandlers = new Map<TelemetryEventType, Set<TelemetryEventHandler>>();
  private readonly events: TelemetryEventPayload[] = [];

  subscribe(handler: TelemetryEventHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  subscribeTo(eventType: TelemetryEventType, handler: TelemetryEventHandler): () => void {
    if (!this.typedHandlers.has(eventType)) {
      this.typedHandlers.set(eventType, new Set());
    }
    this.typedHandlers.get(eventType)!.add(handler);
    return () => {
      this.typedHandlers.get(eventType)?.delete(handler);
    };
  }

  emit(event: TelemetryEventPayload): void {
    this.events.push(event);
    // Notify all-subscribers
    for (const h of this.handlers) {
      try { h(event); } catch { /* handler errors are silently ignored to protect the bus */ }
    }
    // Notify type-specific subscribers
    const typed = this.typedHandlers.get(event.eventType);
    if (typed) {
      for (const h of typed) {
        try { h(event); } catch { /* silently ignored */ }
      }
    }
  }

  getEvents(): TelemetryEventPayload[] {
    return [...this.events];
  }

  clear(): void {
    this.handlers.clear();
    this.typedHandlers.clear();
    this.events.length = 0;
  }
}
