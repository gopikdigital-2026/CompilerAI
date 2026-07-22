# Transactional Outbox

## Problem

When domain state changes and an integration event must be published, doing both in a single transaction is unreliable — the event publish might fail after the state is committed.

## Solution

The Transactional Outbox pattern stores the event in the same database transaction as the state change. A separate processor publishes events asynchronously.

## State Machine

```
PENDING → PROCESSING → PUBLISHED
                ↓
            FAILED → (retry with backoff) → PROCESSING
                ↓
         DEAD_LETTER (after max retries)
```

## Components

- **OutboxEvent** — Event record with `status`, `retryCount`, `maxRetries`, `nextAttemptAt`
- **IOutboxRepository** — Persistence interface (InMemory + Postgres implementations)
- **OutboxPublisher** — Creates events, processes batches with retry logic
- **OutboxProcessor** — Periodic runner using `setInterval`
- **SimulatedOutboxHandler** — Test handler with `failNextPublish()` for simulating failures

## Retry Strategy

Exponential backoff: `delay = backoffMs * (backoffMultiplier ^ (retryCount - 1))`

After `maxRetries` failures, the event moves to `DEAD_LETTER` status.

## Usage

```typescript
const publisher = new OutboxPublisher(repo, handler, clock, idGen, 5, 1000, 2);
await publisher.createEvent('org-1', 'workflow.completed', 'exec-1', { result: 'ok' });
const result = await publisher.processBatch(10);
// { processed: 1, published: 1, failed: 0 }
```
