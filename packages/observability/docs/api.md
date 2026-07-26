# Public API

The `ObservabilityPlatform` class is the single entry point to the package. It
composes the ten engines, exposes them as public readonly fields, and adds
eight convenience methods that implement the `IObservabilityPlatform`
interface.

## The ObservabilityPlatform class

```ts
class ObservabilityPlatform implements IObservabilityPlatform {
  readonly metrics: MetricsEngine;
  readonly tracing: TracingEngine;
  readonly logger: StructuredLogger;
  readonly health: HealthMonitor;
  readonly alerts: AlertEngine;
  readonly aiops: AIOpsEngine;
  readonly dashboards: DashboardManager;
  readonly exporters: ExporterRegistry;
  readonly telemetry: TelemetryBus;

  constructor(); // wires every engine with default configuration
}
```

Every engine is reachable directly (`platform.metrics`, `platform.tracing`, …)
so callers can use an engine's full API. The eight facade methods below cover
the most common workflows and additionally emit telemetry events.

## The eight public API methods

| # | Method | Returns | Telemetry event | Description |
|---|--------|---------|-----------------|-------------|
| 1 | `recordMetric(sample)` | `void` | `metric.recorded` | Record a metric sample |
| 2 | `startTrace(op, component, opts?)` | `Span` | `trace.started` | Start a span |
| 3 | `finishTrace(span, status?)` | `Span` | `trace.finished` | Finish a span with duration |
| 4 | `writeLog(entry)` | `LogEntry` | `log.written` | Write a sanitized log |
| 5 | `healthStatus()` | `HealthStatus` | — | Worst-case rollup of all checks |
| 6 | `createAlert(rule)` | `void` | — | Register an alert rule |
| 7 | `detectAnomalies(metrics?)` | `Anomaly[]` | `anomaly.detected` | Run all AIOps detectors |
| 8 | `exportMetrics(format?)` | `ExportResult` | `export.completed` | Serialize metrics |

A few supporting facade methods round out the API: `queryMetrics`,
`aggregateMetric`, `addTraceEvent`, `getTrace`, `queryLogs`,
`registerHealthCheck`, `runHealthCheck`, `runAllHealthChecks`,
`evaluateAlerts`, `acknowledgeAlert`, `getActiveAlerts`, `detectTrends`,
`getAnomalies`, `createDashboard`, `listDashboards`, `exportSpans`,
`exportLogs`, `getSupportedExportFormats`, `getTelemetryEvents`,
`getTelemetryEventsByType`, plus the `log(level, component, message, opts?)`
convenience helper and the `createAlertRule` / `createWidget` bound factories.

## IObservabilityPlatform interface

```ts
interface IObservabilityPlatform {
  recordMetric(sample: Omit<MetricSample, 'timestamp'>): void;
  startTrace(operationName: string, component: ComponentName, options?: {
    parentSpanId?: string; traceId?: string; targetComponent?: ComponentName;
    organizationId?: string; tags?: Record<string, string>;
  }): Span;
  finishTrace(span: Span, status?: SpanStatus): Span;
  writeLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry;
  healthStatus(): HealthStatus;
  createAlert(rule: AlertRule): void;
  detectAnomalies(metrics?: MetricSample[]): Anomaly[];
  exportMetrics(format?: ExporterFormat): ExportResult;
}
```

## Code example

```ts
import {
  ObservabilityPlatform,
  METRIC_NAMES,
  createAlertRule,
  createWidget,
} from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// 1. Metrics
platform.recordMetric({
  name: METRIC_NAMES.LATENCY, type: 'timer', value: 180,
  unit: 'ms', component: 'ai_workflow_copilot',
  organizationId: 'org-42', tags: {},
});

// 2–3. Tracing
const root = platform.startTrace('handle_request', 'ai_workflow_copilot', {
  organizationId: 'org-42',
});
platform.finishTrace(root, 'completed');

// 4. Logging
platform.log('info', 'ai_workflow_copilot', 'request handled', {
  traceId: root.traceId,
  context: { latencyMs: 180 },
});

// 5. Health
platform.registerHealthCheck('uptime', 'observability', async () => ({
  status: 'healthy', message: 'up', details: {},
}));
await platform.runAllHealthChecks();
console.log(platform.healthStatus()); // 'healthy'

// 6. Alerts
platform.createAlert(createAlertRule(
  'lat', 'High Latency', 'high_latency', 'warning',
  'ai_workflow_copilot',
  { metric: METRIC_NAMES.LATENCY, threshold: 150, comparison: 'gt' },
));
const fired = platform.evaluateAlerts();

// 7. AIOps
const anomalies = platform.detectAnomalies();

// 8. Export
const result = platform.exportMetrics('prometheus');
console.log(result.recordCount, result.success);

// Bonus: dashboards + telemetry
platform.createDashboard('ai_agents', 'Agent Ops');
console.log(platform.getTelemetryEvents().length); // grows with each action
```

Construct one `ObservabilityPlatform` per process (or per test) and share it
across components. The platform holds no external connections, so disposal is
simply dropping the reference or calling `clear()` on the individual engines.
