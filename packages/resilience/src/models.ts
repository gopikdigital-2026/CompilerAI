// ---------------------------------------------------------------------------
// Core domain models for Resilience, High Availability & Disaster Recovery
// ---------------------------------------------------------------------------

// ── Circuit Breaker ──────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  failurePercentageThreshold?: number;
  resetTimeoutMs: number;
  windowSize: number;
  halfOpenMaxCalls: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  lastFailureTime?: string;
  lastStateChange: string;
  windowCalls: number;
  windowFailures: number;
}

export interface ICircuitBreaker {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitState;
  getStats(): CircuitBreakerStats;
  reset(): void;
  open(): void;
  close(): void;
}

// ── Smart Retry ──────────────────────────────────────────────────────────────

export type BackoffStrategy = 'exponential' | 'linear' | 'fixed';
export type RetryableErrorPredicate = (error: unknown) => boolean;

export interface RetryConfig {
  maxAttempts: number;
  strategy: BackoffStrategy;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  jitterFactor?: number;
  isRetryable: RetryableErrorPredicate;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
  totalDelayMs: number;
  delays: number[];
}

export interface IRetryEngine {
  execute<T>(fn: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>>;
}

// ── Failover / High Availability ─────────────────────────────────────────────

export type InstanceStatus = 'active' | 'standby' | 'failed' | 'recovering';

export interface Instance {
  id: string;
  name: string;
  status: InstanceStatus;
  endpoint: string;
  priority: number;
  healthScore: number;
  lastCheckedAt?: string;
}

export interface FailoverConfig {
  instances: Instance[];
  healthCheckIntervalMs: number;
  failoverThreshold: number;
  loadBalancingStrategy: 'priority' | 'round_robin' | 'least_load';
}

export interface FailoverEvent {
  fromInstanceId: string;
  toInstanceId: string;
  reason: string;
  timestamp: string;
}

export interface IFailoverManager {
  getActiveInstance(): Instance | undefined;
  getAllInstances(): Instance[];
  failover(reason: string): FailoverEvent | null;
  markFailed(instanceId: string): void;
  markRecovered(instanceId: string): void;
  getFailoverEvents(): FailoverEvent[];
  selectInstance(): Instance | undefined;
}

// ── Replication ──────────────────────────────────────────────────────────────

export type ReplicationTarget =
  | 'knowledge_graph'
  | 'enterprise_rag'
  | 'shared_memory'
  | 'configuration';

export type ReplicationStatus = 'synced' | 'syncing' | 'conflict' | 'failed';

export interface ReplicaNode {
  id: string;
  target: ReplicationTarget;
  endpoint: string;
  status: ReplicationStatus;
  lastSyncAt?: string;
  lag: number;
}

export interface ConflictRecord {
  id: string;
  target: ReplicationTarget;
  key: string;
  sourceValue: unknown;
  targetValue: unknown;
  detectedAt: string;
  resolutionStrategy?: 'source_wins' | 'target_wins' | 'merge' | 'manual';
}

export interface ReplicationResult {
  target: ReplicationTarget;
  success: boolean;
  recordsSynced: number;
  conflicts: ConflictRecord[];
  durationMs: number;
  timestamp: string;
}

export interface IReplicationManager {
  registerNode(node: ReplicaNode): void;
  unregisterNode(nodeId: string): boolean;
  replicate(target: ReplicationTarget, data: Record<string, unknown>): ReplicationResult;
  detectConflicts(target: ReplicationTarget, sourceData: Record<string, unknown>, targetData: Record<string, unknown>): ConflictRecord[];
  resolveConflict(conflictId: string, strategy: ConflictRecord['resolutionStrategy']): boolean;
  getNodes(target?: ReplicationTarget): ReplicaNode[];
  getConflicts(): ConflictRecord[];
}

// ── Backup & Restore ─────────────────────────────────────────────────────────

export type BackupType = 'full' | 'incremental';
export type BackupStatus = 'completed' | 'failed' | 'in_progress';

export interface BackupSnapshot {
  id: string;
  type: BackupType;
  target: ReplicationTarget | 'all';
  status: BackupStatus;
  sizeBytes: number;
  checksum: string;
  createdAt: string;
  parentId?: string;
  data: Record<string, unknown>;
  validated: boolean;
}

export interface RestoreResult {
  snapshotId: string;
  success: boolean;
  recordsRestored: number;
  integrityValid: boolean;
  durationMs: number;
  errors: string[];
  timestamp: string;
}

export interface IBackupManager {
  createBackup(target: ReplicationTarget | 'all', data: Record<string, unknown>, options?: { type?: BackupType; parentId?: string }): BackupSnapshot;
  restoreBackup(snapshotId: string, options?: { selectiveKeys?: string[] }): RestoreResult;
  validateIntegrity(snapshotId: string): boolean;
  getSnapshots(): BackupSnapshot[];
  getSnapshot(id: string): BackupSnapshot | undefined;
  deleteSnapshot(id: string): boolean;
}

// ── Chaos Testing ────────────────────────────────────────────────────────────

export type ChaosScenarioType =
  | 'connector_failure'
  | 'memory_pressure'
  | 'agent_timeout'
  | 'data_corruption'
  | 'high_latency'
  | 'service_interruption';

export interface ChaosScenario {
  id: string;
  type: ChaosScenarioType;
  name: string;
  description: string;
  durationMs: number;
  intensity: number;
  targetComponent?: string;
}

export interface ChaosResult {
  scenarioId: string;
  scenarioType: ChaosScenarioType;
  executed: boolean;
  passed: boolean;
  detectedIssues: string[];
  recovered: boolean;
  recoveryTimeMs: number;
  timestamp: string;
}

export interface ResilienceReport {
  totalScenarios: number;
  passed: number;
  failed: number;
  scenarios: ChaosResult[];
  overallResilienceScore: number;
  recommendations: string[];
  generatedAt: string;
}

export interface IChaosEngine {
  registerScenario(scenario: ChaosScenario): void;
  runScenario(scenarioId: string): ChaosResult;
  runAllScenarios(): ChaosResult[];
  generateReport(): ResilienceReport;
  getScenarios(): ChaosScenario[];
}

// ── Queue Recovery ───────────────────────────────────────────────────────────

export type QueueItemType =
  | 'pending_job'
  | 'workflow'
  | 'agent_task'
  | 'event';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: string;
  processedAt?: string;
}

