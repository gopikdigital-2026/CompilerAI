# @compilerai/observability v1.0.0

> Enterprise Observability, Monitoring & AIOps platform for CompilerAI.
> Provides unified metrics collection, distributed tracing, structured logging,
> health monitoring, alerting, AIOps anomaly detection, dashboard models, and
> data exporters across all 8 system components.

## Key features

- **Metrics Engine** — 10 standard metric types (`METRIC_NAMES`): latency,
  throughput, errors, availability, memory, CPU, org usage, cost per op, agent
  usage, skill usage. Supports counters, gauges, histograms, and timers with
  per-org / per-agent / per-skill attribution and percentile aggregations.
- **Distributed Tracing** — spans linked by `traceId` / `spanId` /
  `parentSpanId`, with `durationMs`, `status`, span events, and
  `targetComponent` for cross-component call graphs.
- **Structured Logging** — JSON `LogEntry` records with automatic sensitive
  field redaction (`SENSITIVE_FIELDS`) and recursive context sanitization.
- **Health Monitoring** — 8 built-in health checks (availability, memory,
  queues, connectors, RAG indices, knowledge graph, skills, auth) with
  worst-case status rollup across `healthy` / `warning` / `critical`.
- **Alert Engine** — 7 alert types (`high_latency`, `repetitive_errors`,
  `connector_down`, `excessive_consumption`, `auth_failures`,
  `rag_degradation`, `agent_anomaly`) and 4 severities (`info`, `warning`,
  `error`, `critical`) with threshold comparison, occurrence counts, time
  windows, per-rule cooldown, and acknowledgment.
- **AIOps Engine** — 7 anomaly types (`latency_spike`, `error_burst`,
  `progressive_degradation`, `cost_growth_anomaly`, `agent_blocked`,
  `skill_unstable`, `throughput_drop`) using z-score and linear-regression
  detection with confidence scores and recommendations.
- **Dashboards** — 8 dashboard types (`global_health`, `ai_agents`,
  `connectors`, `rag`, `security`, `skills`, `costs`, `organizations`) with
  typed widgets (line, gauge, table, counter, bar, heatmap) and sensible
  defaults.
- **Exporters** — JSON, Prometheus, and OpenTelemetry (mock OTLP) exporters
  for metrics, spans, and logs, behind a single `ExporterRegistry`.
- **Telemetry Bus** — 8 internal event types tracking every platform action.

## Quick start

```ts
import {
  ObservabilityPlatform,
  METRIC_NAMES,
  createAlertRule,
} from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// Metrics
platform.recordMetric({
  name: METRIC_NAMES.LATENCY, type: 'timer', value: 142,
  unit: 'ms', component: 'ai_workflow_copilot', tags: {},
});

// Tracing
const span = platform.startTrace('synthesize', 'ai_workflow_copilot');
platform.finishTrace(span, 'completed');

// Logging
platform.log('info', 'ai_workflow_copilot', 'done', { traceId: span.traceId });

// Health
console.log(platform.healthStatus());

// Alerts
platform.createAlert(createAlertRule(
  'lat', 'High Latency', 'high_latency', 'warning',
  'ai_workflow_copilot',
  { metric: METRIC_NAMES.LATENCY, threshold: 1000, comparison: 'gt' },
));

// AIOps
const anomalies = platform.detectAnomalies();

// Export
const result = platform.exportMetrics('prometheus');
console.log(result.recordCount, result.success);
```

## Modules

| # | Module | Entry class | Concern |
|---|--------|-------------|---------|
| 1 | `api` | `ObservabilityPlatform` | Unified facade |
| 2 | `metrics` | `MetricsEngine` | Metric recording & aggregation |
| 3 | `tracing` | `TracingEngine` | Distributed spans |
| 4 | `logging` | `StructuredLogger` | Structured logs with redaction |
| 5 | `health` | `HealthMonitor` | Health checks & status |
| 6 | `alerts` | `AlertEngine` | Rule-based alerting |
| 7 | `aiops` | `AIOpsEngine` | Anomaly & trend detection |
| 8 | `dashboards` | `DashboardManager` | Dashboard models |
| 9 | `exporters` | `ExporterRegistry` | JSON / Prometheus / OTLP export |
| 10 | `telemetry` | `TelemetryBus` | Internal event bus |
| 11 | `models` | _(types & constants)_ | Shared domain model |

## Stats

| Metric | Value |
|--------|-------|
| Source files | 12 |
| Test files | 9 |
| Tests | 121 |
| Line coverage | 98.05% |

## Documentation

| Document | Topic |
|----------|-------|
| [docs/architecture.md](docs/architecture.md) | Module map & data flow |
| [docs/metrics.md](docs/metrics.md) | Metric names, samples, aggregation |
| [docs/tracing.md](docs/tracing.md) | Spans, parent/child linking, events |
| [docs/logging.md](docs/logging.md) | Log entries, levels, redaction |
| [docs/health.md](docs/health.md) | Health checks & status rollup |
| [docs/alerts.md](docs/alerts.md) | Alert types, rules, cooldown |
| [docs/aiops.md](docs/aiops.md) | Anomaly & trend detection |
| [docs/exporters.md](docs/exporters.md) | JSON / Prometheus / OTLP export |
| [docs/api.md](docs/api.md) | Public API reference |
| [docs/examples.md](docs/examples.md) | 15 runnable examples |
| [VALIDATION_REPORT.md](VALIDATION_REPORT.md) | Build & test validation |

## License

Proprietary — CompilerAI.
