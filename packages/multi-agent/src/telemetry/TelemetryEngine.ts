import type { ITelemetryEngine, TelemetryEvent, TelemetryEventType } from '../models.js';

export class TelemetryEngine implements ITelemetryEngine {
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

  getEventsByAgent(agentId: string): TelemetryEvent[] {
    return this.events.filter((e) => e.agentId === agentId);
  }

  clear(): void {
    this.events.length = 0;
  }
}