export interface QueueRecoveryResult {
  totalItems: number;
  recovered: number;
  failed: number;
  skipped: number;
  duplicateSuppressed: number;
  durationMs: number;
}

export interface IQueueRecovery {
  enqueue(item: Omit<QueueItem, 'id' | 'status' | 'attempts' | 'createdAt'>): QueueItem;
  recover(processor: (item: QueueItem) => Promise<boolean>): Promise<QueueRecoveryResult>;
  getPending(): QueueItem[];
  getAll(): QueueItem[];
  markCompleted(itemId: string): void;
  markFailed(itemId: string): void;
}

// ── Disaster Recovery ────────────────────────────────────────────────────────

export type RecoveryMode = 'automatic' | 'manual';

export interface DisasterRecoveryConfig {
  rpoSeconds: number;
  rtoSeconds: number;
  mode: RecoveryMode;
  backupIntervalMs: number;
  maxBackups: number;
}

export interface RecoveryPlan {
  id: string;
  rpoSeconds: number;
  rtoSeconds: number;
  mode: RecoveryMode;
  steps: RecoveryStep[];
  estimatedRecoveryTimeMs: number;
  createdAt: string;
}

export interface RecoveryStep {
  id: string;
  name: string;
  action: string;
  target: string;
  completed: boolean;
}

export interface RecoveryExecutionResult {
  planId: string;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  recoveryTimeMs: number;
  rpoMet: boolean;
  rtoMet: boolean;
  timestamp: string;
}

export interface IDisasterRecoveryManager {
  createPlan(config: DisasterRecoveryConfig): RecoveryPlan;
  executePlan(planId: string): RecoveryExecutionResult;
  validateRecovery(planId: string): boolean;
  getPlans(): RecoveryPlan[];
  getConfig(): DisasterRecoveryConfig;
  updateConfig(config: Partial<DisasterRecoveryConfig>): void;
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface ResilienceHealth {
  circuitBreakers: { name: string; state: CircuitState; healthy: boolean }[];
  activeInstances: number;
  totalInstances: number;
  pendingQueueItems: number;
  lastBackupAt?: string;
  lastReplicationAt?: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
}

// ── Telemetry ─────────────────────────────────────────────────────────────────

export type ResilienceEventType =
  | 'circuit.opened'
  | 'circuit.closed'
  | 'circuit.half_open'
  | 'retry.executed'
  | 'backup.completed'
  | 'restore.completed'
  | 'failover.started'
  | 'replication.completed'
  | 'chaos.finished'
  | 'queue.recovered';

export interface ResilienceEvent {
  type: ResilienceEventType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface IResilienceTelemetry {
  emit(event: ResilienceEvent): void;
  getEvents(): ResilienceEvent[];
  getEventsByType(type: ResilienceEventType): ResilienceEvent[];
  clear(): void;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface IResiliencePlatform {
  executeProtected<T>(fn: () => Promise<T>, options?: {
    circuitName?: string;
    retryConfig?: RetryConfig;
  }): Promise<T>;
  retry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>>;
  openCircuit(name: string): void;
  closeCircuit(name: string): void;
  createBackup(target: ReplicationTarget | 'all', data: Record<string, unknown>, options?: { type?: BackupType; parentId?: string }): BackupSnapshot;
  restoreBackup(snapshotId: string, options?: { selectiveKeys?: string[] }): RestoreResult;
  replicate(target: ReplicationTarget, data: Record<string, unknown>): ReplicationResult;
  runChaosScenario(scenarioId: string): ChaosResult;
  healthReport(): ResilienceHealth;
}
