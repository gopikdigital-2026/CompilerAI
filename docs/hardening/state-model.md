# State Model — Compatibility Table

## Runtime States

| State | Terminal | Resumable | Compensable | Requires Human | Description |
|-------|----------|-----------|-------------|----------------|-------------|
| PENDING | No | No | No | No | Request received, not started |
| RUNNING | No | Yes | Yes | No | Actively executing |
| PAUSED | No | Yes | Yes | No | Manually paused, can resume |
| AWAITING_APPROVAL | No | Yes | No | Yes | Waiting for human approval |
| COMPLETED | Yes | No | No | No | Finished successfully |
| FAILED | Yes | No | Yes | No | Errored, compensation may run |
| CANCELLED | Yes | No | Yes | No | Manually cancelled |
| TIMED_OUT | Yes | No | Yes | No | Exceeded max duration |

### Valid Transitions

| From → To | Allowed | Notes |
|-----------|---------|-------|
| PENDING → RUNNING | ✓ | Start execution |
| RUNNING → PAUSED | ✓ | Manual pause |
| RUNNING → AWAITING_APPROVAL | ✓ | Approval checkpoint |
| RUNNING → COMPLETED | ✓ | Normal completion |
| RUNNING → FAILED | ✓ | Error during execution |
| RUNNING → CANCELLED | ✓ | Manual cancel |
| RUNNING → TIMED_OUT | ✓ | Duration exceeded |
| PAUSED → RUNNING | ✓ | Resume from checkpoint |
| PAUSED → CANCELLED | ✓ | Cancel while paused |
| AWAITING_APPROVAL → RUNNING | ✓ | Approval granted |
| AWAITING_APPROVAL → FAILED | ✓ | Approval rejected |
| AWAITING_APPROVAL → CANCELLED | ✓ | Cancel while awaiting |
| COMPLETED → (any) | ✗ | Terminal state |
| FAILED → (any) | ✗ | Terminal — compensation runs inline |
| CANCELLED → (any) | ✗ | Terminal |
| TIMED_OUT → (any) | ✗ | Terminal |

## Workflow States

| State | Terminal | Resumable | Description |
|-------|----------|-----------|-------------|
| PENDING | No | No | Workflow defined, not started |
| RUNNING | No | Yes | Actively executing nodes |
| PAUSED | No | Yes | Paused at checkpoint |
| COMPLETED | Yes | No | All nodes completed |
| FAILED | Yes | No | Node failure |
| CANCELLED | Yes | No | Manually cancelled |

## Execution States (Intelligence Layer)

| State | Terminal | Description |
|-------|----------|-------------|
| PENDING | No | Plan not yet started |
| RUNNING | No | Executing tool steps |
| COMPLETED | Yes | All steps succeeded |
| PARTIAL | Yes | Some steps succeeded, some failed |
| FAILED | Yes | Execution failed |
| CANCELLED | Yes | Manually cancelled |
| TIMED_OUT | Yes | Step timeout exceeded |

## Approval States

| State | Terminal | Description |
|-------|----------|-------------|
| PENDING | No | Waiting for decision |
| APPROVED | Yes | Approved — execution continues |
| REJECTED | Yes | Rejected — execution fails |
| EXPIRED | Yes | Not decided within timeout |

## Memory States

| State | Terminal | Description |
|-------|----------|-------------|
| ACTIVE | No | Entry is live and queryable |
| EXPIRED | Yes | TTL exceeded, excluded from queries |
| CONSOLIDATED | Yes | Merged into long-term memory |
| DELETED | Yes | Soft-deleted |

## Learning States

| State | Terminal | Description |
|-------|----------|-------------|
| PENDING | No | Pattern detected, not reviewed |
| APPROVED | Yes | Recommendation approved |
| REJECTED | Yes | Recommendation rejected |
| APPLIED | Yes | Recommendation applied to system |
| REGRESSION | Yes | Pattern marked as regression |

## Tool Execution Step States

| State | Terminal | Description |
|-------|----------|-------------|
| PENDING | No | Step queued |
| RUNNING | No | Tool executing |
| SUCCEEDED | Yes | Tool completed successfully |
| FAILED | Yes | Tool failed (may retry) |
| SKIPPED | Yes | Step skipped (condition not met) |
| COMPENSATING | No | Rollback in progress |
| COMPENSATED | Yes | Rollback completed |

## Telemetry Stage States

| State | Terminal | Description |
|-------|----------|-------------|
| STARTED | No | Stage began |
| COMPLETED | Yes | Stage succeeded |
| FAILED | Yes | Stage errored |
| SKIPPED | Yes | Stage skipped (resume from later) |

## Cross-Module Compatibility Notes

1. **Runtime RUNNING ↔ Workflow RUNNING**: Aligned. Runtime delegates to WorkflowRunner which manages node-level state.
2. **Runtime AWAITING_APPROVAL ↔ Approval PENDING**: Aligned. Runtime sets AWAITING_APPROVAL when ApprovalManager creates a PENDING request.
3. **Execution PARTIAL ↔ Runtime FAILED**: Compatible. When execution returns PARTIAL, runtime marks as FAILED with partial results.
4. **Workflow PAUSED ↔ Checkpoint saved**: Aligned. WorkflowResumeManager creates a checkpoint before pausing.
5. **Learning APPROVED ↔ Runtime no-op**: Learning approvals are independent of runtime — they feed back into future executions, not the current one.
6. **Memory EXPIRED ↔ Query exclusion**: Aligned. MemoryRetriever excludes expired entries unless `includeExpired: true`.
