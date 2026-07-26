# Agents

The orchestrator ships with **10 specialized agents**, each modeled after a
human organizational role. Every agent is a plain `AgentDeclaration` describing
its capabilities, connectors, cost, and confidence. The registry selects the
best agent for each task using a deterministic algorithm, and you can register
custom agents for domain-specific work.

## The 10 agents

| ID | Role | Priority | Capabilities | Connectors | Cost/task | Avg time (ms) | Confidence |
|----|------|----------|--------------|------------|----------:|--------------:|-----------:|
| `ceo` | Chief Executive Officer | critical | strategic-planning, resource-allocation, decision-making, escalation, priority-assessment | salesforce, hubspot | $0.50 | 200 | 0.95 |
| `sales` | Sales Manager | high | lead-management, opportunity-tracking, customer-communication, pipeline-analysis, quoting | salesforce, hubspot | $0.30 | 300 | 0.88 |
| `finance` | Financial Controller | high | payment-processing, budget-analysis, invoice-management, financial-reporting, cost-estimation | salesforce | $0.40 | 400 | 0.92 |
| `support` | Customer Support Specialist | high | incident-resolution, ticket-management, customer-communication, escalation, follow-up | slack, jira | $0.20 | 250 | 0.85 |
| `developer` | Software Developer | normal | code-writing, code-review, testing, debugging, implementation | github | $0.35 | 500 | 0.87 |
| `devops` | DevOps Engineer | high | deployment, infrastructure-management, ci-cd, monitoring, rollback | github | $0.45 | 600 | 0.90 |
| `marketing` | Marketing Manager | normal | campaign-management, content-creation, social-media, analytics, audience-targeting | hubspot | $0.25 | 350 | 0.83 |
| `document` | Document Specialist | normal | document-generation, contract-management, report-generation, formatting, templates | google, notion | $0.15 | 200 | 0.89 |
| `research` | Research Analyst | low | market-research, data-analysis, competitive-analysis, information-gathering, trend-analysis | google | $0.20 | 800 | 0.82 |
| `compliance` | Compliance Officer | high | compliance-checking, audit, regulatory-validation, risk-assessment, policy-enforcement | google | $0.35 | 300 | 0.94 |

Every agent is declared with `version: '2.0.0'` and one of four priorities:
`critical` > `high` > `normal` > `low`.

## Agent selection algorithm

When the planner builds tasks, it calls
`registry.findBestAgent(capabilities, connectors)` for each task. The algorithm
selects the agent that can perform the task, then ranks candidates as follows:

1. **Connector match** — only agents exposing at least one of the requested
   connectors are considered.
2. **Confidence** — among matching agents, higher `confidence` wins.
3. **Priority** — ties in confidence are broken by agent `priority`
   (`critical` > `high` > `normal` > `low`).
4. **Cost** — final tie-breaker prefers the lower `estimatedCostPerTask`.

If no agent matches, the planner falls back to the `research` agent so the
workflow still proceeds.

```
findBestAgent(capabilities, connectors)
  → filter agents where agent.capabilities ∩ capabilities ≠ ∅
  → filter agents where agent.connectors ∩ connectors ≠ ∅
  → sort by: confidence DESC → priority DESC → cost ASC
  → return first (or undefined)
```

## Registering a custom agent

Custom agents are first-class citizens. Register one and it participates in
selection immediately; the orchestrator also adds its id to the authorized
agents policy list.

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

## Unregistering an agent

```typescript
const removed = orchestrator.unregisterAgent('data-engineer');
console.log(removed); // true
```

## Listing all agents

```typescript
for (const agent of orchestrator.listAgents()) {
  console.log(agent.id, agent.role, agent.priority);
}
```

## See also

- [Planner](planner.md) — how tasks are generated and bound to agents.
- [Examples](examples.md) — runnable agent registration and metrics examples.
