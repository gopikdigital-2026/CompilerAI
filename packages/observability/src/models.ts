// ---------------------------------------------------------------------------
// Core domain models for Observability, Monitoring & AIOps
// ---------------------------------------------------------------------------

// ── Component identifiers ────────────────────────────────────────────────────

export type ComponentName =
  | 'connector_runtime'
  | 'automation_studio'
  | 'ai_workflow_copilot'
  | 'multi_agent'
  | 'knowledge_graph'
  | 'enterprise_rag'
  | 'skills_marketplace'
  | 'security_governance'
  | 'observability';

// ── Metrics ──────────────────────────────────────────────────────────────────

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

export interface MetricSample {
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  component: ComponentName;
  organizationId?: string;
  agentId?: string;
  skillId?: string;
  timestamp: string;
  tags: Record<string, string>;
  estimatedCost?: number;
}

export interface MetricQuery {
  component?: ComponentName;
  organizationId?: string;
  agentId?: string;
  skillId?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

export interface MetricAggregation {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface IMetricsEngine {
  record(sample: Omit<MetricSample, 'timestamp'>): void;
  query(filter: MetricQuery): MetricSample[];
  aggregate(name: string, filter?: MetricQuery): MetricAggregation;
  getMetricNames(): string[];
  clear(): void;
}

// Standard metric names
export const METRIC_NAMES = {
  LATENCY: 'request.latency',
  THROUGHPUT: 'request.throughput',
  ERRORS: 'request.errors',
  AVAILABILITY: 'system.availability',
  MEMORY: 'system.memory_usage',
  CPU: 'system.cpu_usage',
  ORG_USAGE: 'organization.operations',
  COST_PER_OP: 'cost.per_operation',
  AGENT_USAGE: 'agent.operations',
  SKILL_USAGE: 'skill.invocations',
} as const;

// ── Distributed Tracing ──────────────────────────────────────────────────────

export type SpanStatus = 'started' | 'completed' | 'error';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  component: ComponentName;
  targetComponent?: ComponentName;
  startTime: string;
  endTime?: string;
  durationMs?: number;
  status: SpanStatus;
  tags: Record<string, string>;
  events: SpanEvent[];
  organizationId?: string;
}

export interface SpanEvent {
  timestamp: string;
  name: string;
  data: Record<string, unknown>;
}

export interface ITracingEngine {
  startTrace(operationName: string, component: ComponentName, options?: {
    parentSpanId?: string;
    traceId?: string;
    targetComponent?: ComponentName;
    organizationId?: string;
    tags?: Record<string, string>;
  }): Span;
  finishTrace(span: Span, status?: SpanStatus): Span;
  addEvent(span: Span, eventName: string, data?: Record<string, unknown>): void;
  getTrace(traceId: string): Span[];
  getSpans(filter?: { component?: ComponentName; organizationId?: string; status?: SpanStatus }): Span[];
  getSpan(spanId: string): Span | undefined;
}

// ── Structured Logging ───────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: ComponentName;
  organizationId?: string;
  userId?: string;
  agentId?: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  context: Record<string, unknown>;
}

export interface IStructuredLogger {
  log(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry;
  query(filter: LogQuery): LogEntry[];
  getById(id: string): LogEntry | undefined;
  clear(): void;
}

export interface LogQuery {
  level?: LogLevel;
  component?: ComponentName;
  organizationId?: string;
  correlationId?: string;
  traceId?: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
}

// Sensitive field names that must never be logged
export const SENSITIVE_FIELDS = [
  'password', 'secret', 'token', 'apiKey', 'api_key', 'privateKey',
  'private_key', 'credential', 'authorization', 'cookie', 'session',
  'accessToken', 'access_token', 'refreshToken', 'refresh_token',
] as const;

// ── Health Monitoring ────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface HealthCheck {
  id: string;
  name: string;
  component: ComponentName;
  status: HealthStatus;
  message: string;
  lastCheckedAt: string;
  details: Record<string, unknown>;
}

export interface IHealthMonitor {
  registerCheck(name: string, component: ComponentName, checker: () => Promise<HealthCheckResult>): void;
  runCheck(name: string): Promise<HealthCheck>;
  runAllChecks(): Promise<HealthCheck[]>;
  getOverallStatus(): HealthStatus;
  getChecks(): HealthCheck[];
}

export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
}

// ── Alert Engine ─────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertType =
  | 'high_latency'
  | 'repetitive_errors'
  | 'connector_down'
  | 'excessive_consumption'
  | 'auth_failures'
  | 'rag_degradation'
  | 'agent_anomaly';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertType;
  severity: AlertSeverity;
  component: ComponentName;
  condition: AlertCondition;
  enabled: boolean;
  cooldownMs: number;
}

