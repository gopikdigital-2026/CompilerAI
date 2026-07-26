# Examples

Fifteen complete, runnable examples that exercise every part of the
`@compilerai/observability` package. Each example is self-contained — copy it
into a `.ts` file and run with `node --import tsx file.ts`. All examples import
from the package root:

```ts
import {
  ObservabilityPlatform,
  METRIC_NAMES,
  createAlertRule,
  createWidget,
  createAvailabilityCheck,
  createMemoryCheck,
  createQueueCheck,
  createConnectorCheck,
  createRagIndexCheck,
  createKnowledgeGraphCheck,
  createSkillsCheck,
  createAuthCheck,
} from '@compilerai/observability';
import type { ComponentName } from '@compilerai/observability';
```

---

## 1. Record metrics from all 8 components

Record one representative metric for each monitored CompilerAI component.

```ts
const platform = new ObservabilityPlatform();

const components: Array<[ComponentName, string, number, string]> = [
  ['connector_runtime',    METRIC_NAMES.THROUGHPUT,  420,  'ops/s'],
  ['automation_studio',    METRIC_NAMES.LATENCY,     88,   'ms'],
  ['ai_workflow_copilot',  METRIC_NAMES.LATENCY,     142,  'ms'],
  ['multi_agent',          METRIC_NAMES.AGENT_USAGE, 12,   'count'],
  ['knowledge_graph',      METRIC_NAMES.MEMORY,      54,   '%'],
  ['enterprise_rag',       METRIC_NAMES.THROUGHPUT,  210,  'ops/s'],
  ['skills_marketplace',   METRIC_NAMES.SKILL_USAGE, 37,   'count'],
  ['security_governance',  METRIC_NAMES.ERRORS,      1,    'count'],
];

for (const [component, name, value, unit] of components) {
  platform.recordMetric({ name, type: 'gauge', value, unit, component, tags: {} });
}

console.log(platform.metrics.count());        // 8
console.log(platform.metrics.getMetricNames()); // distinct names recorded
```

> The `ComponentName` union also includes `observability` (the platform
> itself); the eight entries above are the monitored application components.

---

## 2. Start and finish a distributed trace

```ts
const platform = new ObservabilityPlatform();

const span = platform.startTrace('ingest_document', 'enterprise_rag', {
  organizationId: 'org-42',
  tags: { source: 'upload' },
});

// …do work…
platform.addTraceEvent(span, 'chunks_created', { count: 18 });

const finished = platform.finishTrace(span, 'completed');
console.log(finished.status);     // 'completed'
console.log(finished.durationMs); // >= 0
console.log(finished.endTime);    // ISO-8601

const trace = platform.getTrace(finished.traceId);
console.log(trace.length);        // 1
```

---

## 3. Parent-child span linking

Build a two-level trace where a Copilot root span calls into Multi-Agent.

```ts
const platform = new ObservabilityPlatform();

const root = platform.startTrace('synthesize', 'ai_workflow_copilot', {
  organizationId: 'org-42',
});

const child = platform.startTrace('orchestrate', 'ai_workflow_copilot', {
  parentSpanId: root.spanId,
  traceId: root.traceId,            // join the same trace
  targetComponent: 'multi_agent',
  organizationId: 'org-42',
});

const grandchild = platform.startTrace('run_agent', 'multi_agent', {
  parentSpanId: child.spanId,
  traceId: root.traceId,
  targetComponent: 'multi_agent',
  organizationId: 'org-42',
});

platform.finishTrace(grandchild, 'completed');
platform.finishTrace(child, 'completed');
platform.finishTrace(root, 'completed');

const trace = platform.getTrace(root.traceId);
console.log(trace.length);              // 3
console.log(trace[2].parentSpanId);     // child.spanId
console.log(trace[1].targetComponent);  // 'multi_agent'
```

---

## 4. Write structured logs with sensitive-data redaction

```ts
const platform = new ObservabilityPlatform();

const entry = platform.writeLog({
  level: 'info',
  component: 'security_governance',
  organizationId: 'org-42',
  userId: 'u-1',
  message: 'User signed in',
  correlationId: 'corr-1',
  context: {
    method: 'oidc',
    accessToken: 'eyJabc...',               // redacted
    refreshToken: 'rt_xyz',                 // redacted
    nested: { apiKey: 'sk_live', ok: true },// apiKey redacted, ok kept
  },
});

console.log(entry.context.accessToken);      // '[REDACTED]'
console.log(entry.context.refreshToken);     // '[REDACTED]'
console.log(entry.context.nested.apiKey);    // '[REDACTED]'
console.log(entry.context.nested.ok);        // true
console.log(entry.context.method);           // 'oidc'

// Query logs by correlation id to follow a request across components
platform.log('warn', 'connector_runtime', 'retrying', {
  correlationId: 'corr-1',
  context: { attempt: 2 },
});
console.log(platform.queryLogs({ correlationId: 'corr-1' }).length); // 2
```

