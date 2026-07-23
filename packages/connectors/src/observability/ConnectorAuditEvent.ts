import type { ConnectorId, UUID, ISOString, Metadata } from '../types/index';
import { sanitizeMetadata } from './sanitize';

export type AuditEventType =
  | 'credential.saved'
  | 'credential.rotated'
  | 'credential.deleted'
  | 'token.refreshed'
  | 'token.refresh_failed'
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'execution.cancelled'
  | 'circuit.opened'
  | 'circuit.closed'
  | 'rate_limit.exceeded';

export type AuditOutcome = 'success' | 'failure' | 'denied' | 'cancelled';

export interface ConnectorAuditEvent {
  readonly eventId: string;
  readonly eventType: AuditEventType;
  readonly organizationId: UUID;
  readonly userId: UUID | null;
  readonly connectorId: ConnectorId;
  readonly operation: string;
  readonly executionId: string;
  readonly timestamp: ISOString;
  readonly outcome: AuditOutcome;
  readonly sanitizedMetadata: Metadata;
}

export function createAuditEvent(params: {
  eventType: AuditEventType;
  organizationId: UUID;
  userId?: UUID | null;
  connectorId: ConnectorId;
  operation: string;
  executionId: string;
  outcome: AuditOutcome;
  metadata?: Record<string, unknown>;
}): ConnectorAuditEvent {
  return Object.freeze({
    eventId: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    eventType: params.eventType,
    organizationId: params.organizationId,
    userId: params.userId ?? null,
    connectorId: params.connectorId,
    operation: params.operation,
    executionId: params.executionId,
    timestamp: new Date().toISOString(),
    outcome: params.outcome,
    sanitizedMetadata: sanitizeMetadata(params.metadata ?? {}),
  });
}

export class AuditLog {
  private events: ConnectorAuditEvent[] = [];

  log(event: ConnectorAuditEvent): void {
    this.events.push(event);
  }

  getEvents(): ConnectorAuditEvent[] {
    return [...this.events];
  }

  getEventsByOrganization(organizationId: UUID): ConnectorAuditEvent[] {
    return this.events.filter((e) => e.organizationId === organizationId);
  }

  getEventsByConnector(connectorId: ConnectorId): ConnectorAuditEvent[] {
    return this.events.filter((e) => e.connectorId === connectorId);
  }

  clear(): void {
    this.events = [];
  }
}
