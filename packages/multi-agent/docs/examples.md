# Examples

Complete, runnable code examples for the `@compilerai/multi-agent` package.
Every example assumes the package is installed and imports from the public
entry point. Examples 1–14 cover setup, execution, simulation, cancellation,
metrics, custom agents, approvals, research, documents, analytics, and more.

## 1. Basic orchestrator setup

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

console.log(orchestrator.listAgents().length); // 10
```

## 2. Execute a workflow (English)

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

const result = await orchestrator.executeWorkflow('Manage all critical incidents received today');

console.log(result.state);           // 'completed'
console.log(result.success);         // true
console.log(result.results.length);  // 4 (triage, resolve, notify, document)
console.log(result.totalCost);
console.log(result.totalDurationMs);

for (const entry of result.timeline) {
  console.log(entry.type, entry.message);
}
```

## 3. Execute a workflow (Spanish)

The planner detects Spanish and produces localized objectives and task names.

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

const result = await orchestrator.executeWorkflow(
  'Gestiona todas las incidencias críticas recibidas hoy',
);

console.log(result.state);           // 'completed'
console.log(result.results.length);  // 4

const plan = orchestrator.generatePlan('Gestiona todas las incidencias críticas recibidas hoy');
console.log(plan.language);          // 'es'
console.log(plan.objectives);
// ['Resolver incidencias críticas', 'Notificar a stakeholders afectados', 'Documentar la resolución']
console.log(plan.tasks.map((t) => t.name));
// ['Triaje de incidencias', 'Resolver incidencias', 'Notificar a stakeholders', 'Documentar resolución']
```

## 4. Simulate a workflow (Digital Twin)

Dry-run a plan to predict cost, duration, success probability, and conflicts —
without spending real agent cost or taking action.

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

const simulation = orchestrator.simulateWorkflow('Deploy to production');

console.log(simulation.success);                    // true
console.log(simulation.overallSuccessProbability);  // e.g. 0.82
console.log(simulation.totalEstimatedCost);
console.log(simulation.totalEstimatedDurationMs);

for (const task of simulation.taskResults) {
  console.log(task.taskId, task.agentId, task.successProbability);
}

for (const conflict of simulation.conflicts) {
  console.log(conflict.type, conflict.severity, conflict.description);
}
```

## 5. Cancel a workflow

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

const plan = orchestrator.generatePlan('Deploy to production');

// Request cancellation (in practice, call while executeWorkflow is running)
const cancelled = orchestrator.cancelWorkflow(plan.id);
console.log(cancelled); // true (if the workflow exists)

console.log(orchestrator.getExecutionStatus(plan.id)); // 'cancelled'
console.log(orchestrator.getWorkflowTimeline(plan.id).at(-1)?.type); // 'workflow_cancelled'
```

## 6. Get agent metrics

After executing workflows, analytics aggregate per-agent performance.

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

await orchestrator.executeWorkflow('Manage all critical incidents received today');
await orchestrator.executeWorkflow('Deploy to production');

const metrics = orchestrator.getAgentMetrics('support');
console.log(metrics);
// {
//   agentId: 'support',
//   tasksCompleted: 2,
//   tasksFailed: 0,
//   averageConfidence: 0.85,
//   averageDurationMs: 250,
//   totalCost: 0.4,
//   successRate: 1,
// }

// All agents at once
for (const m of orchestrator.analytics.getAllAgentMetrics()) {
  console.log(m.agentId, m.tasksCompleted, m.successRate);
}
```

## 7. Register a custom agent

```typescript
import {
  MultiAgentOrchestrator,
  createDefaultPolicies,
  MockAgentExecutor,
  type AgentDeclaration,
} from '@compilerai/multi-agent';

const orchestrator = new MultiAgentOrchestrator({
  organizationId: 'org-1',
  policies: createDefaultPolicies(),
  executor: new MockAgentExecutor(),
});

const dataAgent: AgentDeclaration = {
  id: 'data-engineer',
  name: 'Data Engineer Agent',
  role: 'Data Engineer',
  description: 'Builds and maintains data pipelines, ETL, and warehouse models.',
  capabilities: ['data-analysis', 'data-engineering', 'etl', 'pipeline-design'],
  tools: ['sql', 'airflow', 'dbt'],
  connectors: ['google', 'github'],
  estimatedCostPerTask: 0.30,
  averageExecutionTimeMs: 450,
  confidence: 0.86,
  priority: 'normal',
  version: '2.0.0',
};

orchestrator.registerAgent(dataAgent);
console.log(orchestrator.listAgents().length); // 11
console.log(orchestrator.registry.get('data-engineer')?.role); // 'Data Engineer'
```

## 8. Handle a payment with approval

Payments require approval. In non-interactive mode the engine auto-approves;
here we also show an explicit manual approval.

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

// The 'Process payment' task requires approval; the engine auto-approves in
// non-interactive mode so the workflow completes.
const result = await orchestrator.executeWorkflow('Process the pending invoice payment');
console.log(result.state);  // 'completed'

