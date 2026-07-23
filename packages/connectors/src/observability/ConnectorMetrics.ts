import type { ConnectorId, UUID, ISOString } from '../types/index';

export interface MetricKey {
  connectorId: ConnectorId;
  organizationId: UUID;
  operation: string;
}

export interface MetricSnapshot {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  retriedExecutions: number;
  averageDurationMs: number;
  totalDurationMs: number;
  lastExecutionAt: ISOString | null;
}

export interface IConnectorMetrics {
  recordExecution(key: MetricKey, success: boolean, durationMs: number, attempts: number, cancelled: boolean): void;
  recordRateLimit(key: MetricKey): void;
  recordCircuitOpen(key: MetricKey): void;
  recordCircuitClose(key: MetricKey): void;
  getSnapshot(key: MetricKey): MetricSnapshot | null;
  getAllSnapshots(): Array<{ key: MetricKey; snapshot: MetricSnapshot }>;
}

export class ConnectorMetrics implements IConnectorMetrics {
  private metrics = new Map<string, MetricSnapshot & { rateLimitHits: number; circuitOpens: number; circuitCloses: number }>();

  recordExecution(key: MetricKey, success: boolean, durationMs: number, attempts: number, cancelled: boolean): void {
    const k = this.makeKey(key);
    let m = this.metrics.get(k);

    if (!m) {
      m = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        cancelledExecutions: 0,
        retriedExecutions: 0,
        averageDurationMs: 0,
        totalDurationMs: 0,
        lastExecutionAt: null,
        rateLimitHits: 0,
        circuitOpens: 0,
        circuitCloses: 0,
      };
      this.metrics.set(k, m);
    }

    m.totalExecutions++;
    m.totalDurationMs += durationMs;
    m.averageDurationMs = m.totalDurationMs / m.totalExecutions;
    m.lastExecutionAt = new Date().toISOString();

    if (cancelled) {
      m.cancelledExecutions++;
    } else if (success) {
      m.successfulExecutions++;
    } else {
      m.failedExecutions++;
    }

    if (attempts > 1) {
      m.retriedExecutions += attempts - 1;
    }
  }

  recordRateLimit(key: MetricKey): void {
    const k = this.makeKey(key);
    const m = this.metrics.get(k);
    if (m) m.rateLimitHits++;
  }

  recordCircuitOpen(key: MetricKey): void {
    const k = this.makeKey(key);
    const m = this.metrics.get(k);
    if (m) m.circuitOpens++;
  }

  recordCircuitClose(key: MetricKey): void {
    const k = this.makeKey(key);
    const m = this.metrics.get(k);
    if (m) m.circuitCloses++;
  }

  getSnapshot(key: MetricKey): MetricSnapshot | null {
    const k = this.makeKey(key);
    const m = this.metrics.get(k);
    if (!m) return null;
    return {
      totalExecutions: m.totalExecutions,
      successfulExecutions: m.successfulExecutions,
      failedExecutions: m.failedExecutions,
      cancelledExecutions: m.cancelledExecutions,
      retriedExecutions: m.retriedExecutions,
      averageDurationMs: m.averageDurationMs,
      totalDurationMs: m.totalDurationMs,
      lastExecutionAt: m.lastExecutionAt,
    };
  }

  getAllSnapshots(): Array<{ key: MetricKey; snapshot: MetricSnapshot }> {
    const result: Array<{ key: MetricKey; snapshot: MetricSnapshot }> = [];
    for (const [k, m] of this.metrics) {
      const [connectorId, organizationId, operation] = k.split(':');
      result.push({
        key: { connectorId, organizationId, operation },
        snapshot: {
          totalExecutions: m.totalExecutions,
          successfulExecutions: m.successfulExecutions,
          failedExecutions: m.failedExecutions,
          cancelledExecutions: m.cancelledExecutions,
          retriedExecutions: m.retriedExecutions,
          averageDurationMs: m.averageDurationMs,
          totalDurationMs: m.totalDurationMs,
          lastExecutionAt: m.lastExecutionAt,
        },
      });
    }
    return result;
  }

  clear(): void {
    this.metrics.clear();
  }

  private makeKey(key: MetricKey): string {
    return `${key.connectorId}:${key.organizationId}:${key.operation}`;
  }
}
