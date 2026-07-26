# Exporters

Exporters serialize the platform's in-memory metrics, spans, and logs into a
transport format. Three formats are bundled behind an `ExporterRegistry`.

## The three exporter formats

| Format | `ExporterFormat` | Class | Output shape |
|--------|------------------|-------|--------------|
| JSON | `'json'` | `JsonExporter` | Pretty-printed JSON with `scopeMetrics` / `scopeSpans` / `scopeLogs` |
| Prometheus | `'prometheus'` | `PrometheusExporter` | Prometheus text exposition format |
| OpenTelemetry | `'opentelemetry'` | `OpenTelemetryExporter` | OTLP-shaped JSON (mock) |

All three implement the `IExporter` interface:

```ts
interface IExporter {
  format: ExporterFormat;
  exportMetrics(metrics: MetricSample[]): ExportResult;
  exportSpans(spans: Span[]): ExportResult;
  exportLogs(logs: LogEntry[]): ExportResult;
}
```

## ExportResult structure

```ts
interface ExportResult {
  format: ExporterFormat;
  success: boolean;
  recordCount: number;
  payload: string;
  errors?: string[];
}
```

`payload` is always a string: pretty JSON for the JSON and OpenTelemetry
exporters, and the Prometheus text format for the Prometheus exporter.

## Format specifics

**JSON** wraps records under a `resource` (`service.name: 'compilerai'`) and a
`scope` (`compilerai-observability`), emitting `scopeMetrics`, `scopeSpans`,
or `scopeLogs` depending on the method called.

**Prometheus** emits `# HELP` and `# TYPE` comments per metric name (dots
converted to underscores: `request.latency` → `request_latency`), then one
sample line per record with labels for `component`, `org`, `agent`, `skill`,
and any custom tags. Spans export as a `compilerai_span_duration_ms` histogram;
logs export as a `compilerai_log_total` counter aggregated by level.

**OpenTelemetry (mock)** produces OTLP-shaped JSON: `resourceMetrics` /
`resourceSpans` / `resourceLogs` with `timeUnixNano` timestamps (as strings via
`BigInt`), severity numbers (`debug:5`, `info:9`, `warn:13`, `error:17`,
`fatal:21`), and span status codes (`started:0`, `completed:1`, `error:2`).
This is a mock representation suitable for testing and inspection — it is not
a wire-transport client.

## ExporterRegistry

`ExporterRegistry` is constructed with all three exporters pre-registered:

```ts
class ExporterRegistry {
  register(exporter: IExporter): void;                 // add/replace
  get(format: ExporterFormat): IExporter | undefined;  // look up
  getSupportedFormats(): ExporterFormat[];             // ['json','prometheus','opentelemetry']
}
```

## Code example

```ts
import { ObservabilityPlatform, METRIC_NAMES } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

platform.recordMetric({
  name: METRIC_NAMES.LATENCY, type: 'timer', value: 120,
  unit: 'ms', component: 'ai_workflow_copilot',
  organizationId: 'org-42', tags: { endpoint: '/synthesize' },
});

// JSON (default)
const json = platform.exportMetrics();
console.log(json.format);       // 'json'
console.log(json.success);      // true
console.log(json.recordCount);  // 1
console.log(json.payload.slice(0, 40)); // '{\n  "resource": { "service.name":...'

// Prometheus text format
const prom = platform.exportMetrics('prometheus');
console.log(prom.payload.includes('# HELP request_latency')); // true
console.log(prom.payload.includes('component="ai_workflow_copilot"')); // true

// OpenTelemetry (mock OTLP JSON)
const otel = platform.exportMetrics('opentelemetry');
console.log(otel.payload.includes('resourceMetrics')); // true

// Spans and logs can be exported too
const spanJson = platform.exportSpans('json');
const logProm = platform.exportLogs('prometheus');

// Discover supported formats
console.log(platform.getSupportedExportFormats());
// ['json', 'prometheus', 'opentelemetry']
```

On the facade, `exportMetrics(format?)` defaults to `'json'`, feeds
`metrics.getAll()` to the chosen exporter, and emits an `export.completed`
telemetry event. `exportSpans(format?)` and `exportLogs(format?)` behave
analogously for tracing and logging stores.
