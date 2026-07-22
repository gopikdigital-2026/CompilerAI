# Event Catalog

## Event Systems Overview

The platform currently has 7 distinct event types across modules. This catalog documents each and maps them to a canonical `BaseEvent` shape.

## Canonical BaseEvent (src/shared/contracts/EventPublisher.ts)

```typescript
interface BaseEvent {
  eventId:        string;
  eventType:      string;
  eventVersion:   string;
  aggregateId:    string;
  organizationId: string;
  correlationId?: string;
  causationId?:   string;
  occurredAt:     string;  // ISO timestamp
  payload:        Metadata;
}
```

## Event Types by Module

### Runtime Events (RuntimeEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Runtime.ExecutionStarted` | executionId | Runtime begins execution | 1.0.0 |
| `Runtime.ExecutionCompleted` | executionId | Runtime finishes successfully | 1.0.0 |
| `Runtime.ExecutionFailed` | executionId | Runtime fails | 1.0.0 |
| `Runtime.ExecutionPaused` | executionId | Execution paused at checkpoint | 1.0.0 |
| `Runtime.ExecutionResumed` | executionId | Execution resumed from checkpoint | 1.0.0 |
| `Runtime.ExecutionCancelled` | executionId | Execution cancelled | 1.0.0 |
| `Runtime.WorkflowNodeStarted` | executionId | Workflow node begins | 1.0.0 |
| `Runtime.WorkflowNodeCompleted` | executionId | Workflow node completes | 1.0.0 |
| `Runtime.WorkflowNodeFailed` | executionId | Workflow node fails | 1.0.0 |
| `Runtime.ApprovalRequested` | approvalId | Approval requested | 1.0.0 |
| `Runtime.ApprovalDecided` | approvalId | Approval decided | 1.0.0 |
| `Runtime.CheckpointSaved` | checkpointId | Checkpoint persisted | 1.0.0 |

**Issue**: WorkflowRunner builds these events directly via `makeEvent()` instead of going through `RuntimeEventBus`. Two event streams are merged in `RuntimeCoordinator`.

### Telemetry Events (TelemetryEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Telemetry.StageStarted` | traceId | Pipeline stage starts | 1.0.0 |
| `Telemetry.StageCompleted` | traceId | Pipeline stage completes | 1.0.0 |
| `Telemetry.StageFailed` | traceId | Pipeline stage fails | 1.0.0 |
| `Telemetry.PipelineBlocked` | traceId | Pipeline blocked | 1.0.0 |
| `Telemetry.HumanReviewRequested` | traceId | Human review needed | 1.0.0 |
| `Telemetry.ConfidenceCalculated` | traceId | Confidence score computed | 1.0.0 |
| `Telemetry.DecisionRejected` | traceId | Decision rejected | 1.0.0 |

**Issue**: `RuntimeEventBus` and `ExecutionEngine` hardcode `'ConfidenceCalculated'` as the telemetry event type for all forwarded events — lossy.

### Execution Events (ExecutionEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Execution.Started` | executionId | Tool plan execution starts | 1.0.0 |
| `Execution.StepStarted` | executionId | Tool step starts | 1.0.0 |
| `Execution.StepCompleted` | executionId | Tool step completes | 1.0.0 |
| `Execution.StepFailed` | executionId | Tool step fails | 1.0.0 |
| `Execution.StepRetried` | executionId | Tool step retry | 1.0.0 |
| `Execution.Compensated` | executionId | Compensation executed | 1.0.0 |
| `Execution.Completed` | executionId | All steps complete | 1.0.0 |
| `Execution.Cancelled` | executionId | Execution cancelled | 1.0.0 |

### Tool Events (ToolEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Tool.Selected` | planId | Tool selected for execution | 1.0.0 |
| `Tool.Rejected` | planId | Tool rejected (ineligible) | 1.0.0 |
| `Tool.PlanBlocked` | planId | Tool plan blocked | 1.0.0 |
| `Tool.FallbackUsed` | planId | Fallback tool used | 1.0.0 |
| `Tool.PlanBuilt` | planId | Tool plan built | 1.0.0 |

### Memory Events (MemoryEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Memory.Written` | memoryId | Memory entry written | 1.0.0 |
| `Memory.Retrieved` | memoryId | Memory entry retrieved | 1.0.0 |
| `Memory.Consolidated` | memoryId | Memory consolidated | 1.0.0 |
| `Memory.Expired` | memoryId | Memory entry expired | 1.0.0 |
| `Memory.Deleted` | memoryId | Memory entry deleted | 1.0.0 |

### Learning Events (LearningEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Learning.PatternExtracted` | patternId | Pattern extracted from outcome | 1.0.0 |
| `Learning.RecommendationGenerated` | recommendationId | Recommendation generated | 1.0.0 |
| `Learning.RecommendationApproved` | recommendationId | Recommendation approved | 1.0.0 |
| `Learning.RecommendationRejected` | recommendationId | Recommendation rejected | 1.0.0 |
| `Learning.RegressionDetected` | patternId | Regression detected | 1.0.0 |

### Outbox Events (OutboxEvent)

| EventType | AggregateId | When | Version |
|-----------|-------------|------|---------|
| `Outbox.EventPublished` | eventId | Event published to outbox | 1.0.0 |
| `Outbox.EventProcessed` | eventId | Event processed by handler | 1.0.0 |
| `Outbox.EventFailed` | eventId | Event processing failed | 1.0.0 |

## Event Ordering Rules

1. **Pipeline events**: Context → Intent → Planning → Decision → Confidence (strict order)
2. **Runtime events**: ExecutionStarted → (WorkflowNode events) → ExecutionCompleted/Failed
3. **Execution events**: Started → (Step events in order) → Completed/Cancelled
4. **Correlation**: All events for a single request share a `correlationId`
5. **Causation**: Events triggered by other events carry `causationId` pointing to the causing event

## Idempotency Rules

1. **Event ID**: Each event has a unique `eventId` — consumers should deduplicate by `eventId`
2. **Outbox**: Outbox events are persisted before processing — at-least-once delivery
3. **Telemetry**: Stage events are idempotent per `(traceId, stage)` — re-recording overwrites

## Sensitive Data Rules

1. **Never** include full prompts in event payloads — use a hash or truncated summary
2. **Never** include API keys, passwords, tokens, or secrets
3. **Never** include PII (email, phone, address) in payload metadata
4. **Always** use `sanitizeLogMessage()` before logging event payloads
5. **Always** set `payload.sensitivity` to the highest data classification touched
