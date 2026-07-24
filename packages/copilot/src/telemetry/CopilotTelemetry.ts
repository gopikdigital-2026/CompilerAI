import type { CopilotEvent, ICopilotTelemetry } from './events.js';

export class CopilotTelemetry implements ICopilotTelemetry {
  private readonly events: CopilotEvent[] = [];

  emit(event: CopilotEvent): void {
    // Store a defensive copy; never log PII
    this.events.push({
      type: event.type,
      timestamp: event.timestamp,
      workflowId: event.workflowId,
      metadata: { ...event.metadata },
    });
  }

  getEvents(): CopilotEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events.length = 0;
  }
}
