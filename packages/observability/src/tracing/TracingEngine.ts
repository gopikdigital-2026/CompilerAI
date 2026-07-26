import type { ITracingEngine, Span, SpanEvent, SpanStatus, ComponentName } from '../models.js';

let spanCounter = 0;

function generateSpanId(): string {
  return `span-${(++spanCounter).toString(36)}-${Date.now().toString(36)}`;
}

function generateTraceId(): string {
  return `trace-${(++spanCounter).toString(36)}-${Date.now().toString(36)}`;
}

export class TracingEngine implements ITracingEngine {
  private readonly spans = new Map<string, Span>();
  private readonly traceIndex = new Map<string, string[]>();

  startTrace(
    operationName: string,
    component: ComponentName,
    options?: {
      parentSpanId?: string;
      traceId?: string;
      targetComponent?: ComponentName;
      organizationId?: string;
      tags?: Record<string, string>;
    },
  ): Span {
    const spanId = generateSpanId();
    const traceId = options?.traceId ?? generateTraceId();

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: options?.parentSpanId,
      operationName,
      component,
      targetComponent: options?.targetComponent,
      startTime: new Date().toISOString(),
      status: 'started',
      tags: options?.tags ?? {},
      events: [],
      organizationId: options?.organizationId,
    };

    this.spans.set(spanId, span);
    if (!this.traceIndex.has(traceId)) {
      this.traceIndex.set(traceId, []);
    }
    this.traceIndex.get(traceId)!.push(spanId);

    return span;
  }

  finishTrace(span: Span, status: SpanStatus = 'completed'): Span {
    const endTime = new Date().toISOString();
    const durationMs = new Date(endTime).getTime() - new Date(span.startTime).getTime();
    const updated: Span = {
      ...span,
      endTime,
      durationMs,
      status,
    };
    this.spans.set(span.spanId, updated);
    return updated;
  }

  addEvent(span: Span, eventName: string, data?: Record<string, unknown>): void {
    const event: SpanEvent = {
      timestamp: new Date().toISOString(),
      name: eventName,
      data: data ?? {},
    };
    const existing = this.spans.get(span.spanId);
    if (existing) {
      existing.events.push(event);
    }
  }

  getTrace(traceId: string): Span[] {
    const spanIds = this.traceIndex.get(traceId) ?? [];
    return spanIds
      .map((id) => this.spans.get(id))
      .filter((s): s is Span => s !== undefined)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getSpans(filter?: { component?: ComponentName; organizationId?: string; status?: SpanStatus }): Span[] {
    let results = Array.from(this.spans.values());
    if (filter?.component) results = results.filter((s) => s.component === filter.component);
    if (filter?.organizationId) results = results.filter((s) => s.organizationId === filter.organizationId);
    if (filter?.status) results = results.filter((s) => s.status === filter.status);
    return results;
  }

  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  count(): number {
    return this.spans.size;
  }

  getTraceCount(): number {
    return this.traceIndex.size;
  }
}
