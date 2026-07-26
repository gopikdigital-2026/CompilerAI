import type { ResilienceEvent, IResilienceTelemetry, ResilienceEventType } from '../models.js';

export class ResilienceTelemetry implements IResilienceTelemetry {
  private readonly events: ResilienceEvent[] = [];

  emit(event: ResilienceEvent): void {
    this.events.push(event);
  }

  getEvents(): ResilienceEvent[] {
    return [...this.events];
  }

  getEventsByType(type: ResilienceEventType): ResilienceEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events.length = 0;
  }

  count(): number {
    return this.events.length;
  }
}
