# Chaos Testing

The Chaos module runs controlled failure simulations against the resilience subsystem,
records detected issues and recovery timing, and aggregates results into a resilience
report. It is implemented in `src/chaos/ChaosEngine.ts` and modeled by the `IChaosEngine`
interface.

---

## Scenario types

`ChaosScenarioType` enumerates six scenario types. Each `ChaosScenario` carries
`{ id, type, name, description, durationMs, intensity, targetComponent? }`.

| Type | Description | Detected issues (sample) |
|------|-------------|---------------------------|
| `connector_failure` | Simulates the failure of one or more connectors | "Connector became unavailable", "Circuit breaker opened" |
| `memory_pressure` | Simulates high memory usage conditions | "Memory usage exceeded 85%", "Garbage collection pressure detected" |
| `agent_timeout` | Simulates agents timing out during task execution | "Agent did not respond within timeout", "Task queue backlog detected" |
| `data_corruption` | Simulates data corruption in storage systems | "Checksum mismatch detected", "Backup validation triggered" |
| `high_latency` | Simulates elevated latency across components | "p95 latency exceeded threshold", "AIOps anomaly detection triggered" |
| `service_interruption` | Simulates complete service interruption | "Service health check failed", "Failover initiated", "Queue recovery started" |

A run is considered `passed` when at least one issue was detected (i.e. the system
recognized the failure) and `recovered` is `true` when recovery actions completed.

---

## Scenario factories

Each scenario type has a factory helper that creates a ready-to-register scenario with
sensible defaults:

| Factory | Signature |
|---------|-----------|
| `createConnectorFailureScenario` | `(durationMs?, targetComponent?) => ChaosScenario` |
| `createMemoryPressureScenario` | `(durationMs?) => ChaosScenario` |
| `createAgentTimeoutScenario` | `(durationMs?, targetComponent?) => ChaosScenario` |
| `createDataCorruptionScenario` | `(durationMs?) => ChaosScenario` |
| `createHighLatencyScenario` | `(durationMs?) => ChaosScenario` |
| `createServiceInterruptionScenario` | `(durationMs?, targetComponent?) => ChaosScenario` |

`createDefaultChaosScenarios()` returns all six, and the constant `CHAOS_SCENARIO_TYPES`
lists the type strings. The `ResiliencePlatform` constructor calls
`chaos.registerAllDefaults()` so all six scenarios are registered out of the box.

---

## Resilience report generation

`generateReport()` aggregates every `ChaosResult` recorded so far into a `ResilienceReport`:

| Field | Description |
|-------|-------------|
| `totalScenarios` | Number of results recorded |
| `passed` | Scenarios that passed and recovered |
| `failed` | Scenarios that did not pass or did not recover |
| `scenarios` | Full list of `ChaosResult` objects |
| `overallResilienceScore` | `round(passed / total * 100)`, or `100` when empty |
| `recommendations` | Auto-generated guidance (see below) |
| `generatedAt` | ISO timestamp |

Recommendations are generated heuristically:

- If any scenario failed → "N scenario(s) did not pass — review resilience configuration".
- If any recovery took over 5 seconds → "consider tuning failover thresholds".
- If a `data_corruption` scenario did not recover → "verify backup integrity".
- If the score is 100 → "All scenarios passed — system is resilient to tested failures".

---

## Code example

```ts
import {
  ChaosEngine,
  createConnectorFailureScenario,
  createMemoryPressureScenario,
} from '@compilerai/resilience';

const chaos = new ChaosEngine();
chaos.registerAllDefaults(); // register all 6 default scenarios

// Register an additional custom scenario
chaos.registerScenario(createConnectorFailureScenario(2000, 'payments-connector'));

// Run a single scenario
const scenarioId = chaos.getScenarios()[0].id;
const result = chaos.runScenario(scenarioId);
console.log(result.passed, result.recovered, result.detectedIssues);

// Run every registered scenario
const allResults = chaos.runAllScenarios();

// Generate a report
const report = chaos.generateReport();
console.log(report.overallResilienceScore); // 0–100
for (const rec of report.recommendations) console.log('-', rec);
```

### Via the facade

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform(); // defaults already registered

const id = platform.chaos.getScenarios()[0].id;
const r = platform.runChaosScenario(id);    // emits chaos.finished
const report = platform.generateChaosReport();

// Run all scenarios at once
const results = platform.runAllChaosScenarios();
```

`runChaosScenario` emits a `chaos.finished` telemetry event with the scenario id, pass flag,
and recovery flag. Running an unknown id returns a `ChaosResult` with `executed: false` and a
"Scenario not found" issue rather than throwing.
