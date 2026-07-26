import type {
  AlertRule,
  Anomaly,
  ComponentName,
  ExportResult,
  ExporterFormat,
  HealthStatus,
  IObservabilityPlatform,
  LogEntry,
  LogLevel,
  MetricQuery,
  MetricSample,
  Span,
  SpanStatus,
} from '../models.js';
import { MetricsEngine } from '../metrics/MetricsEngine.js';
import { TracingEngine } from '../tracing/TracingEngine.js';
import { StructuredLogger } from '../logging/StructuredLogger.js';
import { HealthMonitor } from '../health/HealthMonitor.js';
import { AlertEngine, createAlertRule } from '../alerts/AlertEngine.js';
import { AIOpsEngine } from '../aiops/AIOpsEngine.js';
import { DashboardManager, createWidget } from '../dashboards/DashboardManager.js';
import { ExporterRegistry } from '../exporters/Exporters.js';
import { TelemetryBus } from '../telemetry/TelemetryBus.js';

export class ObservabilityPlatform implements IObservabilityPlatform {
  public readonly metrics: MetricsEngine;
  public readonly tracing: TracingEngine;
  public readonly logger: StructuredLogger;
  public readonly health: HealthMonitor;
  public readonly alerts: AlertEngine;
  public readonly aiops: AIOpsEngine;
  public readonly dashboards: DashboardManager;
  public readonly exporters: ExporterRegistry;
  public readonly telemetry: TelemetryBus;

  constructor() {
    this.metrics = new MetricsEngine();
    this.tracing = new TracingEngine();
    this.logger = new StructuredLogger();
    this.health = new HealthMonitor();
    this.alerts = new AlertEngine();
    this.aiops = new AIOpsEngine();
    this.dashboards = new DashboardManager();
    this.exporters = new ExporterRegistry();
    this.telemetry = new TelemetryBus();
  }

  // ── Metrics ─────────────────────────────────────────────────────────────────

  recordMetric(sample: Omit<MetricSample, 'timestamp'>): void {
    this.metrics.record(sample);

    this.telemetry.emit({
      type: 'metric.recorded',
      timestamp: new Date().toISOString(),
      metadata: { name: sample.name, component: sample.component, value: sample.value },
    });
  }

  queryMetrics(filter: MetricQuery): MetricSample[] {
    return this.metrics.query(filter);
  }

  aggregateMetric(name: string, filter?: MetricQuery): ReturnType<MetricsEngine['aggregate']> {
    return this.metrics.aggregate(name, filter);
  }

  // ── Tracing ─────────────────────────────────────────────────────────────────

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
    const span = this.tracing.startTrace(operationName, component, options);

    this.telemetry.emit({
      type: 'trace.started',
      timestamp: new Date().toISOString(),
      metadata: { traceId: span.traceId, spanId: span.spanId, operation: operationName },
    });

