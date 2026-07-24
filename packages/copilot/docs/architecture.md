# Architecture — AI Workflow Copilot

> Sprint 27 · Rule-based, offline, self-contained

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Flow](#high-level-flow)
3. [Component Descriptions](#component-descriptions)
4. [Data Flow](#data-flow)
5. [ICopilotConnectorRegistry Abstraction](#icopilotconnectorregistry-abstraction)
6. [Design Decisions](#design-decisions)
7. [File / Module Map](#file--module-map)

---

## Overview

The AI Workflow Copilot converts a plain-language automation instruction (e.g. _"When I receive an email with an invoice in Gmail, save it in Google Drive and create a GitHub issue if it exceeds 5,000 €"_) into a fully-validated, executable workflow DAG without ever calling an external LLM or network service.

The pipeline is **fully deterministic**: the same instruction always produces the same DAG. This makes the copilot suitable for unit-testing (308 tests, 97.37% line coverage) and for air-gapped or offline deployments.

---

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           CopilotEngine.process(instruction)                  │
│                                                                              │
│   Raw string                                                                 │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────┐                                                     │
│  │  NaturalLanguageParser│  → ParsedIntent                                   │
│  └─────────────────────┘                                                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────┐                                                     │
│  │   WorkflowPlanner    │  ← ICopilotConnectorRegistry                       │
│  └─────────────────────┘                                                     │
│       │  WorkflowDAG                                                         │
│       ▼                                                                      │
│  ┌─────────────────────┐                                                     │
│  │  WorkflowValidator  │  → ValidationResult                                 │
│  └─────────────────────┘                                                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────┐                                                     │
│  │  WorkflowGenerator  │  → GeneratedWorkflow                                │
│  └─────────────────────┘                                                     │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────┐                                                     │
│  │  WorkflowSimulator  │  → SimulationResult                                 │
│  └─────────────────────┘                                                     │
│       │                                                                      │
│       ▼                                                                      │
│   CopilotResult  { dag, validation, workflow, simulation, prompts }          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Each stage is **independently instantiable** and can be called in isolation for testing or for incremental UI feedback (e.g. show the parsed intent before the DAG is built).

---

## Component Descriptions

### `NaturalLanguageParser`

**Responsibility:** Convert a raw instruction string into a structured `ParsedIntent`.

- Detects language (EN / ES / FR / DE / PT) via token frequency matching.
- Identifies trigger type (event, schedule, webhook, manual).
- Extracts up to N action patterns using per-connector regex catalogues.
- Extracts condition expressions (currency thresholds, label checks, SLA breach, …).
- Produces a **confidence score** (0–1) based on matched trigger, action count, and connector coverage.
- Flags ambiguous phrases in the `ambiguities` array so the UI can ask the user to clarify.

### `WorkflowPlanner`

**Responsibility:** Build a directed-acyclic-graph (`WorkflowDAG`) from a `ParsedIntent`.

- Creates typed nodes: `trigger`, `action`, `condition`, `transform`, `merge`, `split`.
- Inserts **condition nodes** between the trigger and subsequent action nodes when conditions are present.
- Assigns error-handling policies per node type (`fail`, `retry`, `continue`, `skip`).
- Wires edges with semantic types: `success`, `failure`, `conditional`, `always`.
- Runs **Kahn's topological sort** to derive `executionOrder`.
- Estimates workflow duration by summing per-connector latency budgets.
- Resolves variable producers/consumers using `CAPABILITY_PRODUCES` / `CAPABILITY_CONSUMES` maps.

### `WorkflowValidator`

**Responsibility:** Run 9 structural and semantic checks against a `WorkflowDAG` and return a `ValidationResult`.

- Issues are classified as `error`, `warning`, or `info`.
- Only `error`-level issues set `valid = false`.
- Cycle detection uses a **DFS 3-colour algorithm** (white / grey / black).
- Connector availability is checked against the injected registry (missing connector → `warning`, not `error`, so preview still works without credentials).

### `WorkflowGenerator`

**Responsibility:** Serialize a validated `WorkflowDAG` into a `GeneratedWorkflow` JSON document that the runtime engine can execute.

- Produces deterministic node IDs (connector + capability + index).
- Embeds resolved variable bindings into each node's parameter map.
- Attaches the OAuth scope list required by each connector.

### `WorkflowSimulator`

**Responsibility:** Run a **dry-run** simulation of the workflow without executing any real actions.

- Walks nodes in topological order.
- Estimates duration per node type.
- Collects required OAuth permissions.
- Reports pre-flight errors (missing connectors / capabilities) and warnings.
- Never performs network I/O; `dryRun` is always `true`.

### `PromptBuilder`

**Responsibility:** Produce human-readable text summaries of any pipeline artifact.

- `buildWorkflowSummary` — one-paragraph description of what the workflow does.
- `buildValidationSummary` — bullet list of validation issues.
- `buildSimulationSummary` — tabular execution plan with durations.
- `buildStepDescription` — inline description for a single DAG node.
- `buildDAGDescription` — full textual walk of the DAG.

### `TemplateLibrary`

**Responsibility:** Provide 24 pre-built workflow templates across 8 business domains.

- Templates are pure data objects (no code) loadable from the registry.
- Each template ships with a sample `instruction` string that feeds directly back into the parser.

---

## Data Flow

```
instruction: string
    │
    │  NaturalLanguageParser.parse()
    ▼
ParsedIntent {
  trigger:       TriggerPattern
  actions:       ActionPattern[]
  conditions:    ConditionPattern[]
  variables:     VariableBinding[]
  connectorIds:  string[]
  confidence:    number          // 0–1
  language:      'en'|'es'|'fr'|'de'|'pt'
  ambiguities:   string[]
}
    │
    │  WorkflowPlanner.plan()
    ▼
WorkflowDAG {
  nodes:                DAGNode[]
  edges:                DAGEdge[]
  executionOrder:       string[]   // topologically sorted node IDs
  estimatedDurationMs:  number
  requiredConnectors:   string[]
}
    │
    │  WorkflowValidator.validate()
    ▼
ValidationResult {
  valid:     boolean
  issues:    ValidationIssue[]
  errors:    ValidationIssue[]   // severity === 'error'
  warnings:  ValidationIssue[]   // severity === 'warning'
  infos:     ValidationIssue[]   // severity === 'info'
}
    │
    │  WorkflowGenerator.generate()  (only if valid === true)
    ▼
GeneratedWorkflow {
  id:          string
  name:        string
  nodes:       GeneratedNode[]
  connections: GeneratedEdge[]
  metadata:    WorkflowMetadata
}
    │
    │  WorkflowSimulator.simulate()
    ▼
SimulationResult {
  dryRun:                    true
  steps:                     SimulationStep[]
  totalEstimatedDurationMs:  number
  preflightErrors:           string[]
  preflightWarnings:         string[]
  executionPath:             string[]
  skippedNodes:              string[]
  requiredPermissions:       string[]
  missingConnectors:         string[]
}
```

---

## `ICopilotConnectorRegistry` Abstraction

The planner and validator never import connector packages directly. Instead, they depend on an interface:

```typescript
export interface ICopilotConnectorRegistry {
  /** Returns all registered connector descriptors */
  getConnectors(): ConnectorDescriptor[];

  /** Returns a single descriptor by ID, or undefined */
  getConnector(id: string): ConnectorDescriptor | undefined;

  /** Returns all capabilities for a given connector */
  getCapabilities(connectorId: string): CapabilityDescriptor[];

  /** Returns a single capability, or undefined */
  getCapability(
    connectorId: string,
    capabilityId: string
  ): CapabilityDescriptor | undefined;
}
```

**Why this matters:**

| Concern | Without abstraction | With `ICopilotConnectorRegistry` |
|---|---|---|
| Cross-package coupling | Copilot imports `@platform/connectors` | Copilot imports nothing external |
| Testability | Requires real connector stubs | Pass a `MockConnectorRegistry` |
| Offline support | Fails if connector package unavailable | Works with any in-memory registry |
| Versioning | Breaking change in connectors breaks copilot | Interface is stable; adapters handle change |

In production the host application injects a `DefaultConnectorRegistry` populated from the connector catalogue. In tests a lightweight `MockConnectorRegistry` is used that pre-registers only the connectors needed by each test.

---

## Design Decisions

### Rule-Based Parsing (no LLM)

The parser uses regular expressions and token-matching rather than a neural model.

- **Pros:** zero latency, zero cost, fully offline, fully deterministic, auditable.
- **Cons:** limited to patterns explicitly coded; cannot generalise to unseen phrasings.
- **Mitigation:** `ambiguities` array + `confidence` score let the UI surface uncertainty to the user.

### Injectable Registry

See [ICopilotConnectorRegistry Abstraction](#icopilotconnectorregistry-abstraction) above.

### No PII in Telemetry

The copilot emits structured telemetry events (parse duration, planning duration, confidence score, connector IDs used). It never logs or emits the raw instruction string or any extracted variable values, preventing accidental PII leakage in log aggregation systems.

### Single-Package, No Cross-Package Imports

All 19 source files live within `packages/copilot`. No `import` statement references another workspace package. This keeps the package independently buildable and deployable (e.g. as a WASM module or a browser bundle).

---

## File / Module Map

```
packages/copilot/
├── src/
│   ├── index.ts                   # Public API barrel
│   ├── engine.ts                  # CopilotEngine — orchestrates the pipeline
│   ├── types.ts                   # All shared TypeScript interfaces & enums
│   │
│   ├── parser/
│   │   ├── natural-language-parser.ts   # NaturalLanguageParser class
│   │   ├── trigger-patterns.ts          # Regex catalogue for triggers
│   │   ├── action-patterns.ts           # Regex catalogue for actions (20+ patterns)
│   │   └── condition-patterns.ts        # Regex catalogue for conditions
│   │
│   ├── planner/
│   │   ├── workflow-planner.ts          # WorkflowPlanner class
│   │   └── variable-maps.ts             # CAPABILITY_PRODUCES / CAPABILITY_CONSUMES
│   │
│   ├── validator/
│   │   └── workflow-validator.ts        # WorkflowValidator class (9 checks)
│   │
│   ├── generator/
│   │   └── workflow-generator.ts        # WorkflowGenerator class
│   │
│   ├── simulator/
│   │   └── workflow-simulator.ts        # WorkflowSimulator class
│   │
│   ├── prompts/
│   │   ├── prompt-builder.ts            # PromptBuilder class
│   │   └── template-library.ts          # TemplateLibrary — 24 templates
│   │
│   └── registry/
│       ├── connector-registry.interface.ts  # ICopilotConnectorRegistry
│       └── mock-connector-registry.ts       # Test helper
│
├── tests/                         # 308 tests — mirrors src/ structure
├── docs/                          # This directory
│   ├── architecture.md
│   ├── parser.md
│   ├── planner.md
│   ├── validator.md
│   ├── simulation.md
│   ├── prompts.md
│   └── examples.md
└── README.md
```

---

*Last updated: Sprint 27*
