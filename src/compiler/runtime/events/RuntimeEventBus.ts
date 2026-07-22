// ─── Runtime event bus ──────────────────────────────────────────────────────────
// Emits runtime events and forwards them to telemetry when available.

import type { RuntimeEvent, RuntimeEventType } from '../models/RuntimeEvent';
import type { ITelemetryEngine } from '../../core/intelligence/telemetry/interfaces/ITelemetryEngine';

export class RuntimeEventBus {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;
  private readonly telemetry: ITelemetryEngine | null;
  private readonly events: RuntimeEvent[] = [];

  constructor(idGenerator: () => string, clock: () => string, telemetry: ITelemetryEngine | null) {
    this.idGenerator = idGenerator;
    this.clock = clock;
    this.telemetry = telemetry;
  }

  emit(
    eventType: RuntimeEventType,
    executionId: string,
    organizationId: string,
    summary: string,
    options: { nodeId?: string; checkpointId?: string; approvalId?: string; metadata?: Record<string, unknown> } = {},
  ): RuntimeEvent {
    const event: RuntimeEvent = {
      eventId: this.idGenerator(),
      eventType,
      executionId,
      organizationId,
      timestamp: this.clock(),
      summary,
      nodeId: options.nodeId ?? null,
      checkpointId: options.checkpointId ?? null,
      approvalId: options.approvalId ?? null,
      metadata: options.metadata ?? {},
    };
    this.events.push(event);

    if (this.telemetry) {
      try {
        this.telemetry.recordPipelineEvent('ConfidenceCalculated', {
          summary: `[${eventType}] ${summary}`,
        });
      } catch { /* telemetry failures must not break the runtime */ }
    }

    return event;
  }

  getEvents(executionId?: string): RuntimeEvent[] {
    if (executionId) return this.events.filter(e => e.executionId === executionId);
    return [...this.events];
  }

  clear(): void { this.events.length = 0; }
}
