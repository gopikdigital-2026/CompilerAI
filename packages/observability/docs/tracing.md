# Distributed Tracing

The `TracingEngine` produces `Span` records linked into traces by `traceId`
and into parent/child hierarchies by `parentSpanId`. Traces follow a request
as it crosses components.

## Span structure

```ts
interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  component: ComponentName;
  targetComponent?: ComponentName;   // the component being called
  startTime: string;                 // ISO-8601, set on startTrace
  endTime?: string;                  // set on finishTrace
  durationMs?: number;               // computed on finishTrace
  status: SpanStatus;                // 'started' | 'completed' | 'error'
  tags: Record<string, string>;
  events: SpanEvent[];
  organizationId?: string;
}

interface SpanEvent {
  timestamp: string;
  name: string;
  data: Record<string, unknown>;
}
```

Span IDs and trace IDs are generated deterministically as
`span-<base36counter>-<base36 timestamp>` and `trace-<…>`. A new trace ID is
generated on `startTrace` unless one is supplied via `options.traceId`, which
is how child spans join an existing trace.

## Parent-child linking

A span becomes a child by passing the parent's `spanId` as `parentSpanId` and
reusing the parent's `traceId`. `getTrace(traceId)` returns every span in a
trace, sorted by `startTime`.

## Span events

`addEvent(span, name, data?)` appends a timestamped `SpanEvent` to a span in
place. Events record discrete happenings within a span's lifetime — cache
hits, retries, model selections — without starting a new span.

## Cross-component tracing

`targetComponent` records which downstream component a span calls into. This
makes it possible to reconstruct a call graph across the eight monitored
components within a single trace.

## Code example

```ts
import { ObservabilityPlatform } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// Root span: AI Workflow Copilot dispatches a synthesis request
const root = platform.startTrace('synthesize_request', 'ai_workflow_copilot', {
  organizationId: 'org-42',
  tags: { user: 'u-1' },
});

// Child span: Copilot calls into Multi-Agent to orchestrate agents
const child = platform.startTrace('orchestrate_agents', 'ai_workflow_copilot', {
  parentSpanId: root.spanId,
  traceId: root.traceId,            // join the same trace
  targetComponent: 'multi_agent',
  organizationId: 'org-42',
});

platform.addTraceEvent(child, 'agents_selected', { count: 3 });

// Finish in reverse order
platform.finishTrace(child, 'completed');
platform.finishTrace(root, 'completed');

// Reconstruct the whole trace
const trace = platform.getTrace(root.traceId);
console.log(trace.length);          // 2
console.log(trace[0].spanId);       // root.spanId
console.log(trace[1].parentSpanId); // root.spanId
console.log(trace[1].durationMs);   // number >= 0

// Query spans by component or status
const agentSpans = platform.tracing.getSpans({ component: 'ai_workflow_copilot' });
const errored = platform.tracing.getSpans({ status: 'error' });
```

`getSpans(filter?)` accepts `component`, `organizationId`, and `status`
filters; `getSpan(spanId)` returns a single span by ID.
