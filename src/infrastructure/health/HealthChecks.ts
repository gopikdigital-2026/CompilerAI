// ─── Health checks ──────────────────────────────────────────────────────────────
// Provides health/readiness status for the platform's /health and /ready endpoints.

export type HealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface HealthCheckResult {
  name:   string;
  status: HealthStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface IHealthCheck {
  check(): Promise<HealthCheckResult>;
}

// ── Database health check ───────────────────────────────────────────────────────

export class DatabaseHealthCheck implements IHealthCheck {
  private readonly checkFn: () => Promise<boolean>;

  constructor(checkFn: () => Promise<boolean>) {
    this.checkFn = checkFn;
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const ok = await this.checkFn();
      return {
        name: 'database',
        status: ok ? 'healthy' : 'degraded',
        message: ok ? 'Database connection is healthy' : 'Database connection is degraded',
      };
    } catch {
      return {
        name: 'database',
        status: 'unavailable',
        message: 'Database connection failed',
      };
    }
  }
}

// ── Queue health check ──────────────────────────────────────────────────────────

export class QueueHealthCheck implements IHealthCheck {
  private readonly getPendingCount: () => number;

  constructor(getPendingCount: () => number) {
    this.getPendingCount = getPendingCount;
  }

  async check(): Promise<HealthCheckResult> {
    const pending = this.getPendingCount();
    if (pending < 100) {
      return { name: 'queue', status: 'healthy', message: `${pending} pending jobs` };
    }
    if (pending < 1000) {
      return { name: 'queue', status: 'degraded', message: `${pending} pending jobs — backpressure` };
    }
    return { name: 'queue', status: 'unavailable', message: `${pending} pending jobs — overloaded` };
  }
}

// ── Cache health check ──────────────────────────────────────────────────────────

export class CacheHealthCheck implements IHealthCheck {
  private readonly getStats: () => { entries: number; hitRate: number };

  constructor(getStats: () => { entries: number; hitRate: number }) {
    this.getStats = getStats;
  }

  async check(): Promise<HealthCheckResult> {
    const stats = this.getStats();
    return {
      name: 'cache',
      status: 'healthy',
      message: `${stats.entries} entries, ${(stats.hitRate * 100).toFixed(1)}% hit rate`,
    };
  }
}

// ── Secret provider health check ────────────────────────────────────────────────

export class SecretProviderHealthCheck implements IHealthCheck {
  private readonly validateFn: () => Promise<string[]>;

  constructor(validateFn: () => Promise<string[]>) {
    this.validateFn = validateFn;
  }

  async check(): Promise<HealthCheckResult> {
    try {
      const missing = await this.validateFn();
      if (missing.length === 0) {
        return { name: 'secrets', status: 'healthy', message: 'All required secrets present' };
      }
      return { name: 'secrets', status: 'degraded', message: `Missing: ${missing.join(', ')}` };
    } catch {
      return { name: 'secrets', status: 'unavailable', message: 'Secret validation failed' };
    }
  }
}

// ── Outbox health check ─────────────────────────────────────────────────────────

export class OutboxHealthCheck implements IHealthCheck {
  private readonly getPendingCount: () => Promise<number>;
  private readonly getDeadLetterCount: () => Promise<number>;

  constructor(getPendingCount: () => Promise<number>, getDeadLetterCount: () => Promise<number>) {
    this.getPendingCount = getPendingCount;
    this.getDeadLetterCount = getDeadLetterCount;
  }

  async check(): Promise<HealthCheckResult> {
    const [pending, deadLetter] = await Promise.all([this.getPendingCount(), this.getDeadLetterCount()]);
    if (pending < 50 && deadLetter < 10) {
      return { name: 'outbox', status: 'healthy', message: `${pending} pending, ${deadLetter} dead letter` };
    }
    if (pending < 200) {
      return { name: 'outbox', status: 'degraded', message: `${pending} pending, ${deadLetter} dead letter — backlog growing` };
    }
    return { name: 'outbox', status: 'unavailable', message: `${pending} pending — severely backlogged` };
  }
}

// ── Composite health check ──────────────────────────────────────────────────────

export class CompositeHealthCheck {
  private readonly checks: IHealthCheck[];

  constructor(checks: IHealthCheck[]) {
    this.checks = checks;
  }

  async checkAll(): Promise<{ overall: HealthStatus; checks: HealthCheckResult[] }> {
    const results = await Promise.all(this.checks.map(c => c.check()));
    const statuses = results.map(r => r.status);
    let overall: HealthStatus = 'healthy';
    if (statuses.includes('unavailable')) overall = 'unavailable';
    else if (statuses.includes('degraded')) overall = 'degraded';
    return { overall, checks: results };
  }
}
