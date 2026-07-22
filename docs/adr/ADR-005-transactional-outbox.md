# ADR-005: Transactional Outbox

## Context
Domain state changes and event publication must be atomic. If events are sent before commit, lost updates occur. If after commit, crashes lose events.

## Decision
Use the transactional outbox pattern. `OutboxManager` persists events in the same transaction as domain state. `OutboxProcessor` processes events asynchronously with at-least-once delivery.

## Alternatives
- **Direct event publishing**: Rejected — not atomic, events lost on crash
- **Change data capture**: Rejected — requires external tooling (Debezium)

## Consequences
- Events persisted atomically with domain state
- At-least-once delivery — consumers must be idempotent
- `OutboxProcessor` runs in background, processes pending events
- `SimulatedOutboxHandler` for testing, real handlers for production
