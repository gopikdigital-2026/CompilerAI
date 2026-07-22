# ADR-004: Event-Driven Design

## Context
The platform needs to trace execution, record telemetry, and persist events for audit. Multiple modules produce events with no shared shape.

## Decision
Define `BaseEvent` in `shared/contracts/EventPublisher.ts` with `eventId`, `eventType`, `eventVersion`, `aggregateId`, `organizationId`, `correlationId`, `causationId`, `occurredAt`, `payload`. `InMemoryEventPublisher` implements both `IEventPublisher` and `IEventStore`.

## Alternatives
- **No events (synchronous only)**: Rejected — no audit trail, no async processing
- **Separate event systems per module**: Rejected (current state) — 7 incompatible event types

## Consequences
- Canonical event shape for all modules
- Event store supports replay and querying by aggregate/org/type
- Known tech debt: existing 7 event types need gradual migration to BaseEvent
- Known tech debt: WorkflowRunner bypasses event bus (builds events directly)
