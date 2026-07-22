import type { EventId, OrganizationId, CorrelationId, EntityId } from './Ids';
import type { Timestamp } from './Clock';
import type { Version, Metadata, Result } from './Result';

export interface BaseEvent {
  eventId: EventId;
  eventType: string;
  eventVersion: Version;
  aggregateId: EntityId;
  organizationId: OrganizationId;
  correlationId?: CorrelationId;
  causationId?: EventId;
  occurredAt: Timestamp;
  payload: Metadata;
}

export type EventHandler<E extends BaseEvent = BaseEvent> = (event: E) => void | Promise<void>;

export interface IEventPublisher {
  publish<E extends BaseEvent>(event: E): void;
  subscribe<E extends BaseEvent>(eventType: string, handler: EventHandler<E>): void;
  unsubscribe(eventType: string, handler: EventHandler): void;
  getEvents(aggregateId?: EntityId): BaseEvent[];
}

export interface IEventStore {
  append(event: BaseEvent): Result<void, string>;
  getEvents(aggregateId: EntityId): BaseEvent[];
  getEventsByType(eventType: string): BaseEvent[];
  getEventsByOrganization(orgId: OrganizationId): BaseEvent[];
}

export class InMemoryEventPublisher implements IEventPublisher, IEventStore {
  private readonly events: BaseEvent[] = [];
  private readonly handlers = new Map<string, Set<EventHandler>>();

  publish<E extends BaseEvent>(event: E): void {
    this.events.push(event);
    const set = this.handlers.get(event.eventType);
    if (set) {
      for (const h of set) {
        try {
          h(event);
        } catch {
          /* handler errors must not break the publisher */
        }
      }
    }
  }

  subscribe<E extends BaseEvent>(eventType: string, handler: EventHandler<E>): void {
    let set = this.handlers.get(eventType);
    if (!set) {
      set = new Set();
      this.handlers.set(eventType, set);
    }
    set.add(handler as EventHandler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  getEvents(aggregateId?: EntityId): BaseEvent[] {
    if (aggregateId) return this.events.filter((e) => e.aggregateId === aggregateId);
    return [...this.events];
  }

  append(event: BaseEvent): Result<void, string> {
    this.events.push(event);
    return { ok: true, value: undefined } as Result<void, string>;
  }

  getEventsByType(eventType: string): BaseEvent[] {
    return this.events.filter((e) => e.eventType === eventType);
  }

  getEventsByOrganization(orgId: OrganizationId): BaseEvent[] {
    return this.events.filter((e) => e.organizationId === orgId);
  }
}
