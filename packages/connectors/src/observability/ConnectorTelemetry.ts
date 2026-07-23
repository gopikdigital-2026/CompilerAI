import type { ConnectorId, UUID, ISOString, Metadata } from '../types/index';
import { sanitizeMetadata } from './sanitize';

export type TelemetryEventType =
  | 'connector.execution.started'
  | 'connector.execution.completed'
  | 'connector.execution.failed'
  | 'connector.execution.retried'
  | 'connector.execution.cancelled'
  | 'connector.authentication.refreshed'
  | 'connector.rate_limit.exceeded'
  | 'connector.circuit.opened'
  | 'connector.circuit.closed';

export interface TelemetryEvent {
  type: TelemetryEventType;
  connectorId: ConnectorId;
  organizationId: UUID;
  operation: string;
  executionId: string;
  timestamp: ISOString;
  metadata: Metadata;
}

export interface IConnectorTelemetry {
  emit(event: TelemetryEvent): void;
}

export class ConnectorTelemetry implements IConnectorTelemetry {
  private handlers: Array<(event: TelemetryEvent) => void> = [];
  private events: TelemetryEvent[] = [];

  on(handler: (event: TelemetryEvent) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  emit(event: TelemetryEvent): void {
    const sanitized: TelemetryEvent = {
      ...event,
      metadata: sanitizeMetadata(event.metadata as Record<string, unknown>),
    };
    this.events.push(sanitized);
    for (const handler of this.handlers) {
      handler(sanitized);
    }
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  getEventsByType(type: TelemetryEventType): TelemetryEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  getEventsByExecution(executionId: string): TelemetryEvent[] {
    return this.events.filter((e) => e.executionId === executionId);
  }

  clear(): void {
    this.events = [];
  }
}
