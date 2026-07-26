# Architecture

The `@compilerai/observability` package is organized into eleven cohesive
modules behind a single `ObservabilityPlatform` facade. Each module owns one
observability concern and exposes a small interface defined in `src/models.ts`.

## Module map

```
                            ┌──────────────────────────────────────┐
                            │       ObservabilityPlatform          │
                            │         (api facade)                 │
                            └──────────────┬───────────────────────┘
                                           │ delegates to
   ┌───────────────┬───────────────┬───────┴────────┬────────────────┬──────────────┐
   ▼               ▼               ▼                ▼                ▼              ▼
┌──────────┐ ┌───────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│ metrics  │ │  tracing  │ │   logging   │ │    health    │ │   alerts    │ │   aiops     │
│ Metrics  │ │ Tracing   │ │ Structured  │ │   Health     │ │   Alert     │ │  AIOps      │
│ Engine   │ │ Engine    │ │ Logger      │ │   Monitor    │ │   Engine    │ │  Engine     │
└────┬─────┘ └─────┬─────┘ └──────┬──────┘ └──────┬───────┘ └──────┬──────┘ └──────┬──────┘
     │             │              │               │                │              │
     ▼             ▼              ▼               ▼                ▼              ▼
 MetricSample    Span          LogEntry       HealthCheck        Alert          Anomaly
 /MetricQuery   /SpanEvent     /LogQuery      /HealthStatus     /AlertRule      /Trend
     │             │              │               │                │              │
     └─────────────┴──────┬───────┴───────────────┴────────────────┴──────────────┘
                          │ consumed by
                          ▼
                 ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
                 │    dashboards    │        │    exporters     │        │    telemetry     │
                 │  Dashboard       │        │  Exporter        │        │  Telemetry       │
                 │  Manager         │        │  Registry        │        │  Bus             │
                 └──────────────────┘        └──────────────────┘        └──────────────────┘
                          │                          │                          │
                          ▼                          ▼                          ▼
                    Dashboard                  ExportResult              TelemetryEvent
                    /Widget                    (json|prometheus|         (8 event types)
                                               opentelemetry)
```

## Module descriptions

| # | Module | Class | Responsibility |
|---|--------|-------|----------------|
| 1 | `api` | `ObservabilityPlatform` | Unified facade wiring every engine together |
| 2 | `metrics` | `MetricsEngine` | Record, query, and aggregate metric samples |
| 3 | `tracing` | `TracingEngine` | Distributed spans with parent/child linking |
| 4 | `logging` | `StructuredLogger` | JSON logs with sensitive-field redaction |
| 5 | `health` | `HealthMonitor` | Register and run health checks, compute status |
| 6 | `alerts` | `AlertEngine` | Rule-based alert evaluation with cooldown |
| 7 | `aiops` | `AIOpsEngine` | Statistical anomaly and trend detection |
| 8 | `dashboards` | `DashboardManager` | Dashboard models with typed widgets |
| 9 | `exporters` | `ExporterRegistry` | JSON / Prometheus / OpenTelemetry exporters |
| 10 | `telemetry` | `TelemetryBus` | Internal event bus for platform activity |
| 11 | `models` | _(types)_ | Shared domain interfaces and constants |

The `models` module has no runtime class — it declares the types and the two
shared constants (`METRIC_NAMES`, `SENSITIVE_FIELDS`) imported by every engine.

## Data flow

Observability data moves through the platform in a single direction:

```
recordMetric ─┐
              ├─► MetricsEngine ──► AlertEngine.evaluate ──► Alerts
              │        │                                   │
startTrace ───┤        └─► AIOpsEngine.detect* ──► Anomalies │
              │                                            ▼
writeLog ─────┤                                   TelemetryBus.emit
              │                                            │
health ───────┘                                            ▼
        │                                          exporters.export*
        ▼                                                  │
   DashboardManager ◄──────────────────────────────────────┘
```

1. **Metrics** are recorded once and become the substrate for every other
   signal — alerts, anomalies, trends, and dashboards all read from the same
   `MetricSample[]` store.
2. **Tracing** produces `Span` objects linked by `traceId` / `parentSpanId`;
   finished spans can be exported alongside metrics.
3. **Logging** writes `LogEntry` records whose `traceId` and `correlationId`
   join them back to the trace that produced them.
4. **Health** runs registered checkers and rolls their results up into a single
   `HealthStatus`.
5. **Alerts** evaluate metric samples against rules; fired alerts are emitted on
   the telemetry bus.
6. **AIOps** runs statistical detectors (z-score, linear regression) over
   metrics to surface anomalies and trends.
7. **Exporters** serialize the accumulated metrics, spans, and logs into JSON,
   Prometheus, or OpenTelemetry payloads.

## Component integration

The eight monitored CompilerAI components are modeled as the `ComponentName`
union (the ninth value, `observability`, is the platform itself):

| Component | `ComponentName` value | Typical signals |
|-----------|----------------------|-----------------|
| Connector Runtime | `connector_runtime` | throughput, connector-down alerts |
| Automation Studio | `automation_studio` | latency, errors |
| AI Workflow Copilot | `ai_workflow_copilot` | latency, agent usage |
| Multi-Agent | `multi_agent` | agent operations, blocked-agent anomalies |
| Knowledge Graph | `knowledge_graph` | node-count health check |
| Enterprise RAG | `enterprise_rag` | RAG index health, RAG degradation alerts |
| Skills Marketplace | `skills_marketplace` | skill invocations, unstable-skill anomalies |
| Security & Governance | `security_governance` | auth failures, auth success rate |

Every metric, span, log, alert, anomaly, and dashboard widget carries a
`component` field so that data can always be sliced by the originating system.

## Design notes

- **No external runtime dependencies.** The package depends only on the Node.js
  standard library; TypeScript, tsx, eslint, and `@types/node` are dev-only.
- **In-memory storage.** Each engine keeps samples in memory and exposes
  `getAll()` / `clear()` for testability. Persistence is an exporter concern.
- **Facade by composition.** `ObservabilityPlatform` holds public readonly
  references to each engine (`platform.metrics`, `platform.tracing`, …), so
  callers can drop down to a single engine when they need its full API while
  still using the facade for the common eight methods.
