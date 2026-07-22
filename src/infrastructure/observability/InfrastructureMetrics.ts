// ─── Infrastructure observability ───────────────────────────────────────────────
// Integrates with telemetry engine via interfaces. Never logs SQL with sensitive data.

export interface InfrastructureMetrics {
  queryLatencyMs:    number[];
  connectionCount:   number;
  persistenceErrors: number;
  retries:           number;
  pendingJobs:       number;
  failedJobs:        number;
  outboxSize:        number;
  activeLocks:       number;
  cacheHits:         number;
  cacheMisses:       number;
  failedTransactions: number;
}

export interface IInfrastructureMetricsCollector {
  recordQueryLatency(ms: number): void;
  recordPersistenceError(): void;
  recordRetry(): void;
  recordTransactionFailure(): void;
  recordCacheHit(): void;
  recordCacheMiss(): void;
  setConnectionCount(count: number): void;
  setPendingJobs(count: number): void;
  setFailedJobs(count: number): void;
  setOutboxSize(count: number): void;
  setActiveLocks(count: number): void;
  getMetrics(): InfrastructureMetrics;
  reset(): void;
}

export class InfrastructureMetricsCollector implements IInfrastructureMetricsCollector {
  private metrics: InfrastructureMetrics = {
    queryLatencyMs: [],
    connectionCount: 0,
    persistenceErrors: 0,
    retries: 0,
    pendingJobs: 0,
    failedJobs: 0,
    outboxSize: 0,
    activeLocks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failedTransactions: 0,
  };

  recordQueryLatency(ms: number): void {
    this.metrics.queryLatencyMs.push(ms);
    if (this.metrics.queryLatencyMs.length > 100) {
      this.metrics.queryLatencyMs.shift();
    }
  }

  recordPersistenceError(): void { this.metrics.persistenceErrors++; }
  recordRetry(): void { this.metrics.retries++; }
  recordTransactionFailure(): void { this.metrics.failedTransactions++; }
  recordCacheHit(): void { this.metrics.cacheHits++; }
  recordCacheMiss(): void { this.metrics.cacheMisses++; }
  setConnectionCount(count: number): void { this.metrics.connectionCount = count; }
  setPendingJobs(count: number): void { this.metrics.pendingJobs = count; }
  setFailedJobs(count: number): void { this.metrics.failedJobs = count; }
  setOutboxSize(count: number): void { this.metrics.outboxSize = count; }
  setActiveLocks(count: number): void { this.metrics.activeLocks = count; }

  getMetrics(): InfrastructureMetrics {
    return { ...this.metrics, queryLatencyMs: [...this.metrics.queryLatencyMs] };
  }

  reset(): void {
    this.metrics = {
      queryLatencyMs: [],
      connectionCount: 0,
      persistenceErrors: 0,
      retries: 0,
      pendingJobs: 0,
      failedJobs: 0,
      outboxSize: 0,
      activeLocks: 0,
      cacheHits: 0,
      cacheMisses: 0,
      failedTransactions: 0,
    };
  }
}

// ── Log sanitizer ───────────────────────────────────────────────────────────────

const SENSITIVE_PATTERNS = /(?:secret|password|token|credential|apikey|api_key|private_key|authorization)/gi;

export function sanitizeLogMessage(msg: string): string {
  return msg.replace(SENSITIVE_PATTERNS, '[REDACTED]');
}

export function sanitizeForInfrastructure(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_PATTERNS.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeLogMessage(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