---

## 5. Register and run health checks

Register the eight built-in checks and observe the worst-case rollup change.

```ts
const platform = new ObservabilityPlatform();

let mem = 60, authRate = 99, queueDepth = 300, activeConnectors = 3;

platform.registerHealthCheck('availability', 'connector_runtime',
  createAvailabilityCheck('connector_runtime', () => true));
platform.registerHealthCheck('memory', 'observability',
  createMemoryCheck(() => mem));
platform.registerHealthCheck('queue', 'automation_studio',
  createQueueCheck(() => queueDepth, 1000));
platform.registerHealthCheck('connectors', 'connector_runtime',
  createConnectorCheck(() => activeConnectors, 1));
platform.registerHealthCheck('rag_index', 'enterprise_rag',
  createRagIndexCheck(() => 1280));
platform.registerHealthCheck('knowledge_graph', 'knowledge_graph',
  createKnowledgeGraphCheck(() => 54_000));
platform.registerHealthCheck('skills', 'skills_marketplace',
  createSkillsCheck(() => 12));
platform.registerHealthCheck('auth', 'security_governance',
  createAuthCheck(() => authRate));

await platform.runAllHealthChecks();
console.log(platform.healthStatus()); // 'healthy'

mem = 93; authRate = 94;              // push memory->critical, auth->warning
await platform.runAllHealthChecks();
console.log(platform.healthStatus()); // 'critical'

const auth = platform.health.getChecks().find((c) => c.name === 'auth');
console.log(auth?.status, auth?.message); // 'warning' 'Authentication success rate: 94%'
```

---

## 6. Create and evaluate alert rules

```ts
const platform = new ObservabilityPlatform();

platform.createAlert(createAlertRule(
  'lat', 'High Latency', 'high_latency', 'warning',
  'ai_workflow_copilot',
  { metric: METRIC_NAMES.LATENCY, threshold: 1000, comparison: 'gt' },
  { cooldownMs: 60_000 },
));

platform.createAlert(createAlertRule(
  'errs', 'Repetitive Errors', 'repetitive_errors', 'error',
  'connector_runtime',
  { metric: METRIC_NAMES.ERRORS, threshold: 5, minOccurrences: 3, windowMs: 300_000 },
));

for (let i = 0; i < 3; i++) {
  platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
    value: 1100 + i * 50, unit: 'ms', component: 'ai_workflow_copilot', tags: {} });
  platform.recordMetric({ name: METRIC_NAMES.ERRORS, type: 'counter',
    value: 2, unit: 'count', component: 'connector_runtime', tags: {} });
}

const fired = platform.evaluateAlerts();
console.log(fired.length);                       // 2
console.log(platform.getActiveAlerts().length);  // 2

platform.acknowledgeAlert(fired[0].id);
console.log(platform.getActiveAlerts().length);  // 1

// Re-evaluating inside the cooldown does not re-fire
console.log(platform.evaluateAlerts().length);   // 0
```

---

## 7. Detect latency-spike anomalies

```ts
const platform = new ObservabilityPlatform();

for (let i = 0; i < 5; i++) {
  platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
    value: 100 + i, unit: 'ms', component: 'ai_workflow_copilot', tags: {} });
}
platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
  value: 2500, unit: 'ms', component: 'ai_workflow_copilot', tags: {} }); // spike

const anomalies = platform.detectAnomalies();
const spike = anomalies.find((a) => a.type === 'latency_spike');
console.log(spike?.type);        // 'latency_spike'
console.log(spike?.severity);    // 'error' or 'critical'
console.log(spike?.confidence);  // ~0.8–1.0
console.log(spike?.metrics.zScore); // large positive number
```

---

## 8. Detect progressive degradation

Progressive degradation needs a steadily increasing latency series with enough
samples and a clear upward slope.

```ts
const platform = new ObservabilityPlatform();

// 8 samples rising from 100ms to 900ms — second-half avg > 1.5× first-half
for (let i = 0; i < 8; i++) {
  platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
    value: 100 + i * 100, unit: 'ms', component: 'enterprise_rag', tags: {} });
}

const anomalies = platform.detectAnomalies();
const degradation = anomalies.find((a) => a.type === 'progressive_degradation');
console.log(degradation?.type);        // 'progressive_degradation'
console.log(degradation?.severity);    // 'warning'
console.log(degradation?.confidence);  // > 0.6

const [trend] = platform.detectTrends(METRIC_NAMES.LATENCY);
console.log(trend.direction); // 'up'
console.log(trend.slope > 0); // true
```