export interface AlertCondition {
  metric?: string;
  threshold?: number;
  windowMs?: number;
  minOccurrences?: number;
  comparison?: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
}

export interface Alert {
  id: string;
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  component: ComponentName;
  message: string;
  timestamp: string;
  organizationId?: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

export interface IAlertEngine {
  addRule(rule: AlertRule): void;
  removeRule(ruleId: string): boolean;
  evaluate(metrics: MetricSample[]): Alert[];
  acknowledge(alertId: string): boolean;
  getActiveAlerts(): Alert[];
  getAlerts(filter?: { type?: AlertType; severity?: AlertSeverity; component?: ComponentName }): Alert[];
}

// ── AIOps Engine ─────────────────────────────────────────────────────────────

export type AnomalyType =
  | 'latency_spike'
  | 'error_burst'
  | 'progressive_degradation'
  | 'cost_growth_anomaly'
  | 'agent_blocked'
  | 'skill_unstable'
  | 'throughput_drop';

export interface Anomaly {
  id: string;
  type: AnomalyType;
  component: ComponentName;
  severity: AlertSeverity;
  description: string;
  detectedAt: string;
  confidence: number;
  metrics: Record<string, number>;
  recommendation?: string;
  organizationId?: string;
}

export interface Trend {
  component: ComponentName;
  metric: string;
  direction: 'up' | 'down' | 'flat';
  slope: number;
  samples: number;
  confidence: number;
}

export interface IAIOpsEngine {
  detectAnomalies(metrics: MetricSample[], window?: number): Anomaly[];
  detectTrends(metricName: string, samples: MetricSample[]): Trend[];
  detectProgressiveDegradation(metrics: MetricSample[]): Anomaly[];
  detectCostGrowth(metrics: MetricSample[]): Anomaly[];
  getAnomalies(): Anomaly[];
  clear(): void;
}

// ── Dashboards ───────────────────────────────────────────────────────────────

export type DashboardType =
  | 'global_health'
  | 'ai_agents'
  | 'connectors'
  | 'rag'
  | 'security'
  | 'skills'
  | 'costs'
  | 'organizations';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'line' | 'gauge' | 'table' | 'counter' | 'bar' | 'heatmap';
  metricName: string;
  component: ComponentName;
  refreshIntervalMs: number;
  query: MetricQuery;
}

export interface Dashboard {
  id: string;
  name: string;
  type: DashboardType;
  description: string;
  widgets: DashboardWidget[];
  createdAt: string;
}

export interface IDashboardManager {
  create(type: DashboardType, name: string, options?: { description?: string; widgets?: DashboardWidget[] }): Dashboard;
  get(id: string): Dashboard | undefined;
  list(): Dashboard[];
  addWidget(dashboardId: string, widget: DashboardWidget): void;
  removeWidget(dashboardId: string, widgetId: string): boolean;
  getByType(type: DashboardType): Dashboard[];
}

// ── Exporters ────────────────────────────────────────────────────────────────

export type ExporterFormat = 'opentelemetry' | 'prometheus' | 'json';

export interface ExportResult {
  format: ExporterFormat;
  success: boolean;
  recordCount: number;
  payload: string;
  errors?: string[];
}

export interface IExporter {
  format: ExporterFormat;
  exportMetrics(metrics: MetricSample[]): ExportResult;
  exportSpans(spans: Span[]): ExportResult;
  exportLogs(logs: LogEntry[]): ExportResult;
}

// ── Telemetry Bus ────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'metric.recorded'
  | 'trace.started'
  | 'trace.finished'
  | 'log.written'
  | 'health.checked'
  | 'alert.triggered'
  | 'anomaly.detected'
  | 'export.completed';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetryBus {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface IObservabilityPlatform {
  recordMetric(sample: Omit<MetricSample, 'timestamp'>): void;
  startTrace(operationName: string, component: ComponentName, options?: {
    parentSpanId?: string;
    traceId?: string;
    targetComponent?: ComponentName;
    organizationId?: string;
    tags?: Record<string, string>;
  }): Span;
  finishTrace(span: Span, status?: SpanStatus): Span;
  writeLog(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry;
  healthStatus(): HealthStatus;
  createAlert(rule: AlertRule): void;
  detectAnomalies(metrics?: MetricSample[]): Anomaly[];
  exportMetrics(format?: ExporterFormat): ExportResult;
}
