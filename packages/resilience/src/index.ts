// Core API facade
export { ResiliencePlatform } from './api/ResiliencePlatform.js';

// Concrete implementations
export { CircuitBreaker, createCircuitBreakerConfig } from './circuit-breaker/CircuitBreaker.js';
export { RetryEngine, createRetryConfig, isNetworkError, isTransientError } from './retry/RetryEngine.js';
export { FailoverManager, createFailoverConfig, createInstance } from './failover/FailoverManager.js';
export { ReplicationManager, createReplicaNode } from './replication/ReplicationManager.js';
export { BackupManager } from './backup/BackupManager.js';
export {
  ChaosEngine,
  createDefaultChaosScenarios,
  createConnectorFailureScenario,
  createMemoryPressureScenario,
  createAgentTimeoutScenario,
  createDataCorruptionScenario,
  createHighLatencyScenario,
  createServiceInterruptionScenario,
  CHAOS_SCENARIO_TYPES,
} from './chaos/ChaosEngine.js';
export { QueueRecovery } from './queue/QueueRecovery.js';
export { DisasterRecoveryManager, createDisasterRecoveryConfig, createRecoveryPlan } from './scheduler/DisasterRecoveryManager.js';
export { ResilienceTelemetry } from './telemetry/ResilienceTelemetry.js';
export { ResilienceHealthProvider } from './health/ResilienceHealthProvider.js';

// All domain models & types
export type {
  CircuitState, CircuitBreakerConfig, CircuitBreakerStats, ICircuitBreaker,
  BackoffStrategy, RetryableErrorPredicate, RetryConfig, RetryResult, IRetryEngine,
  InstanceStatus, Instance, FailoverConfig, FailoverEvent, IFailoverManager,
  ReplicationTarget, ReplicationStatus, ReplicaNode, ConflictRecord, ReplicationResult, IReplicationManager,
  BackupType, BackupStatus, BackupSnapshot, RestoreResult, IBackupManager,
  ChaosScenarioType, ChaosScenario, ChaosResult, ResilienceReport, IChaosEngine,
  QueueItemType, QueueItem, QueueRecoveryResult, IQueueRecovery,
  RecoveryMode, DisasterRecoveryConfig, RecoveryPlan, RecoveryStep, RecoveryExecutionResult, IDisasterRecoveryManager,
  ResilienceHealth,
  ResilienceEventType, ResilienceEvent, IResilienceTelemetry,
  IResiliencePlatform,
} from './models.js';