---

## 9. Detect cost-growth anomalies

Cost growth uses the optional `estimatedCost` field on each metric sample.

```ts
const platform = new ObservabilityPlatform();

// 6 samples with steadily increasing estimatedCost
const costs = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32];
for (let i = 0; i < costs.length; i++) {
  platform.recordMetric({
    name: METRIC_NAMES.COST_PER_OP, type: 'gauge',
    value: costs[i], unit: 'USD', component: 'multi_agent',
    tags: {}, estimatedCost: costs[i],
  });
}

const anomalies = platform.detectAnomalies();
const cost = anomalies.find((a) => a.type === 'cost_growth_anomaly');
console.log(cost?.type);           // 'cost_growth_anomaly'
console.log(cost?.severity);       // 'warning'
console.log(cost?.recommendation); // 'Review resource allocation…'
console.log(cost?.confidence);     // > 0.5
```

---

## 10. Detect blocked agents and unstable skills

Agent-blocked fires on cumulative agent errors `>= 10`; skill-unstable fires
on cumulative skill errors `>= 5`.

```ts
const platform = new ObservabilityPlatform();

// Agent 'agent-7' accumulates 12 errors across 4 samples
for (let i = 0; i < 4; i++) {
  platform.recordMetric({ name: METRIC_NAMES.ERRORS, type: 'counter',
    value: 3, unit: 'count', component: 'multi_agent',
    agentId: 'agent-7', tags: {} });
}

// Skill 'skill-ret' accumulates 6 errors across 3 samples
for (let i = 0; i < 3; i++) {
  platform.recordMetric({ name: METRIC_NAMES.ERRORS, type: 'counter',
    value: 2, unit: 'count', component: 'skills_marketplace',
    skillId: 'skill-ret', tags: {} });
}

const anomalies = platform.detectAnomalies();
const blocked = anomalies.find((a) => a.type === 'agent_blocked');
const unstable = anomalies.find((a) => a.type === 'skill_unstable');

console.log(blocked?.type, blocked?.severity);   // 'agent_blocked' 'error'
console.log(unstable?.type, unstable?.severity);  // 'skill_unstable' 'warning'
console.log(blocked?.metrics.totalErrors);        // 12
console.log(unstable?.metrics.totalErrors);       // 6
```

---

## 11. Create dashboards with widgets

```ts
const platform = new ObservabilityPlatform();

// A dashboard of type 'ai_agents' ships with two default widgets
const dash = platform.createDashboard('ai_agents', 'Agent Operations');
console.log(dash.type);           // 'ai_agents'
console.log(dash.widgets.length); // 2 (default widgets)

// Add a custom widget
const widget = createWidget(
  'P95 Agent Latency', 'gauge', METRIC_NAMES.LATENCY, 'multi_agent',
  { refreshIntervalMs: 10_000, query: { name: METRIC_NAMES.LATENCY, component: 'multi_agent' } },
);
platform.dashboards.addWidget(dash.id, widget);
console.log(dash.widgets.length); // 3

// Remove a widget
platform.dashboards.removeWidget(dash.id, widget.id);
console.log(dash.widgets.length); // 2

// List and filter by type
platform.createDashboard('rag', 'RAG Monitoring');
console.log(platform.listDashboards().length);          // 2
console.log(platform.dashboards.getByType('rag').length); // 1
```

---

## 12. Export metrics to JSON

```ts
const platform = new ObservabilityPlatform();

platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
  value: 120, unit: 'ms', component: 'ai_workflow_copilot',
  organizationId: 'org-42', tags: { endpoint: '/synthesize' } });
platform.recordMetric({ name: METRIC_NAMES.ERRORS, type: 'counter',
  value: 0, unit: 'count', component: 'ai_workflow_copilot', tags: {} });

const result = platform.exportMetrics(); // defaults to 'json'
console.log(result.format);      // 'json'
console.log(result.success);     // true
console.log(result.recordCount); // 2

const parsed = JSON.parse(result.payload);
console.log(parsed.scopeMetrics[0].scope.name); // 'compilerai-observability'
console.log(parsed.scopeMetrics[0].metrics.length); // 2
```

---

## 13. Export metrics to Prometheus format

```ts
const platform = new ObservabilityPlatform();

platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
  value: 120, unit: 'ms', component: 'ai_workflow_copilot',
  organizationId: 'org-42', tags: { endpoint: '/synthesize' } });
platform.recordMetric({ name: METRIC_NAMES.THROUGHPUT, type: 'gauge',
  value: 420, unit: 'ops/s', component: 'connector_runtime', tags: {} });

const result = platform.exportMetrics('prometheus');
console.log(result.format); // 'prometheus'
console.log(result.payload.includes('# HELP request_latency'));           // true
console.log(result.payload.includes('# TYPE request_latency gauge'));     // true (timer -> gauge)
console.log(result.payload.includes('component="ai_workflow_copilot"'));  // true
console.log(result.payload.includes('org="org-42"'));                     // true
console.log(result.payload.includes('endpoint="/synthesize"'));           // true
```

