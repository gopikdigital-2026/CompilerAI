# Approvals

Risky actions should never execute silently. The `ApprovalEngine` implements a
human-in-the-loop gate: before an agent performs a high-risk task, the
orchestrator creates an `ApprovalRequest` and the workflow pauses until a
decision is made. This keeps cost-bearing, externally-visible, or
compliance-sensitive operations under explicit human control.

## Approval lifecycle

```
        request()
           │
           ▼
        pending ──────── approve(id, by) ───────► approved
           │
           ├──────── reject(id, by) ───────────► rejected
           │
           └──────── expiresAt reached ─────────► expired
                  (expireOverdue())
```

An approval starts in `pending`. A decider can call `approve` or `reject`,
transitioning it to the corresponding terminal state. If no decision is made
before `expiresAt`, calling `expireOverdue()` transitions overdue requests to
`expired`. Once terminal, an approval cannot change state again.

## Default timeout

The default timeout is **24 hours**. When an approval is requested without an
explicit `timeoutMs`, the engine sets `expiresAt` to `requestedAt + 24h`. A
custom timeout can be passed as the second argument to `request(...)`.

## Actions requiring approval

Approval is required for any task whose planner pattern sets
`approvalRequired: true`, and the default `PolicySet.requireApprovalFor`
includes:

| Action key | Pattern that triggers it |
|------------|--------------------------|
| `payment` | Payment processing |
| `deployment` | Deployment |
| `contract` | Contract signing |
| `campaign_launch` | Marketing campaign launch |
| `data_deletion` | Data deletion (policy-level) |
| `critical_change` | Critical change (policy-level) |

During execution, when a task requires approval the engine creates a request
with a `riskLevel` derived from the task priority (`critical` priority →
`critical` risk; otherwise `high`). In non-interactive mode the engine
auto-approves so automation and tests proceed; in production, wire approvals to
your human review flow and then resume the workflow.

## ApprovalRequest structure

```typescript
interface ApprovalRequest {
  id: string;
  workflowId: string;
  taskId: string;
  agentId: string;
  action: string;          // e.g. 'deployment'
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  state: ApprovalState;    // 'pending' | 'approved' | 'rejected' | 'expired'
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  expiresAt: string;
}
```

## Code example

```typescript
import {
  MultiAgentOrchestrator,
  createDefaultPolicies,
  MockAgentExecutor,
} from '@compilerai/multi-agent';

const orchestrator = new MultiAgentOrchestrator({
  organizationId: 'org-1',
  policies: createDefaultPolicies(),
  executor: new MockAgentExecutor(),
});

// Request a manual approval for any action
const approval = orchestrator.requestApproval(
  'wf-42',
  'task-2',
  'finance',
  'payment',
  'Process $12,000 vendor payment',
  'high',
);
console.log(approval.state, approval.expiresAt); // 'pending', requestedAt + 24h

// Approve it
const decided = orchestrator.approvals.approve(approval.id, 'cfo@example.com', 'Within budget');
console.log(decided.state); // 'approved'

// Inspect pending approvals
const pending = orchestrator.approvals.getPending();

// Expire any overdue approvals
const expired = orchestrator.approvals.expireOverdue();
```

## See also

- [Execution](execution.md) — how approvals pause and resume workflows.
- [Simulation](simulation.md) — the `approval_blocked` conflict.
- [Examples](examples.md) — approval handling in end-to-end workflows.
