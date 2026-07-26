# Metrics

The `MetricsEngine` is the foundational module of the observability platform.
Every other signal — alerts, anomalies, trends, dashboards, and exports — is
derived from the `MetricSample` records it stores.

## Standard metric names

The `METRIC_NAMES` constant defines the canonical metric identifiers used
across all eight monitored components:

| Constant | Name | Unit | Type |
|----------|------|------|------|
| `LATENCY` | `request.latency` | `ms` | timer / histogram |
| `THROUGHPUT` | `request.throughput` | `ops/s` | gauge |
| `ERRORS` | `request.errors` | `count` | counter |
| `AVAILABILITY` | `system.availability` | `%` | gauge |
| `MEMORY` | `system.memory_usage` | `%` | gauge |
| `CPU` | `system.cpu_usage` | `%` | gauge |
| `ORG_USAGE` | `organization.operations` | `count` | counter |
| `COST_PER_OP` | `cost.per_operation` | `USD` | gauge |
| `AGENT_USAGE` | `agent.operations` | `count` | counter |
| `SKILL_USAGE` | `skill.invocations` | `count` | counter |

Each sample also declares a `MetricType` of `counter`, `gauge`, `histogram`,
or `timer`.

## MetricSample structure

```ts
interface MetricSample {
  name: string;              // e.g. 'request.latency'
  type: MetricType;          // 'counter' | 'gauge' | 'histogram' | 'timer'
  value: number;
  unit: string;              // e.g. 'ms', '%', 'USD'
  component: ComponentName;  // originating component
  organizationId?: string;   // optional tenant attribution
  agentId?: string;          // optional agent attribution
  skillId?: string;          // optional skill attribution
  timestamp: string;         // ISO-8601, auto-assigned on record
  tags: Record<string, string>;
  estimatedCost?: number;    // optional, drives cost-growth detection
}
```

The `timestamp` is assigned automatically by `record()` and must not be
supplied by the caller (`record` takes `Omit<MetricSample, 'timestamp'>`).

## Querying and aggregation

`query(filter)` filters samples by component, organization, agent, skill,
metric name, and a `[startTime, endTime]` window, then returns up to
`limit` (default 1000) of the most recent matches.

`aggregate(name, filter?)` computes full statistical rollups over a metric:

```ts
interface MetricAggregation {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}
```

Percentiles are computed from the sorted value set using the nearest-rank
method. When no samples match, every field returns `0` and `count` returns `0`.

## Per-organization, per-agent, per-skill tracking

Every sample can carry `organizationId`, `agentId`, and `skillId`. These three
optional attribution fields let you slice the same metric store three ways
without re-recording:

```ts
import { ObservabilityPlatform, METRIC_NAMES } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// Record a latency sample attributed to an org, an agent, and a skill
platform.recordMetric({
  name: METRIC_NAMES.LATENCY,
  type: 'timer',
  value: 142,
  unit: 'ms',
  component: 'multi_agent',
  organizationId: 'org-42',
  agentId: 'agent-7',
  skillId: 'skill-retrieval',
  tags: { endpoint: '/synthesize' },
  estimatedCost: 0.0021,
});

// Aggregate latency across that organization only
const agg = platform.aggregateMetric(METRIC_NAMES.LATENCY, {
  organizationId: 'org-42',
});
console.log(agg.p95); // 142

// Query agent-scoped throughput
const samples = platform.queryMetrics({
  agentId: 'agent-7',
  name: METRIC_NAMES.THROUGHPUT,
});
```

Use `getMetricNames()` to list every distinct metric name recorded so far, and
`clear()` to reset the store (primarily for tests).
