import type {
  BackupSnapshot,
  BackupType,
  ChaosResult,
  CircuitBreakerConfig,
  CircuitState,
  DisasterRecoveryConfig,
  IResiliencePlatform,
  Instance,
  ReplicationResult,
  ReplicationTarget,
  ResilienceHealth,
  RetryConfig,
  RetryResult,
} from '../models.js';
import { CircuitBreaker, createCircuitBreakerConfig } from '../circuit-breaker/CircuitBreaker.js';
import { RetryEngine, createRetryConfig, isTransientError } from '../retry/RetryEngine.js';
import { FailoverManager, createFailoverConfig, createInstance } from '../failover/FailoverManager.js';
import { ReplicationManager } from '../replication/ReplicationManager.js';
import { BackupManager } from '../backup/BackupManager.js';
import { ChaosEngine } from '../chaos/ChaosEngine.js';
import { QueueRecovery } from '../queue/QueueRecovery.js';
import { DisasterRecoveryManager, createDisasterRecoveryConfig } from '../scheduler/DisasterRecoveryManager.js';
import { ResilienceTelemetry } from '../telemetry/ResilienceTelemetry.js';
import { ResilienceHealthProvider } from '../health/ResilienceHealthProvider.js';

export class ResiliencePlatform implements IResiliencePlatform {
  public readonly circuitBreakers: Map<string, CircuitBreaker> = new Map();
  public readonly retryEngine: RetryEngine;
  public readonly failover?: FailoverManager;
  public readonly replication: ReplicationManager;
  public readonly backup: BackupManager;
  public readonly chaos: ChaosEngine;
  public readonly queue: QueueRecovery;
  public readonly disasterRecovery: DisasterRecoveryManager;
  public readonly telemetry: ResilienceTelemetry;

  constructor(options?: {
    instances?: Instance[];
    disasterRecoveryConfig?: Partial<DisasterRecoveryConfig>;
  }) {
    this.retryEngine = new RetryEngine();
    this.replication = new ReplicationManager();
    this.backup = new BackupManager();
    this.chaos = new ChaosEngine();
    this.queue = new QueueRecovery();
    this.disasterRecovery = new DisasterRecoveryManager(options?.disasterRecoveryConfig);
    this.telemetry = new ResilienceTelemetry();

    if (options?.instances && options.instances.length > 0) {
      this.failover = new FailoverManager(createFailoverConfig(options.instances));
    }

    // Register default chaos scenarios
    this.chaos.registerAllDefaults();
  }

  // ── Circuit Breaker management ──────────────────────────────────────────────

  getOrCreateCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let cb = this.circuitBreakers.get(name);
    if (!cb) {
      cb = new CircuitBreaker(createCircuitBreakerConfig(name, config));
      this.circuitBreakers.set(name, cb);
    }
    return cb;
  }

  openCircuit(name: string): void {
    const cb = this.getOrCreateCircuitBreaker(name);
    cb.open();
    this.emitTelemetry('circuit.opened', { name });
  }

  closeCircuit(name: string): void {
    const cb = this.getOrCreateCircuitBreaker(name);
    cb.close();
    this.emitTelemetry('circuit.closed', { name });
  }

  getCircuitBreakerState(name: string): CircuitState | undefined {
    return this.circuitBreakers.get(name)?.getState();
  }

  // ── Protected execution ─────────────────────────────────────────────────────

  async executeProtected<T>(
    fn: () => Promise<T>,
    options?: { circuitName?: string; retryConfig?: RetryConfig },
  ): Promise<T> {
    const circuitName = options?.circuitName ?? 'default';
    const retryConfig = options?.retryConfig ?? createRetryConfig({
      maxAttempts: 3,
      strategy: 'exponential',
      baseDelayMs: 50,
      maxDelayMs: 5000,
      jitter: false,
      isRetryable: (err) => {
        if (err instanceof Error && err.message.includes('circuit breaker')) return false;
        return isTransientError(err);
      },
    });

    const cb = this.getOrCreateCircuitBreaker(circuitName);

    const result = await this.retryEngine.execute(
      () => cb.execute(fn),
      retryConfig,
    );

    if (!result.success) {
      throw result.error ?? new Error('Protected execution failed');
    }

    return result.result as T;
  }

  // ── Retry ───────────────────────────────────────────────────────────────────

  async retry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>> {
    const result = await this.retryEngine.execute(fn, config);
    this.emitTelemetry('retry.executed', {
      attempts: result.attempts,
      success: result.success,
      totalDelayMs: result.totalDelayMs,
    });
    return result;
  }

  // ── Backup & Restore ────────────────────────────────────────────────────────

  createBackup(
    target: ReplicationTarget | 'all',
    data: Record<string, unknown>,
    options?: { type?: BackupType; parentId?: string },
  ): BackupSnapshot {
    const snapshot = this.backup.createBackup(target, data, options);
    this.emitTelemetry('backup.completed', {
      snapshotId: snapshot.id,
      target,
      type: snapshot.type,
      sizeBytes: snapshot.sizeBytes,
    });
    return snapshot;
  }

  restoreBackup(snapshotId: string, options?: { selectiveKeys?: string[] }): ReturnType<BackupManager['restoreBackup']> {
    const result = this.backup.restoreBackup(snapshotId, options);
    this.emitTelemetry('restore.completed', {
      snapshotId,
      success: result.success,
      recordsRestored: result.recordsRestored,
    });
    return result;
  }

  // ── Replication ─────────────────────────────────────────────────────────────

  replicate(target: ReplicationTarget, data: Record<string, unknown>): ReplicationResult {
    const result = this.replication.replicate(target, data);
    this.emitTelemetry('replication.completed', {
      target,
      success: result.success,
      recordsSynced: result.recordsSynced,
      conflicts: result.conflicts.length,
    });
    return result;
  }

  // ── Chaos Testing ───────────────────────────────────────────────────────────

  runChaosScenario(scenarioId: string): ChaosResult {
    const result = this.chaos.runScenario(scenarioId);
    this.emitTelemetry('chaos.finished', {
      scenarioId,
      passed: result.passed,
      recovered: result.recovered,
    });
    return result;
  }

  runAllChaosScenarios(): ChaosResult[] {
    const results = this.chaos.runAllScenarios();
    for (const result of results) {
      this.emitTelemetry('chaos.finished', {
        scenarioId: result.scenarioId,
        passed: result.passed,
        recovered: result.recovered,
      });
    }
    return results;
  }

  generateChaosReport(): ReturnType<ChaosEngine['generateReport']> {
    return this.chaos.generateReport();
  }

  // ── Queue Recovery ──────────────────────────────────────────────────────────

  async recoverQueue(processor: (item: import('../models.js').QueueItem) => Promise<boolean>): Promise<import('../models.js').QueueRecoveryResult> {
    const result = await this.queue.recover(processor);
    this.emitTelemetry('queue.recovered', {
      recovered: result.recovered,
      failed: result.failed,
      duplicateSuppressed: result.duplicateSuppressed,
    });
    return result;
  }

  // ── Disaster Recovery ───────────────────────────────────────────────────────

  createRecoveryPlan(config?: Partial<DisasterRecoveryConfig>): ReturnType<DisasterRecoveryManager['createPlan']> {
    const fullConfig = createDisasterRecoveryConfig(config);
    return this.disasterRecovery.createPlan(fullConfig);
  }

  executeRecoveryPlan(planId: string): ReturnType<DisasterRecoveryManager['executePlan']> {
    return this.disasterRecovery.executePlan(planId);
  }

  // ── Failover ────────────────────────────────────────────────────────────────

  triggerFailover(reason: string): ReturnType<FailoverManager['failover']> | null {
    if (!this.failover) return null;
    const event = this.failover.failover(reason);
    if (event) {
      this.emitTelemetry('failover.started', {
        from: event.fromInstanceId,
        to: event.toInstanceId,
        reason: event.reason,
      });
    }
    return event;
  }

  // ── Health Report ───────────────────────────────────────────────────────────

  healthReport(): ResilienceHealth {
    const provider = new ResilienceHealthProvider(
      () => Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
        name,
        state: cb.getState(),
        healthy: cb.getState() === 'closed',
      })),
      () => this.failover?.countActive() ?? 1,
      () => this.failover?.getAllInstances().length ?? 1,
      () => this.queue.getPending().length,
      () => this.backup.getSnapshots().slice(-1)[0]?.createdAt,
      () => this.replication.getNodes().slice(-1)[0]?.lastSyncAt,
    );
    return provider.getHealth();
  }

  // ── Telemetry ───────────────────────────────────────────────────────────────

  getTelemetryEvents(): ResilienceEvent_t[] {
    return this.telemetry.getEvents();
  }

  private emitTelemetry(type: import('../models.js').ResilienceEventType, metadata: Record<string, unknown>): void {
    this.telemetry.emit({
      type,
      timestamp: new Date().toISOString(),
      metadata,
    });
  }

  // ── Convenience factories ───────────────────────────────────────────────────

  static createDefaultCircuitBreaker(name: string): CircuitBreaker {
    return new CircuitBreaker(createCircuitBreakerConfig(name, {
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      windowSize: 20,
      halfOpenMaxCalls: 3,
    }));
  }

  static createDefaultRetryConfig(maxAttempts = 3): RetryConfig {
    return createRetryConfig({
      maxAttempts,
      strategy: 'exponential',
      baseDelayMs: 100,
      maxDelayMs: 5000,
      jitter: true,
      isRetryable: isTransientError,
    });
  }

  static createDefaultInstances(): Instance[] {
    return [
      createInstance('inst-1', 'Primary', 'http://primary:8080', 1),
      createInstance('inst-2', 'Secondary', 'http://secondary:8080', 2),
      createInstance('inst-3', 'Tertiary', 'http://tertiary:8080', 3),
    ];
  }
}

type ResilienceEvent_t = import('../models.js').ResilienceEvent;