// Explicitly request and approve a payment action
const approval = orchestrator.requestApproval(
  'wf-42',
  'task-2',
  'finance',
  'payment',
  'Process $12,000 vendor payment',
  'high',
);
console.log(approval.state); // 'pending'

const decided = orchestrator.approvals.approve(approval.id, 'cfo@example.com', 'Within budget');
console.log(decided.state);  // 'approved'

// Confirm the approval was recorded in telemetry
const approvalEvents = orchestrator.telemetry.getEventsByType('approval.completed');
console.log(approvalEvents.length); // >= 1
```

## 9. Deployment with approval

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

const plan = orchestrator.generatePlan('Deploy to production');
const deployTask = plan.tasks.find((t) => t.approval.required);
console.log(deployTask?.name, deployTask?.approval);
// 'Deploy to production' { required: true, reason: 'deployment' }

const result = await orchestrator.executeWorkflow('Deploy to production');
console.log(result.state); // 'completed'

// The timeline reflects the approval gate
const approvals = result.timeline.filter((t) => t.type === 'approval_requested');
console.log(approvals.length); // 1
```

## 10. Research task

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

const result = await orchestrator.executeWorkflow('Research the competitive landscape for AI tooling');

console.log(result.state);          // 'completed'
console.log(result.results.length); // 3 (gather, analyze, report)

const researchMetrics = orchestrator.getAgentMetrics('research');
console.log(researchMetrics.tasksCompleted);
```

## 11. Generate a report document

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

const result = await orchestrator.executeWorkflow('Create a quarterly performance report');

console.log(result.state); // 'completed'

// The document task writes its output to shared memory under its outputKey
const plan = orchestrator.generatePlan('Create a quarterly performance report');
for (const task of plan.tasks) {
  const stored = orchestrator.memory.get(task.outputKey);
  console.log(task.name, task.outputKey, stored ? 'stored' : 'empty');
}
```

## 12. Get workflow analytics

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

await orchestrator.executeWorkflow('Manage all critical incidents received today');
await orchestrator.executeWorkflow('Deploy to production');
await orchestrator.executeWorkflow('Research the competitive landscape for AI tooling');

const analytics = orchestrator.getWorkflowAnalytics();
console.log(analytics);
// {
//   totalWorkflows: 3,
//   completedWorkflows: 3,
//   failedWorkflows: 0,
//   averageCost: ...,
//   averageDurationMs: ...,
//   averageSuccessProbability: ...,
//   approvalRate: ...,
// }
```

## 13. Request a manual approval

Request, inspect, and decide an approval independent of a running workflow.

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

const approval = orchestrator.requestApproval(
  'wf-99',
  'task-3',
  'devops',
  'deployment',
  'Promote build 1.2.3 to production',
  'critical',
);

console.log(approval.state);     // 'pending'
console.log(approval.riskLevel); // 'critical'
console.log(approval.expiresAt); // requestedAt + 24h

// List all pending approvals
const pending = orchestrator.approvals.getPending();
console.log(pending.length); // 1

// Reject it
const rejected = orchestrator.approvals.reject(approval.id, 'release-manager', 'Failing tests');
console.log(rejected.state);  // 'rejected'
console.log(rejected.reason); // 'Failing tests'

// Expire any overdue approvals (none here, but shows the API)
const expired = orchestrator.approvals.expireOverdue();
console.log(expired.length); // 0
```

## 14. List all agents

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

for (const agent of orchestrator.listAgents()) {
  console.log(
    `${agent.id.padEnd(12)} ${agent.role.padEnd(28)} ` +
    `priority=${agent.priority.padEnd(8)} ` +
    `confidence=${agent.confidence} cost=$${agent.estimatedCostPerTask}`,
  );
}
```

Output (abbreviated):

```
ceo          Chief Executive Officer      priority=critical confidence=0.95 cost=$0.5
sales        Sales Manager                priority=high     confidence=0.88 cost=$0.3
finance      Financial Controller         priority=high     confidence=0.92 cost=$0.4
support      Customer Support Specialist  priority=high     confidence=0.85 cost=$0.2
developer    Software Developer           priority=normal   confidence=0.87 cost=$0.35
devops       DevOps Engineer              priority=high     confidence=0.9  cost=$0.45
marketing    Marketing Manager            priority=normal   confidence=0.83 cost=$0.25
document     Document Specialist          priority=normal   confidence=0.89 cost=$0.15
research     Research Analyst             priority=low      confidence=0.82 cost=$0.2
compliance   Compliance Officer           priority=high     confidence=0.94 cost=$0.35
```

## See also

- [Architecture](architecture.md) — system diagram and module responsibilities.
- [Agents](agents.md) — full agent table and the selection algorithm.
- [Planner](planner.md) — the 10 bilingual request patterns.
- [Execution](execution.md) — parallel scheduling, approvals, and recovery.
- [Simulation](simulation.md) — Digital Twin conflict types and probability.
- [Approvals](approvals.md) — approval lifecycle and risky actions.