> The Prometheus exporter maps `counter` metrics to `# TYPE … counter` and
> every other type to `# TYPE … gauge`, and converts dotted metric names to
> underscores (`request.latency` → `request_latency`).

---

## 14. Export to OpenTelemetry format

```ts
const platform = new ObservabilityPlatform();

platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
  value: 120, unit: 'ms', component: 'multi_agent',
  agentId: 'agent-7', tags: {} });

// Also export spans and logs in OTLP shape
const span = platform.startTrace('run_agent', 'multi_agent', { agentId: 'agent-7' });
platform.finishTrace(span, 'completed');
platform.log('info', 'multi_agent', 'agent finished', { traceId: span.traceId });

const metrics = platform.exportMetrics('opentelemetry');
const spans = platform.exportSpans('opentelemetry');
const logs = platform.exportLogs('opentelemetry');

console.log(metrics.payload.includes('resourceMetrics')); // true
console.log(metrics.payload.includes('timeUnixNano'));    // true
console.log(spans.payload.includes('resourceSpans'));     // true
console.log(spans.payload.includes('spanId'));            // true
console.log(logs.payload.includes('resourceLogs'));       // true
console.log(logs.payload.includes('severityNumber'));     // true
```

> The OpenTelemetry exporter is a **mock** OTLP-shaped JSON serializer — it
> does not open a network connection. It is intended for inspection and for
> wiring into a real OTLP sender in production.

---

## 15. Full end-to-end observability workflow

A single workflow that records metrics, traces a request, logs with
correlation, checks health, fires an alert, detects an anomaly, builds a
dashboard, exports the data, and inspects the telemetry bus.

```ts
const platform = new ObservabilityPlatform();

// (a) Alert rule + health checks
platform.createAlert(createAlertRule(
  'lat', 'High Latency', 'high_latency', 'critical',
  'ai_workflow_copilot',
  { metric: METRIC_NAMES.LATENCY, threshold: 500, comparison: 'gt' },
));
platform.registerHealthCheck('uptime', 'connector_runtime',
  createAvailabilityCheck('connector_runtime', () => true));

// (b) Trace a request across two components
const root = platform.startTrace('handle_request', 'ai_workflow_copilot', {
  organizationId: 'org-42',
});
const child = platform.startTrace('call_rag', 'ai_workflow_copilot', {
  parentSpanId: root.spanId,
  traceId: root.traceId,
  targetComponent: 'enterprise_rag',
  organizationId: 'org-42',
});

// (c) Record metrics along the way — including a latency that trips the alert
for (let i = 0; i < 5; i++) {
  platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
    value: 80 + i * 20, unit: 'ms', component: 'ai_workflow_copilot',
    organizationId: 'org-42', tags: {} });
}
platform.recordMetric({ name: METRIC_NAMES.LATENCY, type: 'timer',
  value: 900, unit: 'ms', component: 'ai_workflow_copilot',
  organizationId: 'org-42', tags: {} }); // trips alert + latency spike

// (d) Structured log joined to the trace
platform.log('error', 'ai_workflow_copilot', 'latency exceeded SLO', {
  traceId: root.traceId,
  correlationId: 'corr-e2e',
  context: { latencyMs: 900, threshold: 500 },
});

platform.finishTrace(child, 'completed');
platform.finishTrace(root, 'completed');

// (e) Health, alerts, AIOps
await platform.runAllHealthChecks();
const health = platform.healthStatus();            // 'healthy'
const fired = platform.evaluateAlerts();           // 1 high_latency alert
const anomalies = platform.detectAnomalies();      // latency_spike
const spike = anomalies.find((a) => a.type === 'latency_spike');

// (f) Dashboard + export
const dash = platform.createDashboard('global_health', 'Global Health');
const prom = platform.exportMetrics('prometheus');
const otel = platform.exportSpans('opentelemetry');

// (g) Inspect the telemetry bus — it captured every action above
const events = platform.getTelemetryEvents();
console.log({
  health,
  alerts: fired.length,
  anomalies: anomalies.length,
  dashboards: platform.listDashboards().length,
  promRecords: prom.recordCount,
  otelSpans: otel.recordCount,
  telemetryEvents: events.length,
  hasLatencySpike: Boolean(spike),
});
```

This final example touches all eight public API methods and every engine in a
single script — the intended one-stop usage pattern for the platform.
