# Job Queue

## Overview

Framework-agnostic job queue with in-memory implementation. Supports 7 job types, timeout enforcement, and retry with backoff.

## Job Types

| Type | Purpose |
|------|---------|
| `runtime-execution` | Execute a runtime request |
| `workflow-resume` | Resume a paused workflow |
| `tool-execution` | Execute a tool |
| `memory-consolidation` | Consolidate memory entries |
| `learning-analysis` | Run learning pattern extraction |
| `telemetry-processing` | Process telemetry events |
| `outbox-publication` | Publish pending outbox events |

## JobEnvelope

Each job has: `jobId`, `jobType`, `organizationId`, `payload`, `maxRetries`, `retryCount`, `timeoutMs`, `status`, `result`, `lastError`.

## Lifecycle

```
PENDING → RUNNING → COMPLETED
              ↓
          FAILED → PENDING (retry) → ... → DEAD_LETTER
              ↓
          CANCELLED (manual cancel before RUNNING)
```

## Timeout Enforcement

Jobs are executed via `Promise.race` with a timeout promise. If the timeout fires first, a `JobProcessingError` is thrown.

## Retry Logic

On failure, if `retryCount < maxRetries`, the job returns to PENDING with `availableAt` set to `now + (1000 * retryCount)` ms in the future.

## Usage

```typescript
const queue = new InMemoryJobQueue(clock, idGen);
queue.registerHandler('tool-execution', { handle: async (job) => { ... } });
const job = await queue.enqueue('tool-execution', 'org-1', { toolId: 't1' });
const result = await queue.processBatch(10);
```
