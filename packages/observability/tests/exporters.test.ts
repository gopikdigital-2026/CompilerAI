import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ExporterRegistry, JsonExporter, PrometheusExporter, OpenTelemetryExporter, MetricsEngine, TracingEngine, StructuredLogger } from '../src/index.js';

describe('Exporters', () => {
  let metrics: MetricsEngine;
  let tracing: TracingEngine;
  let logger: StructuredLogger;
  let registry: ExporterRegistry;

  beforeEach(() => {
    metrics = new MetricsEngine();
    tracing = new TracingEngine();
    logger = new StructuredLogger();
    registry = new ExporterRegistry();

    // Seed data
    metrics.record({ name: 'request.latency', type: 'timer', value: 150, unit: 'ms', component: 'enterprise_rag', organizationId: 'org-1', tags: { env: 'test' } });
    metrics.record({ name: 'request.throughput', type: 'counter', value: 50, unit: 'ops', component: 'multi_agent', tags: {} });

    const span = tracing.startTrace('op1', 'enterprise_rag');
    tracing.finishTrace(span);

    logger.log({ level: 'info', component: 'observability', message: 'test log', context: {} });
  });

  test('registry supports all 3 formats', () => {
    const formats = registry.getSupportedFormats();
    assert.ok(formats.includes('json'));
    assert.ok(formats.includes('prometheus'));
    assert.ok(formats.includes('opentelemetry'));
  });

  // ── JSON Exporter ────────────────────────────────────────────────────────

  test('JSON exporter exports metrics', () => {
    const exporter = new JsonExporter();
    const result = exporter.exportMetrics(metrics.getAll());
    assert.equal(result.format, 'json');
    assert.equal(result.success, true);
    assert.equal(result.recordCount, 2);
    assert.ok(result.payload.includes('request.latency'));
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.scopeMetrics);
  });

  test('JSON exporter exports spans', () => {
    const exporter = new JsonExporter();
    const result = exporter.exportSpans(tracing.getSpans());
    assert.equal(result.success, true);
    assert.ok(result.recordCount > 0);
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.scopeSpans);
  });

  test('JSON exporter exports logs', () => {
    const exporter = new JsonExporter();
    const result = exporter.exportLogs(logger.getAll());
    assert.equal(result.success, true);
    assert.ok(result.recordCount > 0);
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.scopeLogs);
  });

  // ── Prometheus Exporter ──────────────────────────────────────────────────

  test('Prometheus exporter exports metrics in text format', () => {
    const exporter = new PrometheusExporter();
    const result = exporter.exportMetrics(metrics.getAll());
    assert.equal(result.format, 'prometheus');
    assert.equal(result.success, true);
    assert.ok(result.payload.includes('# HELP'));
    assert.ok(result.payload.includes('# TYPE'));
    assert.ok(result.payload.includes('request_latency'));
    assert.ok(result.payload.includes('component='));
  });

  test('Prometheus exporter exports spans with histogram', () => {
    const exporter = new PrometheusExporter();
    const result = exporter.exportSpans(tracing.getSpans());
    assert.ok(result.payload.includes('compilerai_span_duration_ms'));
  });

  test('Prometheus exporter exports logs with counters', () => {
    const exporter = new PrometheusExporter();
    const result = exporter.exportLogs(logger.getAll());
    assert.ok(result.payload.includes('compilerai_log_total'));
  });

  // ── OpenTelemetry Exporter ───────────────────────────────────────────────

  test('OpenTelemetry exporter exports metrics in OTLP format', () => {
    const exporter = new OpenTelemetryExporter();
    const result = exporter.exportMetrics(metrics.getAll());
    assert.equal(result.format, 'opentelemetry');
    assert.equal(result.success, true);
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.resourceMetrics);
    assert.ok(parsed.resourceMetrics[0].scopeMetrics);
  });

  test('OpenTelemetry exporter exports spans', () => {
    const exporter = new OpenTelemetryExporter();
    const result = exporter.exportSpans(tracing.getSpans());
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.resourceSpans);
    assert.ok(parsed.resourceSpans[0].scopeSpans);
  });

  test('OpenTelemetry exporter exports logs', () => {
    const exporter = new OpenTelemetryExporter();
    const result = exporter.exportLogs(logger.getAll());
    const parsed = JSON.parse(result.payload);
    assert.ok(parsed.resourceLogs);
    assert.ok(parsed.resourceLogs[0].scopeLogs);
  });

  test('OpenTelemetry maps log levels to severity numbers', () => {
    const exporter = new OpenTelemetryExporter();
    logger.log({ level: 'debug', component: 'c', message: 'd', context: {} });
    logger.log({ level: 'fatal', component: 'c', message: 'f', context: {} });
    const result = exporter.exportLogs(logger.getAll());
    const parsed = JSON.parse(result.payload);
    const records = parsed.resourceLogs[0].scopeLogs[0].logRecords;
    const debug = records.find((r: { severityText: string }) => r.severityText === 'DEBUG');
    const fatal = records.find((r: { severityText: string }) => r.severityText === 'FATAL');
    assert.ok(debug.severityNumber < fatal.severityNumber);
  });

  test('all 3 exporter formats produce valid output', () => {
    for (const format of ['json', 'prometheus', 'opentelemetry'] as const) {
      const exporter = registry.get(format)!;
      const result = exporter.exportMetrics(metrics.getAll());
      assert.equal(result.success, true);
      assert.ok(result.payload.length > 0);
    }
  });

  test('empty data exports successfully', () => {
    const exporter = new JsonExporter();
    const result = exporter.exportMetrics([]);
    assert.equal(result.success, true);
    assert.equal(result.recordCount, 0);
  });
});
