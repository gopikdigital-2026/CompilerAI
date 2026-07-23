import type { ConnectorId, UUID, ISOString, Metadata } from '../types/index';
import { sanitizeMetadata } from './sanitize';

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId: string | null;
  connectorId: ConnectorId;
  organizationId: UUID;
  operation: string;
  executionId: string;
  startedAt: ISOString;
  completedAt: ISOString | null;
  durationMs: number | null;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  attributes: Metadata;
}

export interface IConnectorTrace {
  startSpan(params: Omit<TraceSpan, 'spanId' | 'startedAt' | 'completedAt' | 'durationMs' | 'status'>): TraceSpan;
  endSpan(spanId: string, status: TraceSpan['status'], attributes?: Record<string, unknown>): void;
  getSpansByTrace(traceId: string): TraceSpan[];
  getSpansByExecution(executionId: string): TraceSpan[];
}

export class ConnectorTrace implements IConnectorTrace {
  private spans = new Map<string, TraceSpan>();
  private spanCounter = 0;

  startSpan(params: Omit<TraceSpan, 'spanId' | 'startedAt' | 'completedAt' | 'durationMs' | 'status'>): TraceSpan {
    const span: TraceSpan = {
      ...params,
      spanId: `span_${++this.spanCounter}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      status: 'started',
      attributes: sanitizeMetadata(params.attributes as Record<string, unknown>),
    };
    this.spans.set(span.spanId, span);
    return span;
  }

  endSpan(spanId: string, status: TraceSpan['status'], attributes?: Record<string, unknown>): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    const completedAt = new Date().toISOString();
    span.completedAt = completedAt;
    span.durationMs = new Date(completedAt).getTime() - new Date(span.startedAt).getTime();
    span.status = status;

    if (attributes) {
      span.attributes = { ...span.attributes, ...sanitizeMetadata(attributes) };
    }
  }

  getSpansByTrace(traceId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter((s) => s.traceId === traceId);
  }

  getSpansByExecution(executionId: string): TraceSpan[] {
    return Array.from(this.spans.values()).filter((s) => s.executionId === executionId);
  }

  clear(): void {
    this.spans.clear();
    this.spanCounter = 0;
  }
}
