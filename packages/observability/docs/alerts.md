# Alerts

The `AlertEngine` evaluates metric samples against rules and produces `Alert`
records. Rules support thresholds, occurrence counts, time windows, and a
per-rule cooldown to avoid alert storms.

## The seven alert types

| `AlertType` | Typical condition | Use case |
|-------------|-------------------|----------|
| `high_latency` | `request.latency` exceeds threshold | Slow requests |
| `repetitive_errors` | `request.errors` count over window | Error bursts |
| `connector_down` | availability or connector count drops | Outage |
| `excessive_consumption` | `organization.operations` or cost spikes | Tenant abuse |
| `auth_failures` | auth success rate below threshold | Security incident |
| `rag_degradation` | RAG latency or index health degrades | Retrieval quality |
| `agent_anomaly` | agent errors or anomalies | Agent misbehavior |

## The four severities

`info` → `warning` → `error` → `critical`

Severity is set on the rule, not derived from the metric; a fired alert
inherits its rule's severity.

## Alert rules, cooldown, acknowledgment

```ts
interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  component: ComponentName;
  condition: AlertCondition;
  enabled: boolean;
  cooldownMs: number;            // default 60000 via createAlertRule
}

interface AlertCondition {
  metric?: string;
  threshold?: number;
  windowMs?: number;             // only consider metrics within this age
  minOccurrences?: number;       // require N matching samples
  comparison?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
}
```

Evaluation logic:

- A rule is skipped when `enabled === false`.
- A rule is skipped while within its `cooldownMs` of its last trigger.
- Relevant metrics are filtered by `rule.component`, `condition.metric`, and
  `condition.windowMs`.
- When `minOccurrences` is set, the **sum** of the matching values must reach
  `threshold` — used for `repetitive_errors`.
- Otherwise the **latest** matching value is compared to `threshold` using
  `comparison`.

Fired alerts are stored, returned from `evaluate()`, and recorded in the
cooldown map. `acknowledge(alertId)` marks an alert acknowledged;
`getActiveAlerts()` returns unacknowledged alerts. `getAlerts(filter?)`
filters by `type`, `severity`, or `component`.

## Reproducible alerts

Use the `createAlertRule(...)` factory to build rules with consistent defaults
(`enabled: true`, `cooldownMs: 60000`). Alert IDs are deterministic counters
(`alert-<base36>`), so re-evaluating the same metrics against the same rules
produces structurally identical alerts modulo timestamp and ID.

## Code example

```ts
import { ObservabilityPlatform, METRIC_NAMES, createAlertRule } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

platform.createAlert(
  createAlertRule(
    'latency-rule',
    'High Latency',
    'high_latency',
    'warning',
    'ai_workflow_copilot',
    { metric: METRIC_NAMES.LATENCY, threshold: 1000, comparison: 'gt' },
    { cooldownMs: 60_000 },
  ),
);

platform.createAlert(
  createAlertRule(
    'errors-rule',
    'Repetitive Errors',
    'repetitive_errors',
    'error',
    'connector_runtime',
    { metric: METRIC_NAMES.ERRORS, threshold: 5, minOccurrences: 3, windowMs: 300_000 },
  ),
);

// Record metrics that trip both rules
for (let i = 0; i < 3; i++) {
  platform.recordMetric({
    name: METRIC_NAMES.LATENCY, type: 'timer', value: 1200 + i * 50,
    unit: 'ms', component: 'ai_workflow_copilot', tags: {},
  });
  platform.recordMetric({
    name: METRIC_NAMES.ERRORS, type: 'counter', value: 2,
    unit: 'count', component: 'connector_runtime', tags: {},
  });
}

const fired = platform.evaluateAlerts();
console.log(fired.length); // 2

const active = platform.getActiveAlerts();
console.log(active.every((a) => !a.acknowledged)); // true

platform.acknowledgeAlert(active[0].id);
console.log(platform.getActiveAlerts().length); // 1
```

On the facade, `evaluateAlerts()` automatically feeds the engine all recorded
metrics via `metrics.getAll()`.
