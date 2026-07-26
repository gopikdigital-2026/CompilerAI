# AIOps

The `AIOpsEngine` applies lightweight statistics to metric samples to detect
anomalies and trends without an external ML service. Detection runs entirely
in-process over the same `MetricSample[]` store used by the rest of the
platform.

## The seven anomaly types

| `AnomalyType` | Detector | Trigger |
|---------------|----------|---------|
| `latency_spike` | z-score | latest latency `|z| > 3` |
| `error_burst` | z-score | latest error count `|z| > 3` |
| `throughput_drop` | z-score | latest throughput `|z| > 3` (negative) |
| `progressive_degradation` | linear regression | latency slope up, 2nd-half avg `> 1.5×` 1st-half |
| `cost_growth_anomaly` | linear regression | cost slope up, 2nd-half avg `> 1.3×` 1st-half |
| `agent_blocked` | cumulative errors | an agent's total errors `>= 10` |
| `skill_unstable` | cumulative errors | a skill's total errors `>= 5` |

## Statistical detection

`detectAnomalies(metrics, window = 20)` groups samples by metric name, takes
the last `window` values, and computes their mean and population standard
deviation. For each group with at least 3 samples and `stddev > 0`, it
computes the z-score of the latest value:

```
z = (latest - mean) / stddev
```

- `|z| > 3` flags an anomaly. The type is inferred from the metric name:
  names containing `latency` → `latency_spike`, `error` → `error_burst`,
  otherwise → `throughput_drop`.
- Severity is `critical` when `|z| > 4`, else `error`.
- Confidence is `min(1, |z| / 5)`.

`detectAnomalies` also runs the agent-blocked and skill-unstable detectors
(see below) and appends every detected anomaly to the engine's internal store.

## Trend detection

`detectTrends(metricName, samples)` fits a simple linear regression
(ordinary least squares) to the metric's values ordered by timestamp and
returns a `Trend`:

```ts
interface Trend {
  component: ComponentName;
  metric: string;
  direction: 'up' | 'down' | 'flat';   // slope > 0.01 / < -0.01 / else
  slope: number;
  samples: number;
  confidence: number;                    // R², clamped to [0, 1]
}
```

At least 3 samples are required; fewer returns an empty array.

## Progressive degradation and cost growth

`detectProgressiveDegradation(metrics)` filters to latency metrics, needs at
least 5, fits a regression, and fires when `slope > 0` **and** `confidence
(R²) > 0.6` **and** the second-half average is more than `1.5×` the first-half
average. Severity is `warning`.

`detectCostGrowth(metrics)` operates on samples that carry a positive
`estimatedCost`. It fires when `slope > 0`, `confidence > 0.5`, and the
second-half average is more than `1.3×` the first-half. It also attaches a
`recommendation`: *"Review resource allocation and consider implementing cost
optimization policies."*

## Confidence scores and recommendations

Every `Anomaly` carries a `confidence` in `[0, 1]`:

```ts
interface Anomaly {
  id: string;
  type: AnomalyType;
  component: ComponentName;
  severity: AlertSeverity;
  description: string;
  detectedAt: string;
  confidence: number;
  metrics: Record<string, number>;   // z-score, slope, averages, counts…
  recommendation?: string;           // present on cost growth
  organizationId?: string;
}
```

`getAnomalies()` returns every anomaly accumulated by the engine;
`clear()` empties the store; `count()` reports the size.

## Code example

```ts
import { ObservabilityPlatform, METRIC_NAMES } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// Seed 5 normal latencies then a spike
const base = 100;
for (let i = 0; i < 5; i++) {
  platform.recordMetric({
    name: METRIC_NAMES.LATENCY, type: 'timer', value: base + i,
    unit: 'ms', component: 'ai_workflow_copilot', tags: {},
  });
}
platform.recordMetric({
  name: METRIC_NAMES.LATENCY, type: 'timer', value: 2000, // spike
  unit: 'ms', component: 'ai_workflow_copilot', tags: {},
});

const anomalies = platform.detectAnomalies();
const spike = anomalies.find((a) => a.type === 'latency_spike');
console.log(spike?.severity);   // 'error' or 'critical'
console.log(spike?.confidence); // ~0.8–1.0
console.log(spike?.metrics);    // { zScore, expectedMean, actualValue, stddev }

// Trend for the same metric
const [trend] = platform.detectTrends(METRIC_NAMES.LATENCY);
console.log(trend.direction);   // 'up'
console.log(trend.slope);       // positive number
```

On the facade, `detectAnomalies()` runs all three detectors — z-score,
progressive degradation, and cost growth — and emits an `anomaly.detected`
telemetry event for each finding.
