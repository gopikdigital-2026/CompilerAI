import type { ITelemetryBus, TelemetryEvent, TelemetryEventType } from '../models.js';

export class TelemetryBus implements ITelemetryBus {
  private readonly events: TelemetryEvent[] = [];

  emit(event: TelemetryEvent): void {
    this.events.push(event);
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventsByType(type: TelemetryEventType): TelemetryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events.length = 0;
  }

  count(): number {
    return this.events.length;
  }
}
