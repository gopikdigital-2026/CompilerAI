import type { AuditEvent, AuditQuery, IAuditLog } from '../models.js';

let auditCounter = 0;

export class AuditLog implements IAuditLog {
  private readonly events: AuditEvent[] = [];

  write(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: `audit-${++auditCounter}`,
      timestamp: new Date().toISOString(),
    };
    this.events.push(fullEvent);
    return fullEvent;
  }

  query(filter: AuditQuery): AuditEvent[] {
    let results = [...this.events];

    if (filter.organizationId) {
      results = results.filter((e) => e.organizationId === filter.organizationId);
    }
    if (filter.actor) {
      results = results.filter((e) => e.actor === filter.actor);
    }
    if (filter.action) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter.result) {
      results = results.filter((e) => e.result === filter.result);
    }
    if (filter.startTime) {
      results = results.filter((e) => e.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      results = results.filter((e) => e.timestamp <= filter.endTime!);
    }

    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    return results.slice(offset, offset + limit);
  }

  getById(id: string): AuditEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  count(filter?: AuditQuery): number {
    if (!filter) return this.events.length;
    return this.query(filter).length;
  }

  export(filter: AuditQuery): AuditEvent[] {
    return this.query({ ...filter, limit: Number.MAX_SAFE_INTEGER });
  }
}
