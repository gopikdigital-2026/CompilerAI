import type {
  ExportResult,
  ExporterFormat,
  IExporter,
  LogEntry,
  MetricSample,
  Span,
} from '../models.js';

// ── JSON Exporter ────────────────────────────────────────────────────────────

export class JsonExporter implements IExporter {
  readonly format: ExporterFormat = 'json';

  exportMetrics(metrics: MetricSample[]): ExportResult {
    const payload = JSON.stringify({
      resource: { 'service.name': 'compilerai' },
      scopeMetrics: [{
        scope: { name: 'compilerai-observability' },
        metrics: metrics.map((m) => ({
          name: m.name,
          type: m.type,
          value: m.value,
          unit: m.unit,
          component: m.component,
          organizationId: m.organizationId,
          agentId: m.agentId,
          skillId: m.skillId,
          timestamp: m.timestamp,
          tags: m.tags,
          estimatedCost: m.estimatedCost,
        })),
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: metrics.length, payload };
  }

  exportSpans(spans: Span[]): ExportResult {
    const payload = JSON.stringify({
      resource: { 'service.name': 'compilerai' },
      scopeSpans: [{
        scope: { name: 'compilerai-observability' },
        spans: spans.map((s) => ({
          traceId: s.traceId,
          spanId: s.spanId,
          parentSpanId: s.parentSpanId,
          operationName: s.operationName,
          component: s.component,
          targetComponent: s.targetComponent,
          startTime: s.startTime,
          endTime: s.endTime,
          durationMs: s.durationMs,
          status: s.status,
          tags: s.tags,
          events: s.events,
          organizationId: s.organizationId,
        })),
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: spans.length, payload };
  }

  exportLogs(logs: LogEntry[]): ExportResult {
    const payload = JSON.stringify({
      resource: { 'service.name': 'compilerai' },
      scopeLogs: [{
        scope: { name: 'compilerai-observability' },
        logRecords: logs.map((l) => ({
          id: l.id,
          timestamp: l.timestamp,
          level: l.level,
          component: l.component,
          organizationId: l.organizationId,
          userId: l.userId,
          agentId: l.agentId,
          message: l.message,
          correlationId: l.correlationId,
          traceId: l.traceId,
          context: l.context,
        })),
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: logs.length, payload };
  }
}

// ── Prometheus Exporter ──────────────────────────────────────────────────────

export class PrometheusExporter implements IExporter {
  readonly format: ExporterFormat = 'prometheus';

  exportMetrics(metrics: MetricSample[]): ExportResult {
    const lines: string[] = [];
    const seenHelp = new Set<string>();

    for (const m of metrics) {
      const promName = m.name.replace(/\./g, '_');

      if (!seenHelp.has(promName)) {
        lines.push(`# HELP ${promName} Metric: ${m.name} from ${m.component}`);
        lines.push(`# TYPE ${promName} ${m.type === 'counter' ? 'counter' : 'gauge'}`);
        seenHelp.add(promName);
      }

      const labels: string[] = [`component="${m.component}"`];
      if (m.organizationId) labels.push(`org="${m.organizationId}"`);
      if (m.agentId) labels.push(`agent="${m.agentId}"`);
      if (m.skillId) labels.push(`skill="${m.skillId}"`);
      for (const [k, v] of Object.entries(m.tags)) {
        labels.push(`${k}="${v}"`);
      }

      lines.push(`${promName}{${labels.join(',')}} ${m.value} ${new Date(m.timestamp).getTime()}`);
    }

    return { format: this.format, success: true, recordCount: metrics.length, payload: lines.join('\n') };
  }

  exportSpans(spans: Span[]): ExportResult {
    const lines: string[] = [
      '# HELP compilerai_span_duration_ms Span duration in milliseconds',
      '# TYPE compilerai_span_duration_ms histogram',
    ];
    for (const s of spans) {
      if (s.durationMs !== undefined) {
        const labels = [`operation="${s.operationName}"`, `component="${s.component}"`, `status="${s.status}"`];
        lines.push(`compilerai_span_duration_ms{${labels.join(',')}} ${s.durationMs}`);
      }
    }
    return { format: this.format, success: true, recordCount: spans.length, payload: lines.join('\n') };
  }

  exportLogs(logs: LogEntry[]): ExportResult {
    const lines: string[] = [
      '# HELP compilerai_log_total Total log entries by level',
      '# TYPE compilerai_log_total counter',
    ];
    const byLevel = new Map<string, number>();
    for (const l of logs) {
      byLevel.set(l.level, (byLevel.get(l.level) ?? 0) + 1);
    }
    for (const [level, count] of byLevel) {
      lines.push(`compilerai_log_total{level="${level}"} ${count}`);
    }
    return { format: this.format, success: true, recordCount: logs.length, payload: lines.join('\n') };
  }
}

// ── OpenTelemetry Exporter (Mock) ────────────────────────────────────────────

export class OpenTelemetryExporter implements IExporter {
  readonly format: ExporterFormat = 'opentelemetry';

  exportMetrics(metrics: MetricSample[]): ExportResult {
    const otelMetrics = metrics.map((m) => ({
      name: m.name,
      description: `Metric ${m.name} from ${m.component}`,
      unit: m.unit,
      gauge: {
        dataPoints: [{
          attributes: {
            'service.name': 'compilerai',
            'component': m.component,
            ...(m.organizationId ? { 'organization.id': m.organizationId } : {}),
            ...(m.agentId ? { 'agent.id': m.agentId } : {}),
            ...(m.skillId ? { 'skill.id': m.skillId } : {}),
          },
          timeUnixNano: BigInt(new Date(m.timestamp).getTime() * 1_000_000).toString(),
          value: {
            doubleValue: m.value,
          },
        }],
      },
    }));

    const payload = JSON.stringify({
      resourceMetrics: [{
        resource: { attributes: { 'service.name': 'compilerai' } },
        scopeMetrics: [{
          scope: { name: 'compilerai-observability' },
          metrics: otelMetrics,
        }],
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: metrics.length, payload };
  }

  exportSpans(spans: Span[]): ExportResult {
    const otelSpans = spans.map((s) => ({
      traceId: s.traceId,
      spanId: s.spanId,
      parentSpanId: s.parentSpanId ?? '',
      name: s.operationName,
      kind: 0,
      startTimeUnixNano: BigInt(new Date(s.startTime).getTime() * 1_000_000).toString(),
      endTimeUnixNano: s.endTime ? BigInt(new Date(s.endTime).getTime() * 1_000_000).toString() : '0',
      status: {
        code: s.status === 'error' ? 2 : s.status === 'completed' ? 1 : 0,
      },
      attributes: {
        'component': s.component,
        'target.component': s.targetComponent ?? '',
        ...(s.organizationId ? { 'organization.id': s.organizationId } : {}),
      },
    }));

    const payload = JSON.stringify({
      resourceSpans: [{
        resource: { attributes: { 'service.name': 'compilerai' } },
        scopeSpans: [{
          scope: { name: 'compilerai-observability' },
          spans: otelSpans,
        }],
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: spans.length, payload };
  }

  exportLogs(logs: LogEntry[]): ExportResult {
    const otelLogs = logs.map((l) => ({
      timeUnixNano: BigInt(new Date(l.timestamp).getTime() * 1_000_000).toString(),
      observedTimeUnixNano: BigInt(new Date(l.timestamp).getTime() * 1_000_000).toString(),
      severityNumber: this.levelToSeverityNumber(l.level),
      severityText: l.level.toUpperCase(),
      body: { stringValue: l.message },
      attributes: {
        'component': l.component,
        ...(l.organizationId ? { 'organization.id': l.organizationId } : {}),
        ...(l.userId ? { 'user.id': l.userId } : {}),
        ...(l.agentId ? { 'agent.id': l.agentId } : {}),
        ...(l.correlationId ? { 'correlation.id': l.correlationId } : {}),
        ...(l.traceId ? { 'trace.id': l.traceId } : {}),
      },
    }));

    const payload = JSON.stringify({
      resourceLogs: [{
        resource: { attributes: { 'service.name': 'compilerai' } },
        scopeLogs: [{
          scope: { name: 'compilerai-observability' },
          logRecords: otelLogs,
        }],
      }],
    }, null, 2);

    return { format: this.format, success: true, recordCount: logs.length, payload };
  }

  private levelToSeverityNumber(level: string): number {
    const map: Record<string, number> = { debug: 5, info: 9, warn: 13, error: 17, fatal: 21 };
    return map[level] ?? 9;
  }
}

// ── Exporter Registry ────────────────────────────────────────────────────────

export class ExporterRegistry {
  private readonly exporters = new Map<ExporterFormat, IExporter>();

  constructor() {
    this.register(new JsonExporter());
    this.register(new PrometheusExporter());
    this.register(new OpenTelemetryExporter());
  }

  register(exporter: IExporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  get(format: ExporterFormat): IExporter | undefined {
    return this.exporters.get(format);
  }

  getSupportedFormats(): ExporterFormat[] {
    return Array.from(this.exporters.keys());
  }
}
