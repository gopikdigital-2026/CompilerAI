# CompilerAI Enterprise Automation Studio v1.0

A visual environment for designing, simulating, publishing, and monitoring intelligent automation workflows — without writing code.

## Overview

Automation Studio is the first enterprise product built on CompilerAI. It provides a drag-and-drop workflow designer, a simulation engine for testing workflows before deployment, a publishing pipeline with versioning and rollback, and a real-time execution monitor.

## Features

- **Workflow Designer** — 10 node types (Trigger, AI Agent, Decision, Human Approval, Tool, Condition, Loop, Delay, Notification, End) with drag-and-drop placement, validation, and connection management
- **Template Library** — 7 ready-to-use workflow templates (Customer Service, Email Classification, Document Management, Invoice Approval, HR, Sales, IT Support)
- **Simulation Engine** — Run workflows in simulation mode to see the execution path, decisions taken, tools used, estimated cost, timing, and confidence levels
- **Publishing** — Publish, unpublish, clone, export, and import workflows with full version history and safe rollback
- **Component Library** — Integrates Marketplace, Agent Runtime, Memory, Telemetry, Identity, and Tool Intelligence through public interfaces
- **Real-time Monitor** — Track running nodes, completed nodes, errors, checkpoints, and pending approvals
- **Collaboration** — Comments, reviews, and change history (co-editing not included in v1.0)
- **Security** — Role-based permissions, pre-publish validation, audit trail of all changes, safe rollback

## Architecture

```
packages/automation-studio/
├── src/
│   ├── types/            # Shared domain types
│   ├── models/           # Domain models (workflow, simulation, publication, monitor, collaboration, components)
│   ├── errors/           # Typed error classes
│   ├── integrations/     # Integration adapters for external platforms
│   ├── repositories/     # Repository interfaces + in-memory implementation
│   ├── designer/         # Node registry, workflow validator, workflow builder
│   ├── services/         # Workflow, template, simulation, publishing, monitor, collaboration, component, security services
│   ├── AutomationStudio.ts  # Facade
│   └── index.ts          # Public exports
├── tests/                # Unit, integration, editor, simulation, publishing, import-export tests
└── docs/                 # Architecture, workflows, designer, API, security documentation
```

## Quick Start

```typescript
import { AutomationStudio } from '@compilerai/automation-studio';

const studio = new AutomationStudio({
  idGenerator: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
});

// Create a workflow
const wf = await studio.workflows.create({
  organizationId: 'org-1',
  name: 'My Automation',
  description: 'Process incoming requests',
  category: 'custom',
  createdBy: 'user-1',
});

// Add nodes
const trigger = await studio.builder.addNode({
  workflowId: wf.id,
  type: 'trigger',
  label: 'Start',
  positionX: 100,
  positionY: 100,
  config: { eventType: 'webhook' },
});

// Validate
const result = studio.validator.validate(wf);
console.log(result.valid);

// Simulate
const sim = await studio.simulation.runSimulation(wf, {
  organizationId: 'org-1',
  workflowId: wf.id,
  triggeredBy: 'user-1',
});

// Publish
const pub = await studio.publishing.publish({
  organizationId: 'org-1',
  workflowId: wf.id,
  publishedBy: 'user-1',
  changelog: 'Initial version',
});
```

## Integration

Automation Studio reuses existing CompilerAI engines through public adapter interfaces — it does not duplicate Runtime, Marketplace, or Dashboard logic:

- `IRuntimeAdapter` — Deploy and execute workflows via the Agent Runtime
- `IIdentityAdapter` — Check permissions and enforce organization isolation
- `IMarketplaceAdapter` — Discover available tools
- `IAgentRuntimeAdapter` — Discover agents, estimate cost and confidence
- `ITelemetryAdapter` — Record execution metrics
- `IMemoryAdapter` — Read/write execution memory
- `IToolIntelligenceAdapter` — Select and validate tools

All adapters have null implementations for standalone usage.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