    return span;
  }

  finishTrace(span: Span, status: SpanStatus = 'completed'): Span {
    const finished = this.tracing.finishTrace(span, status);

    this.telemetry.emit({
      type: 'trace.finished',
      timestamp: new Date().toISOString(),
      metadata: { traceId: finished.traceId, spanId: finished.spanId, durationMs: finished.durationMs, status },
    });

    return finished;
  }

  addTraceEvent(span: Span, eventName: string, data?: Record<string, unknown>): void {
    this.tracing.addEvent(span, eventName, data);
  }

  getTrace(traceId: string): Span[] {
    return this.tracing.getTrace(traceId);
  }

  // ── Logging ─────────────────────────────────────────────────────────────────

  writeLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
    const log = this.logger.log(entry);

    this.telemetry.emit({
      type: 'log.written',
      timestamp: new Date().toISOString(),
      metadata: { logId: log.id, level: log.level, component: log.component },
    });

    return log;
  }

  queryLogs(filter: Parameters<StructuredLogger['query']>[0]): LogEntry[] {
    return this.logger.query(filter);
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  registerHealthCheck(name: string, component: ComponentName, checker: () => Promise<{ status: HealthStatus; message: string; details?: Record<string, unknown> }>): void {
    this.health.registerCheck(name, component, checker);
  }

  async runHealthCheck(name: string): Promise<ReturnType<HealthMonitor['runCheck']>> {
    const result = await this.health.runCheck(name);

    this.telemetry.emit({
      type: 'health.checked',
      timestamp: new Date().toISOString(),
      metadata: { check: name, status: result.status },
    });

    return result;
  }

  async runAllHealthChecks(): Promise<ReturnType<HealthMonitor['runAllChecks']>> {
    return this.health.runAllChecks();
  }

  healthStatus(): HealthStatus {
    return this.health.getOverallStatus();
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────

  createAlert(rule: AlertRule): void {
    this.alerts.addRule(rule);
  }

  evaluateAlerts(): ReturnType<AlertEngine['evaluate']> {
    const allMetrics = this.metrics.getAll();
    const newAlerts = this.alerts.evaluate(allMetrics);

    for (const alert of newAlerts) {
      this.telemetry.emit({
        type: 'alert.triggered',
        timestamp: new Date().toISOString(),
        metadata: { alertId: alert.id, type: alert.type, severity: alert.severity },
      });
    }

    return newAlerts;
  }

  acknowledgeAlert(alertId: string): boolean {
    return this.alerts.acknowledge(alertId);
  }

  getActiveAlerts(): ReturnType<AlertEngine['getActiveAlerts']> {
    return this.alerts.getActiveAlerts();
  }

  // ── AIOps ───────────────────────────────────────────────────────────────────

  detectAnomalies(metrics?: MetricSample[]): Anomaly[] {
    const samples = metrics ?? this.metrics.getAll();
    const anomalies = this.aiops.detectAnomalies(samples);
    const degradations = this.aiops.detectProgressiveDegradation(samples);
    const costAnomalies = this.aiops.detectCostGrowth(samples);
    const all = [...anomalies, ...degradations, ...costAnomalies];

    for (const anomaly of all) {
      this.telemetry.emit({
        type: 'anomaly.detected',
        timestamp: new Date().toISOString(),
        metadata: { anomalyId: anomaly.id, type: anomaly.type, severity: anomaly.severity },
      });
    }

    return all;
  }

  detectTrends(metricName: string): ReturnType<AIOpsEngine['detectTrends']> {
    return this.aiops.detectTrends(metricName, this.metrics.getAll());
  }

  getAnomalies(): Anomaly[] {
    return this.aiops.getAnomalies();
  }

  // ── Dashboards ──────────────────────────────────────────────────────────────

  createDashboard(type: Parameters<DashboardManager['create']>[0], name: string, options?: { description?: string }) {
    return this.dashboards.create(type, name, options);
  }

  listDashboards(): ReturnType<DashboardManager['list']> {
    return this.dashboards.list();
  }

  // ── Exporters ───────────────────────────────────────────────────────────────

  exportMetrics(format: ExporterFormat = 'json'): ExportResult {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      return { format, success: false, recordCount: 0, payload: '', errors: [`Unknown format: ${format}`] };
    }
    const result = exporter.exportMetrics(this.metrics.getAll());

    this.telemetry.emit({
      type: 'export.completed',
      timestamp: new Date().toISOString(),
      metadata: { format, recordCount: result.recordCount },
    });

    return result;
  }

  exportSpans(format: ExporterFormat = 'json'): ExportResult {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      return { format, success: false, recordCount: 0, payload: '', errors: [`Unknown format: ${format}`] };
    }
    return exporter.exportSpans(this.tracing.getSpans());
  }

  exportLogs(format: ExporterFormat = 'json'): ExportResult {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      return { format, success: false, recordCount: 0, payload: '', errors: [`Unknown format: ${format}`] };
    }
    return exporter.exportLogs(this.logger.getAll());
  }

  getSupportedExportFormats(): ExporterFormat[] {
    return this.exporters.getSupportedFormats();
  }

  // ── Telemetry ───────────────────────────────────────────────────────────────

  getTelemetryEvents(): ReturnType<TelemetryBus['getEvents']> {
    return this.telemetry.getEvents();
  }

  getTelemetryEventsByType(type: Parameters<TelemetryBus['getEventsByType']>[0]) {
    return this.telemetry.getEventsByType(type);
  }

  // ── Convenience ─────────────────────────────────────────────────────────────

  createAlertRule = createAlertRule;
  createWidget = createWidget;

  log(level: LogLevel, component: ComponentName, message: string, options?: {
    organizationId?: string;
    userId?: string;
    agentId?: string;
    correlationId?: string;
    traceId?: string;
    context?: Record<string, unknown>;
  }): LogEntry {
    return this.writeLog({
      level,
      component,
      message,
      organizationId: options?.organizationId,
      userId: options?.userId,
      agentId: options?.agentId,
      correlationId: options?.correlationId,
      traceId: options?.traceId,
      context: options?.context ?? {},
    });
  }
}
