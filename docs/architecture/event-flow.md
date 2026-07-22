# Event Flow

## Pipeline Events

```
Orchestrator
    │
    ├── telemetry.startExecution(executionId, requestId, orgId)
    │
    ├── Stage: CONTEXT
    │     ├── telemetry.recordStageStart('CONTEXT')
    │     └── telemetry.recordStageComplete('CONTEXT', data)
    │
    ├── Stage: INTENT
    │     ├── telemetry.recordStageStart('INTENT')
    │     └── telemetry.recordStageComplete('INTENT', data)
    │
    ├── Stage: PLANNING
    │     ├── telemetry.recordStageStart('PLANNING')
    │     └── telemetry.recordStageComplete('PLANNING', data)
    │
    ├── Stage: DECISION
    │     ├── telemetry.recordStageStart('DECISION')
    │     └── telemetry.recordStageComplete('DECISION', data)
    │
    ├── Stage: CONFIDENCE
    │     ├── telemetry.recordStageStart('CONFIDENCE')
    │     ├── telemetry.recordStageComplete('CONFIDENCE', data)
    │     └── telemetry.recordPipelineEvent('ConfidenceCalculated')
    │
    └── telemetry.finalizeExecution(status, requiresHumanReview, results)
```

## Runtime Events

```
RuntimeCoordinator
    │
    ├── RuntimeEventBus.emit('ExecutionStarted', ...)
    │
    ├── WorkflowRunner.run()
    │     ├── makeEvent('WorkflowNodeStarted', ...) → context.events[]
    │     ├── makeEvent('WorkflowNodeCompleted', ...) → context.events[]
    │     └── makeEvent('WorkflowNodeFailed', ...) → context.events[]
    │
    ├── ApprovalManager.requestApproval()
    │     └── RuntimeEventBus.emit('ApprovalRequested', ...)
    │
    ├── RuntimeEventBus.emit('ExecutionCompleted', ...)
    │
    └── Merge: [...eventBus.getEvents(id), ...context.events]
```

**Known issue**: Two event streams (RuntimeEventBus + context.events) merged manually. See ADR-004.

## Outbox Events

```
Domain Service
    │
    ├── OutboxPublisher.publish(event)
    │     └── OutboxRepository.save(OutboxEvent)
    │
    └── OutboxProcessor.processBatch()
          ├── OutboxHandler.handle(event)
          └── OutboxRepository.markProcessed(eventId)
```

## Event Catalog

See `docs/hardening/event-catalog.md` for the full event type catalog.
