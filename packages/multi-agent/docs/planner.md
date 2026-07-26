# Planner

The `IntelligentPlanner` is the orchestrator's brain. Given a natural-language
request in English or Spanish, it detects the language, matches the request
against a catalog of **10 bilingual patterns**, binds each task to the best
agent via the registry, and emits a dependency-ordered `ExecutionPlan`. The
planner is rule-based and deterministic — no external model call is required —
which keeps planning fast, testable, and free of cost.

## How it works

```
request
   │
   ▼
detectLanguage(text)        → 'en' | 'es' | 'unknown'
   │
   ▼
matchPattern(request, lang) → PlannerPattern (10 available)
   │
   ▼
buildTasks(pattern, lang, registry)
   │   for each task template:
   │     findBestAgent(capabilities, connectors)
   │     resolve cost/duration from the agent declaration
   │     wire dependencies (finish_to_start)
   │     mark approvalRequired + reason
   ▼
estimateSuccess(tasks)       → penalty for approvals & dependencies
   │
   ▼
ExecutionPlan
```

### Language detection

`detectLanguage` scans the request for Spanish indicator words
(`incidencia`, `crítica`, `gestiona`, `hoy`, `factura`, `desplegar`, …) and
English indicator words (`incident`, `critical`, `manage`, `today`, `invoice`,
`deploy`, …). The first match wins; otherwise the language is `unknown` and
the planner defaults to English labels.

### Pattern matching

`matchPattern` lowercases the request and checks each pattern's keywords for
the detected language. If nothing matches in the detected language, it retries
across both languages. As a final fallback, the **research** pattern is used so
every request yields a valid plan.

### Success estimation

`estimateSuccess` starts from an average confidence of 0.85 and subtracts:

- **0.05** for each task that requires approval.
- **0.02** per dependency edge.

The result is clamped to `[0.5, 0.98]`.

## The 10 request patterns

| # | Pattern | EN keywords | ES keywords | Tasks | Approval |
|---|---------|-------------|-------------|------:|----------|
| 1 | Incident management | incident, critical, urgent, support, ticket, issue | incidencia, crítica, urgente, soporte, ticket, problema | 4 | No |
| 2 | Payment processing | payment, invoice, billing, pay, transaction | pago, factura, facturación, cobro, transacción | 4 | Yes (payment) |
| 3 | Deployment | deploy, deployment, release, rollout, ship | desplegar, despliegue, release, publicar | 3 | Yes (deployment) |
| 4 | Marketing campaign | campaign, marketing, content, social, advertising | campaña, marketing, contenido, social, publicidad | 4 | Yes (campaign_launch) |
| 5 | Contract | contract, agreement, legal, sign, document | contrato, acuerdo, legal, firmar, documento | 3 | Yes (contract) |
| 6 | Research | research, analyze, study, investigate, report | investigar, analizar, estudiar, reportar, informe | 3 | No |
| 7 | Code development | code, develop, implement, feature, bug, fix | código, desarrollar, implementar, función, bug, corregir | 3 | No |
| 8 | Budget analysis | budget, cost, expense, financial, forecast | presupuesto, coste, gasto, financiero, previsión | 3 | No |
| 9 | Customer support | customer, support, help, inquiry, question | cliente, soporte, ayuda, consulta, pregunta | 3 | No |
| 10 | Document generation | document, generate, create, report, write | documento, generar, crear, informe, escribir | 3 | No |

## ExecutionPlan structure

```typescript
interface ExecutionPlan {
  id: string;                         // 'plan-1', 'plan-2', …
  requestId: string;                  // 'req-1', 'req-2', …
  organizationId: string;
  request: string;                    // original user request
  objectives: string[];               // localized objectives
  tasks: PlannedTask[];               // dependency-ordered
  totalEstimatedCost: number;
  totalEstimatedDurationMs: number;
  estimatedSuccessProbability: number;// [0.5, 0.98]
  language: 'en' | 'es' | 'unknown';
  createdAt: string;                  // ISO timestamp
}
```

Each `PlannedTask` carries the selected `agentId`, its `dependencies`
(`finish_to_start`), an `ApprovalRequirement`, and an `outputKey` used to store
the result in shared memory.

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

// English request
const planEn = orchestrator.generatePlan('Deploy to production');
console.log(planEn.language);              // 'en'
console.log(planEn.objectives);            // ['Prepare deployment', 'Execute deployment', 'Verify deployment health']
console.log(planEn.tasks.map((t) => t.name));
// ['Run tests', 'Deploy to production', 'Verify health']
console.log(planEn.tasks[1].approval);     // { required: true, reason: 'deployment' }

// Spanish request
const planEs = orchestrator.generatePlan('Gestiona todas las incidencias críticas recibidas hoy');
console.log(planEs.language);              // 'es'
console.log(planEs.objectives);
// ['Resolver incidencias críticas', 'Notificar a stakeholders afectados', 'Documentar la resolución']
console.log(planEs.tasks.map((t) => t.name));
// ['Triaje de incidencias', 'Resolver incidencias', 'Notificar a stakeholders', 'Documentar resolución']

// Cost & probability
console.log(planEn.totalEstimatedCost, planEn.estimatedSuccessProbability);
```

## See also

- [Agents](agents.md) — how `findBestAgent` binds tasks to agents.
- [Execution](execution.md) — how a plan is executed in parallel.
- [Examples](examples.md) — more planner and workflow examples.
