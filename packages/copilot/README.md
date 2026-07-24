# AI Workflow Copilot

> **Sprint 27** · Rule-based · Offline · Self-contained
>
> ![Sprint 27](https://img.shields.io/badge/Sprint-27-blue) ![Tests](https://img.shields.io/badge/tests-308-brightgreen) ![Coverage](https://img.shields.io/badge/coverage-97.37%25-brightgreen) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What is the Copilot?

The **AI Workflow Copilot** is a fully offline, rule-based automation assistant that converts plain-language instructions into executable workflow directed-acyclic-graphs (DAGs). Given a sentence like _"When I receive an email with an invoice in Gmail, save it in Google Drive and create a GitHub issue if it exceeds 5,000 €"_, the copilot parses the instruction, builds a typed node graph, validates it for structural correctness, serialises it into a runnable workflow definition, and runs a dry-run simulation — all without calling an external LLM or any network service. It is entirely self-contained within this package (no cross-package imports) and ships with 24 ready-to-use templates across 8 business domains.

---

## Quick Start

```typescript
import { CopilotEngine }             from './src/engine';
import { DefaultConnectorRegistry }  from './src/registry/connector-registry';

// 1. Build a registry (inject your connector descriptors)
const registry = new DefaultConnectorRegistry();
registry.register(googleWorkspaceDescriptor);
registry.register(githubDescriptor);

// 2. Create the engine
const engine = new CopilotEngine(registry);

// 3. Process a natural-language instruction
const result = await engine.process(
  'When I receive an email with an invoice in Gmail, save it in Google Drive, ' +
  'create an issue in GitHub if it exceeds 5,000€ and add a review task to the calendar.'
);

// 4. Inspect the result
console.log(result.validation.valid);             // true
console.log(result.dag.estimatedDurationMs);      // 8001
console.log(result.simulation.executionPath);     // ['node-...0', 'node-...1', ...]
console.log(result.prompts.workflowSummary);      // Human-readable paragraph
```

### CopilotResult shape

```typescript
interface CopilotResult {
  intent:     ParsedIntent;       // parser output
  dag:        WorkflowDAG;        // planner output
  validation: ValidationResult;   // validator output
  workflow:   GeneratedWorkflow;  // generator output (null if invalid)
  simulation: SimulationResult;   // simulator output
  prompts: {
    workflowSummary:    string;
    validationSummary:  string;
    simulationSummary:  string;
    dagDescription:     string;
  };
}
```

---

## The Sprint 27 Example

### English

> _"When I receive an email with an invoice in Gmail, save it in Google Drive, create an issue in GitHub if it exceeds 5,000 € and add a review task to the calendar."_

```
Gmail Trigger
    │ always
    ▼
Drive: Upload File          ← runs unconditionally
    │ success
    ▼
Condition: Amount > 5,000 €
    │ true              │ false
    ▼                   ▼
GitHub: Create Issue    (skip)
    │ success
    ▼
Calendar: Add Review Task
```

**Estimated duration:** ~8 seconds · **Connectors:** `google-workspace`, `github`

### Español

> _"Cuando reciba un email con una factura en Gmail, guárdalo en Google Drive, crea un issue en GitHub si supera los 5.000 € y añade una tarea de revisión al calendario."_

The parser detects `language: 'es'` and matches Spanish trigger/action tokens; the generated DAG is identical. `PromptBuilder.buildWorkflowSummary()` returns the summary in Spanish automatically.

---

## Component Overview

| Component | Class | Responsibility |
|---|---|---|
| Parser | `NaturalLanguageParser` | Raw string → `ParsedIntent` |
| Planner | `WorkflowPlanner` | `ParsedIntent` → `WorkflowDAG` |
| Validator | `WorkflowValidator` | `WorkflowDAG` → `ValidationResult` (9 checks) |
| Generator | `WorkflowGenerator` | `WorkflowDAG` → `GeneratedWorkflow` JSON |
| Simulator | `WorkflowSimulator` | Dry-run → `SimulationResult` |
| Prompt Builder | `PromptBuilder` | Any artifact → human-readable string |
| Template Library | `TemplateLibrary` | 24 pre-built instruction templates |
| Engine | `CopilotEngine` | Orchestrates the full pipeline |
| Registry | `ICopilotConnectorRegistry` | Connector/capability abstraction |

---

## Supported Connectors

| Connector ID | Services |
|---|---|
| `google-workspace` | Gmail, Google Drive, Google Calendar |
| `github` | Issues, Pull Requests, Releases, Actions |
| `slack` | Messages, Channels |
| `jira` | Issues, Comments, Transitions |
| `notion` | Pages, Databases |
| `hubspot` | Contacts, Deals, Email Campaigns |
| `salesforce` | Opportunities, Cases, Records |

---

## Template Domains

| Domain | Templates | Example |
|---|---|---|
| 🏦 Finance | 3 | Invoice processing, expense approval |
| 🚨 Incidents | 3 | Critical GitHub issue → Slack, error alert → Jira |
| 💼 Sales | 3 | New HubSpot lead, Salesforce deal closed |
| 🔧 DevOps | 4 | PR merged, CI failed, release tagged |
| 🎧 Support | 3 | Support email → Jira, SLA breach escalation |
| 👥 HR | 4 | New hire onboarding, leave request, job application |
| 📣 Marketing | 2 | Blog post published, high-open campaign |
| 📄 Document | 2 | Drive upload → Slack, weekly summary |

```typescript
import { TemplateLibrary } from './src/prompts/template-library';

const lib = new TemplateLibrary();

// All templates in a domain
lib.getByDomain('hr');           // 4 templates

// Find by tag
lib.getByTag('slack');           // templates that use Slack

// Load and run
const t = lib.getById('invoice-processing')!;
engine.process(t.instruction);
```

---

## Stats

| Metric | Value |
|---|---|
| Source files | **19** |
| Test files / assertions | **308 tests** |
| Line coverage | **97.37 %** |
| Branch coverage | **93.25 %** |
| Workflow templates | **24** across 8 domains |
| Supported connectors | **7** (28 distinct capabilities) |
| Supported languages | **5** (EN, ES, FR, DE, PT) |
| External dependencies | **0** (fully offline) |

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/architecture.md`](./docs/architecture.md) | High-level flow, component map, design decisions |
| [`docs/parser.md`](./docs/parser.md) | NLP parser, trigger/action/condition patterns, confidence scoring |
| [`docs/planner.md`](./docs/planner.md) | DAG construction, node/edge types, Kahn's sort, duration estimation |
| [`docs/validator.md`](./docs/validator.md) | 9 validation checks, DFS cycle detection, ValidationResult |
| [`docs/simulation.md`](./docs/simulation.md) | Dry-run simulator, SimulationResult, step-by-step output |
| [`docs/prompts.md`](./docs/prompts.md) | PromptBuilder methods, TemplateLibrary, all 24 templates |
| [`docs/examples.md`](./docs/examples.md) | 22 end-to-end automation examples with EN/ES instructions |

---

## Running Tests

```bash
# From the workspace root
pnpm --filter copilot test

# With coverage report
pnpm --filter copilot test:coverage

# Watch mode
pnpm --filter copilot test:watch
```

Expected output:
```
Test Suites: 19 passed, 19 total
Tests:       308 passed, 308 total
Coverage:    Lines 97.37% | Branches 93.25% | Functions 98.10% | Statements 97.52%
```

---

## Design Principles

1. **Offline first** — no LLM calls, no network I/O, works in air-gapped environments.
2. **Deterministic** — same instruction always produces the same DAG; safe to unit-test exhaustively.
3. **Self-contained** — no cross-package imports; ships as an independent library or WASM bundle.
4. **Injectable** — the `ICopilotConnectorRegistry` interface decouples the copilot from connector packages.
5. **Privacy by design** — telemetry never includes the raw instruction string or variable values.

---

*Sprint 27 · AI Workflow Copilot · packages/copilot*
