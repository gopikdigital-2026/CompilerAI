// ─── IMetricsCollector ──────────────────────────────────────────────────────────
// Collects and aggregates telemetry metrics from execution traces.

import type { TelemetryMetrics } from '../models/TelemetryMetrics';
import type { PerformanceSnapshot } from '../models/PerformanceSnapshot';
import type { ExecutionTrace } from '../models/ExecutionTrace';

export interface IMetricsCollector {
  collect(trace: ExecutionTrace): void;
  compute(): TelemetryMetrics;
  getSnapshots(): PerformanceSnapshot[];
  clear(): void;
}
