// ─── Infrastructure layer — public API barrel ───────────────────────────────────

// ── Errors ──────────────────────────────────────────────────────────────────────
export {
  InfrastructureError,
  DatabaseUnavailableError,
  RepositoryError,
  TransactionError,
  LockAcquisitionError,
  QueueUnavailableError,
  JobProcessingError,
  OutboxPublishError,
  CacheError,
  SecretProviderError,
  ConfigurationError,
  toSafeMessage,
  isRetryableInfrastructureError,
} from './errors/InfrastructureErrors';

// ── Config ──────────────────────────────────────────────────────────────────────
export {
  type ApplicationConfig, type Environment,
  type DatabaseConfig, type QueueConfig, type CacheConfig,
  type TelemetryConfig, type RuntimeConfig, type SecurityConfig, type RetryConfig,
  ConfigLoader, ConfigValidator,
} from './config/ApplicationConfig';

// ── Database ────────────────────────────────────────────────────────────────────
export {
  type IDatabaseClient, type IQueryResult, type DatabaseError, type QueryBuilder,
  SupabaseDatabaseClient,
} from './database/DatabaseClient';

export type {
  WorkflowRow, WorkflowVersionRow, RuntimeExecutionRow, ApprovalRow,
  CheckpointRow, HumanTaskRow, ToolDefinitionRow, MemoryEntryRow,
  LearningRecordRow, TelemetryEventRow, ExecutionTraceRow,
  IdempotencyRecordRow, OutboxEventRow, AuditLogRow,
} from './database/schemas/SchemaTypes';

// ── Transaction ─────────────────────────────────────────────────────────────────
export {
  type ITransactionManager, type TransactionContext, type TransactionWork,
  PostgresTransactionManager, UnitOfWork,
} from './database/transaction/TransactionManager';

export type {
  IAsyncRuntimeRepository, IAsyncWorkflowRepository, IAsyncApprovalRepository,
  IAsyncCheckpointStore, IAsyncMemoryRepository, IAsyncLearningRepository,
  IAsyncTelemetryRepository, IAsyncIdempotencyRepository,
} from './database/AsyncRepositoryInterfaces';

// ── Repositories (Postgres) ─────────────────────────────────────────────────────
export {
  PostgresRuntimeRepository,
  PostgresWorkflowRepository,
  PostgresApprovalRepository,
  PostgresCheckpointStore,
  PostgresIdempotencyRepository,
  PostgresOutboxRepository,
  PostgresAuditLogRepository,
  PostgresMemoryRepository,
  PostgresLearningRepository,
  PostgresTelemetryRepository,
} from './database/repositories/PostgresRepositories';

// ── Mappers ─────────────────────────────────────────────────────────────────────
export {
  RuntimeExecutionMapper, WorkflowMapper, ApprovalMapper, CheckpointMapper,
  TelemetryEventMapper, IdempotencyMapper, OutboxEventMapper, AuditLogMapper,
} from './database/mappers/DomainMappers';

// ── Outbox ──────────────────────────────────────────────────────────────────────
export {
  type OutboxEvent, type OutboxStatus, type IOutboxRepository, type IOutboxHandler,
  InMemoryOutboxRepository,
  OutboxPublisher, OutboxProcessor, SimulatedOutboxHandler,
} from './events/OutboxManager';

// ── Job Queue ───────────────────────────────────────────────────────────────────
export {
  type JobEnvelope, type JobStatus, type JobResult, type JobType,
  type IJobHandler, type IJobProducer, type IJobConsumer, type IJobQueue,
  InMemoryJobQueue, JOB_TYPES,
} from './queue/JobQueue';

// ── Locks ───────────────────────────────────────────────────────────────────────
export {
  type LockInfo, type IDistributedLock,
  InMemoryLock, LockHelper,
} from './locks/DistributedLocks';

// ── Cache ───────────────────────────────────────────────────────────────────────
export {
  type ICache, type CacheStats, type CacheEntry, type CachePolicy,
  CacheKeyBuilder, InMemoryCache, TenantScopedCache, DEFAULT_CACHE_POLICIES,
} from './cache/CacheManager';

// ── Secrets ─────────────────────────────────────────────────────────────────────
export {
  type ISecretProvider,
  EnvironmentSecretProvider, InMemorySecretProvider, validateSecretsOrThrow,
} from './secrets/SecretManager';

// ── Storage ─────────────────────────────────────────────────────────────────────
export {
  type IStorageProvider, InMemoryStorageProvider,
} from './storage/StorageProvider';

// ── Audit Log ───────────────────────────────────────────────────────────────────
export {
  type AuditLogEntry, type AuditableAction, type IAuditLogRepository,
  InMemoryAuditLogRepository, AuditLogger,
} from './observability/AuditLog';

// ── Observability ───────────────────────────────────────────────────────────────
export {
  type InfrastructureMetrics, type IInfrastructureMetricsCollector,
  InfrastructureMetricsCollector,
  sanitizeLogMessage, sanitizeForInfrastructure,
} from './observability/InfrastructureMetrics';

// ── Retention ───────────────────────────────────────────────────────────────────
export {
  type DataRetentionPolicy, type RetentionResult, type IExpiredDataCleaner,
  DEFAULT_RETENTION_POLICIES, ExpiredDataCleaner, RetentionJob,
} from './observability/DataRetention';

// ── Health ──────────────────────────────────────────────────────────────────────
export {
  type HealthStatus, type HealthCheckResult, type IHealthCheck,
  DatabaseHealthCheck, QueueHealthCheck, CacheHealthCheck,
  SecretProviderHealthCheck, OutboxHealthCheck, CompositeHealthCheck,
} from './health/HealthChecks';
