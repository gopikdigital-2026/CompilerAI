// Core API facade
export { ObservabilityPlatform } from './api/ObservabilityPlatform.js';

// Concrete implementations
export { MetricsEngine } from './metrics/MetricsEngine.js';
export { TracingEngine } from './tracing/TracingEngine.js';
export { StructuredLogger } from './logging/StructuredLogger.js';
export {
  HealthMonitor,
  createAvailabilityCheck,
  createMemoryCheck,
  createQueueCheck,
  createConnectorCheck,
  createRagIndexCheck,
  createKnowledgeGraphCheck,
  createSkillsCheck,
  createAuthCheck,
} from './health/HealthMonitor.js';
export { AlertEngine, createAlertRule } from './alerts/AlertEngine.js';
export { AIOpsEngine } from './aiops/AIOpsEngine.js';
export { DashboardManager, createWidget } from './dashboards/DashboardManager.js';
export {
  JsonExporter,
  PrometheusExporter,
  OpenTelemetryExporter,
  ExporterRegistry,
} from './exporters/Exporters.js';
export { TelemetryBus } from './telemetry/TelemetryBus.js';

// All domain models & types
export type {
  ComponentName,
  MetricType, MetricSample, MetricQuery, MetricAggregation, IMetricsEngine,
  SpanStatus, Span, SpanEvent, ITracingEngine,
  LogLevel, LogEntry, LogQuery, IStructuredLogger,
  HealthStatus, HealthCheck, HealthCheckResult, IHealthMonitor,
  AlertSeverity, AlertType, AlertRule, AlertCondition, Alert, IAlertEngine,
  AnomalyType, Anomaly, Trend, IAIOpsEngine,
  DashboardType, DashboardWidget, Dashboard, IDashboardManager,
  ExporterFormat, ExportResult, IExporter,
  TelemetryEventType, TelemetryEvent, ITelemetryBus,
  IObservabilityPlatform,
} from './models.js';
export { METRIC_NAMES, SENSITIVE_FIELDS } from './models.js';
