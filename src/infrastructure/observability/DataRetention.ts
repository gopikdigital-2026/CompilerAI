// ─── Data retention policies ────────────────────────────────────────────────────
// Automated cleanup for expired data across all infrastructure tables.

export interface DataRetentionPolicy {
  tableName:       string;
  retentionDays:   number;
  cleanupField:    string;  // timestamp field to compare
  hardDelete:      boolean;
}

export const DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
  { tableName: 'telemetry_events',     retentionDays: 30,  cleanupField: 'created_at', hardDelete: true },
  { tableName: 'execution_traces',     retentionDays: 30,  cleanupField: 'created_at', hardDelete: true },
  { tableName: 'idempotency_records',  retentionDays: 1,   cleanupField: 'expires_at', hardDelete: true },
  { tableName: 'outbox_events',        retentionDays: 7,   cleanupField: 'created_at', hardDelete: true },
  { tableName: 'workflow_step_executions', retentionDays: 90, cleanupField: 'created_at', hardDelete: false },
  { tableName: 'runtime_executions',   retentionDays: 180, cleanupField: 'created_at', hardDelete: false },
  { tableName: 'tool_executions',      retentionDays: 90,  cleanupField: 'created_at', hardDelete: true },
  // audit_logs: no default retention — requires explicit policy
];

export interface RetentionResult {
  tableName:  string;
  deleted:    number;
  skipped:    boolean;
  error:      string | null;
}

export interface IExpiredDataCleaner {
  cleanup(policy: DataRetentionPolicy): Promise<RetentionResult>;
  runAll(): Promise<RetentionResult[]>;
}

export class ExpiredDataCleaner implements IExpiredDataCleaner {
  private readonly policies: DataRetentionPolicy[];
  private readonly cleanupFn: (tableName: string, cleanupField: string, cutoffDate: string, hardDelete: boolean) => Promise<number>;

  constructor(
    policies: DataRetentionPolicy[],
    cleanupFn: (tableName: string, cleanupField: string, cutoffDate: string, hardDelete: boolean) => Promise<number>,
  ) {
    this.policies = policies;
    this.cleanupFn = cleanupFn;
  }

  async cleanup(policy: DataRetentionPolicy): Promise<RetentionResult> {
    const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000).toISOString();
    try {
      const deleted = await this.cleanupFn(policy.tableName, policy.cleanupField, cutoff, policy.hardDelete);
      return { tableName: policy.tableName, deleted, skipped: false, error: null };
    } catch (err) {
      return {
        tableName: policy.tableName,
        deleted: 0,
        skipped: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async runAll(): Promise<RetentionResult[]> {
    const results: RetentionResult[] = [];
    for (const policy of this.policies) {
      results.push(await this.cleanup(policy));
    }
    return results;
  }
}

// ── Retention job (for queue integration) ───────────────────────────────────────

export class RetentionJob {
  private readonly cleaner: IExpiredDataCleaner;
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs: number;

  constructor(cleaner: IExpiredDataCleaner, intervalMs = 24 * 60 * 60 * 1000) {
    this.cleaner = cleaner;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.cleaner.runAll();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async runOnce(): Promise<RetentionResult[]> {
    return this.cleaner.runAll();
  }
}
