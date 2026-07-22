// ─── Infrastructure Layer — unit tests ──────────────────────────────────────────
// Run with: npx vite-node src/infrastructure/tests/InfrastructureLayer.test.ts

import assert from 'node:assert/strict';

import {
  InfrastructureError, DatabaseUnavailableError, RepositoryError,
  TransactionError, LockAcquisitionError, QueueUnavailableError,
  JobProcessingError, OutboxPublishError, CacheError,
  SecretProviderError, ConfigurationError,
  toSafeMessage, isRetryableInfrastructureError,
  ConfigLoader, ConfigValidator,
  type ApplicationConfig,
  InMemoryOutboxRepository, OutboxPublisher, OutboxProcessor,
  SimulatedOutboxHandler,
  InMemoryJobQueue, JOB_TYPES,
  InMemoryLock, LockHelper,
  CacheKeyBuilder, InMemoryCache, TenantScopedCache, DEFAULT_CACHE_POLICIES,
  EnvironmentSecretProvider, InMemorySecretProvider, validateSecretsOrThrow,
  InMemoryStorageProvider,
  InMemoryAuditLogRepository, AuditLogger,
  InfrastructureMetricsCollector, sanitizeLogMessage, sanitizeForInfrastructure,
  DEFAULT_RETENTION_POLICIES, ExpiredDataCleaner, RetentionJob,
  DatabaseHealthCheck, QueueHealthCheck, CacheHealthCheck,
  SecretProviderHealthCheck, OutboxHealthCheck, CompositeHealthCheck,
  RuntimeExecutionMapper, WorkflowMapper, ApprovalMapper, CheckpointMapper,
  IdempotencyMapper, OutboxEventMapper, AuditLogMapper,
  PostgresTransactionManager, UnitOfWork,
} from '../index';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  void Promise.resolve(fn()).then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
}

const FIXED_CLOCK_STR = () => '2026-01-01T00:00:00.000Z';
let idCounter = 0;
const makeIdGen = () => () => `id-${(++idCounter).toString().padStart(4, '0')}`;

function makeConfig(overrides: Partial<ApplicationConfig> = {}): ApplicationConfig {
  const base: ApplicationConfig = {
    environment: 'test',
    database: { url: 'postgresql://test', maxConnections: 5, connectionTimeoutMs: 5000, idleTimeoutMs: 30000, ssl: false },
    queue: { maxConcurrency: 5, jobTimeoutMs: 30000, maxRetries: 3, backoffMs: 1000, backoffMultiplier: 2, pollIntervalMs: 5000 },
    cache: { defaultTtlMs: 60000, maxEntries: 1000, cleanupIntervalMs: 300000 },
    telemetry: { enabled: true, queryLogEnabled: false, slowQueryThresholdMs: 500, redactSql: true },
    runtime: { maxDurationMs: 60000, defaultRiskTolerance: 'MEDIUM', minimumConfidenceThreshold: 50, checkpointInterval: 5 },
    security: { rateLimitPerOrg: 100, rateLimitWindowMs: 60000, requestTimeoutMs: 30000, maxBodySizeBytes: 1048576, apiKeyHeader: 'X-API-Key', authTokenHeader: 'Authorization' },
    retry: { maxRetries: 3, baseDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2 },
  };
  return { ...base, ...overrides };
}

async function run(): Promise<void> {

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. Infrastructure Errors
  // ══════════════════════════════════════════════════════════════════════════════

  test('1. errors — InfrastructureError has code and retryable', () => {
    const err = new DatabaseUnavailableError();
    assert.equal(err.code, 'DATABASE_UNAVAILABLE');
    assert.equal(err.retryable, true);
    assert.ok(err instanceof InfrastructureError);
  });

  test('2. errors — RepositoryError is not retryable by default', () => {
    const err = new RepositoryError('fail');
    assert.equal(err.retryable, false);
    assert.equal(err.code, 'REPOSITORY_ERROR');
  });

  test('3. errors — JobProcessingError carries jobId', () => {
    const err = new JobProcessingError('job-123', 'timeout');
    assert.equal(err.jobId, 'job-123');
    assert.equal(err.code, 'JOB_PROCESSING_ERROR');
  });

  test('4. errors — toSafeMessage masks non-infra errors', () => {
    const infra = new RepositoryError('db down');
    const generic = new Error('internal secret leak');
    assert.equal(toSafeMessage(infra), 'db down');
    assert.equal(toSafeMessage(generic), 'An internal infrastructure error occurred.');
  });

  test('5. errors — isRetryableInfrastructureError checks flag', () => {
    assert.ok(isRetryableInfrastructureError(new DatabaseUnavailableError()));
    assert.ok(!isRetryableInfrastructureError(new LockAcquisitionError()));
    assert.ok(!isRetryableInfrastructureError(new Error('plain')));
  });

  test('6. errors — all 10 error classes are InfrastructureError subclasses', () => {
    const instances: InfrastructureError[] = [
      new DatabaseUnavailableError(),
      new RepositoryError(),
      new TransactionError(),
      new LockAcquisitionError(),
      new QueueUnavailableError(),
      new JobProcessingError('job-1'),
      new OutboxPublishError('evt-1'),
      new CacheError(),
      new SecretProviderError(),
      new ConfigurationError(),
    ];
    for (const instance of instances) {
      assert.ok(instance instanceof InfrastructureError, `${instance.constructor.name} should extend InfrastructureError`);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. Configuration
  // ══════════════════════════════════════════════════════════════════════════════

  test('7. config — ConfigLoader.load reads from env', () => {
    const config = ConfigLoader.load({
      NODE_ENV: 'production',
      SUPABASE_DB_URL: 'postgresql://prod',
      DB_MAX_CONNECTIONS: '20',
      QUEUE_MAX_CONCURRENCY: '10',
    });
    assert.equal(config.environment, 'production');
    assert.equal(config.database.url, 'postgresql://prod');
    assert.equal(config.database.maxConnections, 20);
    assert.equal(config.queue.maxConcurrency, 10);
  });

  test('8. config — ConfigLoader.load uses defaults for missing env', () => {
    const config = ConfigLoader.load({});
    assert.equal(config.environment, 'development');
    assert.equal(config.database.maxConnections, 10);
    assert.equal(config.cache.defaultTtlMs, 60000);
  });

  test('9. config — ConfigValidator returns empty array for valid config', () => {
    const errors = ConfigValidator.validate(makeConfig());
    assert.equal(errors.length, 0);
  });

  test('10. config — ConfigValidator catches missing database url', () => {
    const config = makeConfig({ database: { url: '', maxConnections: 5, connectionTimeoutMs: 5000, idleTimeoutMs: 30000, ssl: false } });
    const errors = ConfigValidator.validate(config);
    assert.ok(errors.some(e => e.includes('database.url')));
  });

  test('11. config — ConfigValidator catches invalid maxConnections', () => {
    const config = makeConfig({ database: { url: 'x', maxConnections: 0, connectionTimeoutMs: 5000, idleTimeoutMs: 30000, ssl: false } });
    const errors = ConfigValidator.validate(config);
    assert.ok(errors.some(e => e.includes('maxConnections')));
  });

  test('12. config — validateOrThrow throws on invalid config', () => {
    const config = makeConfig({ database: { url: '', maxConnections: 0, connectionTimeoutMs: 5000, idleTimeoutMs: 30000, ssl: false } });
    assert.throws(() => ConfigValidator.validateOrThrow(config), ConfigurationError);
  });

  test('13. config — validateOrThrow does not throw on valid config', () => {
    assert.doesNotThrow(() => ConfigValidator.validateOrThrow(makeConfig()));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 3. Transactional Outbox
  // ══════════════════════════════════════════════════════════════════════════════

  test('14. outbox — createEvent saves with PENDING status', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    const event = await publisher.createEvent('org-1', 'workflow.completed', 'exec-1', { result: 'ok' });
    assert.equal(event.status, 'PENDING');
    assert.equal(event.retryCount, 0);
    const found = await repo.findById(event.id);
    assert.ok(found);
  });

  test('15. outbox — processBatch publishes pending events', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    await publisher.createEvent('org-1', 'test.event', 'agg-1', {});
    const result = await publisher.processBatch(10);
    assert.equal(result.processed, 1);
    assert.equal(result.published, 1);
    assert.equal(result.failed, 0);
    assert.equal(handler.getPublished().length, 1);
  });

  test('16. outbox — failed publish sets status to FAILED with backoff', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    handler.failNextPublish();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen(), 3, 1000, 2);
    const event = await publisher.createEvent('org-1', 'test.event', 'agg-1', {});
    const result = await publisher.processBatch(10);
    assert.equal(result.failed, 1);
    const updated = await repo.findById(event.id);
    assert.ok(updated);
    assert.equal(updated.status, 'FAILED');
    assert.equal(updated.retryCount, 1);
    assert.ok(updated.lastError);
  });

  test('17. outbox — dead letter after max retries', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen(), 1, 100, 2);
    const event = await publisher.createEvent('org-1', 'test.event', 'agg-1', {});
    handler.failNextPublish();
    await publisher.processBatch(10);
    const updated = await repo.findById(event.id);
    assert.ok(updated);
    assert.equal(updated.status, 'DEAD_LETTER');
  });

  test('18. outbox — InMemoryOutboxRepository.findByOrganization filters by org', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    await publisher.createEvent('org-A', 'test.event', 'agg-1', {});
    await publisher.createEvent('org-B', 'test.event', 'agg-2', {});
    const aEvents = await repo.findByOrganization('org-A');
    assert.equal(aEvents.length, 1);
  });

  test('19. outbox — countByStatus counts correctly', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    await publisher.createEvent('org-1', 'test.event', 'agg-1', {});
    await publisher.createEvent('org-1', 'test.event', 'agg-2', {});
    assert.equal(await repo.countByStatus('PENDING'), 2);
    assert.equal(await repo.countByStatus('PUBLISHED'), 0);
  });

  test('20. outbox — OutboxProcessor start/stop lifecycle', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    const processor = new OutboxProcessor(publisher, 100, 10);
    processor.start();
    processor.stop();
    assert.ok(true, 'processor should start and stop without error');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 4. Job Queue
  // ══════════════════════════════════════════════════════════════════════════════

  test('21. queue — enqueue creates PENDING job', async () => {
    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    const job = await queue.enqueue('runtime-execution', 'org-1', { task: 'run' });
    assert.equal(job.status, 'PENDING');
    assert.equal(job.jobType, 'runtime-execution');
    assert.ok(queue.getJob(job.jobId));
  });

  test('22. queue — processBatch runs registered handler', async () => {
    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    queue.registerHandler('test-job', { handle: async () => ({ success: true, output: { done: true }, durationMs: 0, error: null }) });
    await queue.enqueue('test-job', 'org-1', {});
    const result = await queue.processBatch(5);
    assert.equal(result.processed, 1);
    assert.equal(result.succeeded, 1);
  });

  test('23. queue — no handler marks job as failed', async () => {
    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    await queue.enqueue('unregistered', 'org-1', {}, { maxRetries: 0 });
    const result = await queue.processBatch(5);
    assert.equal(result.failed, 1);
    const failed = queue.getFailed();
    assert.equal(failed.length, 1);
  });

  test('24. queue — cancel prevents pending job from running', async () => {
    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    const job = await queue.enqueue('test-job', 'org-1', {});
    const cancelled = await queue.cancel(job.jobId);
    assert.ok(cancelled);
    const updated = queue.getJob(job.jobId);
    assert.ok(updated);
    assert.equal(updated.status, 'CANCELLED');
  });

  test('25. queue — retry on failure up to maxRetries', async () => {
    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    let attempts = 0;
    queue.registerHandler('flaky', { handle: async () => {
      attempts++;
      if (attempts < 2) return { success: false, output: {}, durationMs: 0, error: 'transient' };
      return { success: true, output: {}, durationMs: 0, error: null };
    } });
    const job = await queue.enqueue('flaky', 'org-1', {}, { maxRetries: 3 });
    await queue.processBatch(5);
    assert.equal(attempts, 1);
    const updated = queue.getJob(job.jobId);
    assert.ok(updated);
    assert.equal(updated.status, 'PENDING');
  });

  test('26. queue — JOB_TYPES has 7 types', () => {
    assert.equal(JOB_TYPES.length, 7);
    assert.ok(JOB_TYPES.includes('runtime-execution'));
    assert.ok(JOB_TYPES.includes('outbox-publication'));
  });

  test('27. queue — delayed job has future availableAt', async () => {
    const clockTime = Date.now();
    const clock = () => new Date(clockTime).toISOString();
    const queue = new InMemoryJobQueue(clock, makeIdGen());
    const job = await queue.enqueue('test-job', 'org-1', {}, { delayMs: 5000 });
    assert.ok(job.availableAt > clock(), 'availableAt should be in the future');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 5. Distributed Locks
  // ══════════════════════════════════════════════════════════════════════════════

  test('28. locks — acquire returns lock info', async () => {
    const lock = new InMemoryLock();
    const info = await lock.acquire('resource-1', 'owner-A', 5000);
    assert.ok(info);
    assert.equal(info.ownerId, 'owner-A');
  });

  test('29. locks — second owner cannot acquire held lock', async () => {
    const lock = new InMemoryLock();
    await lock.acquire('resource-1', 'owner-A', 5000);
    const info = await lock.acquire('resource-1', 'owner-B', 5000);
    assert.equal(info, null);
  });

  test('30. locks — same owner can re-acquire (renew)', async () => {
    const lock = new InMemoryLock();
    await lock.acquire('resource-1', 'owner-A', 5000);
    const info = await lock.acquire('resource-1', 'owner-A', 10000);
    assert.ok(info);
  });

  test('31. locks — release frees the lock', async () => {
    const lock = new InMemoryLock();
    await lock.acquire('resource-1', 'owner-A', 5000);
    const released = await lock.release('resource-1', 'owner-A');
    assert.ok(released);
    assert.equal(lock.getLock('resource-1'), null);
  });

  test('32. locks — release by wrong owner fails', async () => {
    const lock = new InMemoryLock();
    await lock.acquire('resource-1', 'owner-A', 5000);
    const released = await lock.release('resource-1', 'owner-B');
    assert.ok(!released);
  });

  test('33. locks — expired lock can be stolen', async () => {
    let now = 1000;
    const lock = new InMemoryLock(() => now);
    await lock.acquire('resource-1', 'owner-A', 100);
    now += 200;
    const info = await lock.acquire('resource-1', 'owner-B', 5000);
    assert.ok(info);
    assert.equal(info.ownerId, 'owner-B');
  });

  test('34. locks — LockHelper.withLock acquires and releases', async () => {
    const lock = new InMemoryLock();
    const helper = new LockHelper(lock);
    const result = await helper.withLock('resource-1', 'owner-A', 5000, 1000, async () => 42);
    assert.equal(result, 42);
    assert.equal(lock.getLock('resource-1'), null, 'lock should be released after work');
  });

  test('35. locks — LockHelper throws on timeout', async () => {
    const lock = new InMemoryLock();
    await lock.acquire('resource-1', 'owner-A', 60000);
    const helper = new LockHelper(lock);
    await assert.rejects(
      () => helper.withLock('resource-1', 'owner-B', 5000, 100, async () => 0),
      LockAcquisitionError,
    );
  });

  test('36. locks — getActiveLocks returns only non-expired', async () => {
    let now = 1000;
    const lock = new InMemoryLock(() => now);
    await lock.acquire('r1', 'o1', 500);
    await lock.acquire('r2', 'o2', 5000);
    now += 1000;
    const active = lock.getActiveLocks();
    assert.equal(active.length, 1);
    assert.equal(active[0].resourceKey, 'r2');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 6. Cache
  // ══════════════════════════════════════════════════════════════════════════════

  test('37. cache — CacheKeyBuilder namespaces by org', () => {
    const key = CacheKeyBuilder.build('org-1', 'workflow', 'wf-123');
    assert.equal(key, 'org:org-1:workflow:wf-123');
  });

  test('38. cache — CacheKeyBuilder.workflow builds correct key', () => {
    const key = CacheKeyBuilder.workflow('wf-1', 'org-1');
    assert.equal(key, 'org:org-1:workflow:wf-1');
  });

  test('39. cache — InMemoryCache set/get round trip', () => {
    const cache = new InMemoryCache(60000, 1000);
    cache.set('key1', 'value1');
    assert.equal(cache.get('key1'), 'value1');
  });

  test('40. cache — InMemoryCache expires entries', () => {
    let now = 1000;
    const cache = new InMemoryCache(100, 1000, () => now);
    cache.set('key1', 'value1', 500);
    now += 600;
    assert.equal(cache.get('key1'), null);
  });

  test('41. cache — InMemoryCache tracks hits and misses', () => {
    const cache = new InMemoryCache(60000, 1000);
    cache.set('key1', 'v1');
    cache.get('key1');
    cache.get('missing');
    const stats = cache.stats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
    assert.equal(stats.hitRate, 0.5);
  });

  test('42. cache — invalidate by namespace removes matching keys', () => {
    const cache = new InMemoryCache(60000, 1000);
    cache.set('org:org-1:workflow:wf-1', 'a');
    cache.set('org:org-1:workflow:wf-2', 'b');
    cache.set('org:org-2:workflow:wf-1', 'c');
    const removed = cache.invalidate('org-1');
    assert.equal(removed, 2);
    assert.ok(!cache.has('org:org-1:workflow:wf-1'));
    assert.ok(cache.has('org:org-2:workflow:wf-1'));
  });

  test('43. cache — LRU eviction when maxEntries exceeded', () => {
    const cache = new InMemoryCache(60000, 2);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');
    assert.ok(!cache.has('k1'));
    assert.ok(cache.has('k2'));
    assert.ok(cache.has('k3'));
  });

  test('44. cache — TenantScopedCache scopes by organization', () => {
    const cache = new InMemoryCache(60000, 1000);
    const tenantCache = new TenantScopedCache(cache);
    tenantCache.set('org-1', 'key', 'value-1');
    tenantCache.set('org-2', 'key', 'value-2');
    assert.equal(tenantCache.get('org-1', 'key'), 'value-1');
    assert.equal(tenantCache.get('org-2', 'key'), 'value-2');
  });

  test('45. cache — TenantScopedCache.invalidateOrg removes all org keys', () => {
    const cache = new InMemoryCache(60000, 1000);
    const tenantCache = new TenantScopedCache(cache);
    tenantCache.set('org-1', 'k1', 'v1');
    tenantCache.set('org-1', 'k2', 'v2');
    tenantCache.set('org-2', 'k1', 'v3');
    const removed = tenantCache.invalidateOrg('org-1');
    assert.equal(removed, 2);
    assert.equal(tenantCache.get('org-1', 'k1'), null);
    assert.equal(tenantCache.get('org-2', 'k1'), 'v3');
  });

  test('46. cache — DEFAULT_CACHE_POLICIES has 4 policies', () => {
    assert.ok(DEFAULT_CACHE_POLICIES.capabilities);
    assert.ok(DEFAULT_CACHE_POLICIES.workflows);
    assert.ok(DEFAULT_CACHE_POLICIES.permissions);
    assert.ok(DEFAULT_CACHE_POLICIES.toolRegistry);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 7. Secrets
  // ══════════════════════════════════════════════════════════════════════════════

  test('47. secrets — InMemorySecretProvider get/set', async () => {
    const provider = new InMemorySecretProvider(['API_KEY']);
    provider.setSecret('API_KEY', 'secret-123');
    assert.equal(await provider.getSecret('API_KEY'), 'secret-123');
    assert.equal(await provider.getSecret('MISSING'), null);
  });

  test('48. secrets — EnvironmentSecretProvider reads from env', async () => {
    const provider = new EnvironmentSecretProvider({ SECRET_TOKEN: 'abc123' });
    assert.equal(await provider.getSecret('SECRET_TOKEN'), 'abc123');
    assert.equal(await provider.getSecret('NONEXISTENT'), null);
  });

  test('49. secrets — validateSecretsOrThrow passes when all present', async () => {
    const provider = new InMemorySecretProvider(['KEY1', 'KEY2']);
    provider.setSecret('KEY1', 'v1');
    provider.setSecret('KEY2', 'v2');
    await validateSecretsOrThrow(provider);
  });

  test('50. secrets — validateSecretsOrThrow throws when missing', async () => {
    const provider = new InMemorySecretProvider(['KEY1', 'MISSING']);
    provider.setSecret('KEY1', 'v1');
    await assert.rejects(() => validateSecretsOrThrow(provider), SecretProviderError);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 8. Storage
  // ══════════════════════════════════════════════════════════════════════════════

  test('51. storage — InMemoryStorageProvider upload/download/delete', async () => {
    const storage = new InMemoryStorageProvider();
    const buf = Buffer.from('content-123');
    await storage.upload('path/to/file', buf);
    const data = await storage.download('path/to/file');
    assert.ok(data);
    assert.equal(data.toString(), 'content-123');
    const deleted = await storage.delete('path/to/file');
    assert.ok(deleted);
    const after = await storage.download('path/to/file');
    assert.equal(after, null);
  });

  test('52. storage — InMemoryStorageProvider exists check', async () => {
    const storage = new InMemoryStorageProvider();
    await storage.upload('file1', Buffer.from('x'));
    assert.ok(await storage.exists('file1'));
    assert.ok(!await storage.exists('file2'));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 9. Audit Log
  // ══════════════════════════════════════════════════════════════════════════════

  test('53. audit — InMemoryAuditLogRepository append and findByOrganization', async () => {
    const repo = new InMemoryAuditLogRepository(makeIdGen(), FIXED_CLOCK_STR);
    const logger = new AuditLogger(repo, makeIdGen());
    await logger.log({
      organizationId: 'org-1',
      actorId: 'user-1',
      action: 'workflow.create',
      resourceType: 'workflow',
      resourceId: 'wf-1',
      result: 'SUCCESS',
      correlationId: 'corr-1',
      requestId: 'req-1',
      metadata: {},
    });
    const result = await repo.findByOrganization('org-1', 10);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].action, 'workflow.create');
  });

  test('54. audit — findByActor filters by actor', async () => {
    const repo = new InMemoryAuditLogRepository(makeIdGen(), FIXED_CLOCK_STR);
    const logger = new AuditLogger(repo, makeIdGen());
    await logger.log({ organizationId: 'org-1', actorId: 'user-1', action: 'workflow.create', resourceType: 'r', resourceId: 'r1', result: 'SUCCESS', correlationId: 'c', requestId: 'r', metadata: {} });
    await logger.log({ organizationId: 'org-1', actorId: 'user-2', action: 'workflow.create', resourceType: 'r', resourceId: 'r2', result: 'SUCCESS', correlationId: 'c', requestId: 'r', metadata: {} });
    const entries = await repo.findByActor('org-1', 'user-1', 10);
    assert.equal(entries.length, 1);
  });

  test('55. audit — findByAction filters by action', async () => {
    const repo = new InMemoryAuditLogRepository(makeIdGen(), FIXED_CLOCK_STR);
    const logger = new AuditLogger(repo, makeIdGen());
    await logger.log({ organizationId: 'org-1', actorId: 'u1', action: 'workflow.create', resourceType: 'r', resourceId: 'r1', result: 'SUCCESS', correlationId: 'c', requestId: 'r', metadata: {} });
    await logger.log({ organizationId: 'org-1', actorId: 'u1', action: 'approval.approve', resourceType: 'r', resourceId: 'r2', result: 'SUCCESS', correlationId: 'c', requestId: 'r', metadata: {} });
    const entries = await repo.findByAction('org-1', 'workflow.create', 10);
    assert.equal(entries.length, 1);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 10. Observability / Metrics
  // ══════════════════════════════════════════════════════════════════════════════

  test('56. metrics — InfrastructureMetricsCollector record and get', () => {
    const collector = new InfrastructureMetricsCollector();
    collector.recordQueryLatency(50);
    collector.recordQueryLatency(100);
    collector.recordCacheHit();
    collector.recordCacheMiss();
    collector.recordPersistenceError();
    const metrics = collector.getMetrics();
    assert.equal(metrics.queryLatencyMs.length, 2);
    assert.equal(metrics.cacheHits, 1);
    assert.equal(metrics.cacheMisses, 1);
    assert.equal(metrics.persistenceErrors, 1);
  });

  test('57. metrics — sanitizeLogMessage redacts sensitive keywords', () => {
    const input = 'Connection failed: password=hunter2 token=abc123';
    const sanitized = sanitizeLogMessage(input);
    assert.ok(!sanitized.includes('password'));
    assert.ok(!sanitized.includes('token'));
  });

  test('58. metrics — sanitizeForInfrastructure redacts sensitive keys', () => {
    const input = { apiKey: 'secret-key', data: { password: 'pass123', value: 42 } };
    const sanitized = sanitizeForInfrastructure(input);
    assert.equal(sanitized.apiKey, '[REDACTED]');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 11. Data Retention
  // ══════════════════════════════════════════════════════════════════════════════

  test('59. retention — DEFAULT_RETENTION_POLICIES has 7 policies', () => {
    assert.ok(DEFAULT_RETENTION_POLICIES.length >= 7);
  });

  test('60. retention — ExpiredDataCleaner runs cleanup per policy', async () => {
    const noopCleanup = async () => 0;
    const cleaner = new ExpiredDataCleaner(DEFAULT_RETENTION_POLICIES, noopCleanup);
    const results = await cleaner.runAll();
    assert.equal(results.length, DEFAULT_RETENTION_POLICIES.length);
    for (const r of results) {
      assert.equal(r.skipped, false);
      assert.equal(r.error, null);
    }
  });

  test('61. retention — RetentionJob runOnce executes cleaner', async () => {
    const noopCleanup = async () => 0;
    const cleaner = new ExpiredDataCleaner(DEFAULT_RETENTION_POLICIES, noopCleanup);
    const job = new RetentionJob(cleaner, 86400000);
    const results = await job.runOnce();
    assert.ok(results.length > 0);
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 12. Health Checks
  // ══════════════════════════════════════════════════════════════════════════════

  test('62. health — DatabaseHealthCheck returns healthy for functioning check', async () => {
    const check = new DatabaseHealthCheck(async () => true);
    const result = await check.check();
    assert.equal(result.status, 'healthy');
  });

  test('63. health — DatabaseHealthCheck returns degraded on false', async () => {
    const check = new DatabaseHealthCheck(async () => false);
    const result = await check.check();
    assert.equal(result.status, 'degraded');
  });

  test('64. health — DatabaseHealthCheck returns unavailable on throw', async () => {
    const check = new DatabaseHealthCheck(async () => { throw new Error('conn refused'); });
    const result = await check.check();
    assert.equal(result.status, 'unavailable');
  });

  test('65. health — QueueHealthCheck with low pending count', async () => {
    const check = new QueueHealthCheck(() => 5);
    const result = await check.check();
    assert.equal(result.status, 'healthy');
  });

  test('66. health — QueueHealthCheck with backpressure', async () => {
    const check = new QueueHealthCheck(() => 500);
    const result = await check.check();
    assert.equal(result.status, 'degraded');
  });

  test('67. health — CacheHealthCheck with cache stats', async () => {
    const cache = new InMemoryCache(60000, 1000);
    const check = new CacheHealthCheck(() => cache.stats());
    const result = await check.check();
    assert.equal(result.status, 'healthy');
  });

  test('68. health — SecretProviderHealthCheck with all secrets present', async () => {
    const provider = new InMemorySecretProvider(['KEY1']);
    provider.setSecret('KEY1', 'v1');
    const check = new SecretProviderHealthCheck(async () => provider.validate());
    const result = await check.check();
    assert.equal(result.status, 'healthy');
  });

  test('69. health — SecretProviderHealthCheck detects missing secrets', async () => {
    const provider = new InMemorySecretProvider(['MISSING']);
    const check = new SecretProviderHealthCheck(async () => provider.validate());
    const result = await check.check();
    assert.equal(result.status, 'degraded');
  });

  test('70. health — OutboxHealthCheck with low pending', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const check = new OutboxHealthCheck(
      async () => repo.countByStatus('PENDING'),
      async () => repo.countByStatus('DEAD_LETTER'),
    );
    const result = await check.check();
    assert.equal(result.status, 'healthy');
  });

  test('71. health — CompositeHealthCheck aggregates results', async () => {
    const composite = new CompositeHealthCheck([
      new CacheHealthCheck(() => new InMemoryCache(60000, 1000).stats()),
      new DatabaseHealthCheck(async () => true),
    ]);
    const result = await composite.checkAll();
    assert.equal(result.overall, 'healthy');
  });

  test('72. health — CompositeHealthCheck reports unavailable if any fail', async () => {
    const composite = new CompositeHealthCheck([
      new DatabaseHealthCheck(async () => true),
      new DatabaseHealthCheck(async () => { throw new Error('fail'); }),
    ]);
    const result = await composite.checkAll();
    assert.equal(result.overall, 'unavailable');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 13. Domain Mappers
  // ══════════════════════════════════════════════════════════════════════════════

  test('73. mappers — RuntimeExecutionMapper round trip', () => {
    const exec = {
      executionId: 'exec-1', requestId: 'req-1', organizationId: 'org-1',
      idempotencyKey: 'key-1', status: 'RUNNING', workflowExecution: null,
      checkpoints: [], nodeResults: {}, rollbackTriggered: false,
      startedAt: '2026-01-01T00:00:00Z', completedAt: null,
      errorMessage: null, warnings: [], version: '1',
    };
    const row = RuntimeExecutionMapper.toRow(exec as never, 'org-1');
    assert.equal(row.id, 'exec-1');
    assert.equal(row.organization_id, 'org-1');
    assert.equal(row.status, 'RUNNING');
    const restored = RuntimeExecutionMapper.fromRow(row as never);
    assert.equal(restored.executionId, 'exec-1');
    assert.equal(restored.status, 'RUNNING');
  });

  test('74. mappers — WorkflowMapper round trip', () => {
    const def = {
      workflowId: 'wf-1', organizationId: 'org-1', name: 'Test',
      description: 'desc', nodes: [], edges: [], mode: 'SEQUENTIAL' as const,
      version: '1.0', createdAt: '2026-01-01T00:00:00Z', contentHash: 'abc',
    };
    const row = WorkflowMapper.toRow(def as never);
    assert.equal(row.id, 'wf-1');
    assert.equal(row.name, 'Test');
    const restored = WorkflowMapper.fromRow(row as never);
    assert.equal(restored.workflowId, 'wf-1');
    assert.equal(restored.name, 'Test');
  });

  test('75. mappers — ApprovalMapper round trip', () => {
    const approval = {
      approvalId: 'apr-1', organizationId: 'org-1', executionId: 'exec-1',
      nodeId: 'n1', nodeLabel: 'Node 1', reason: 'high risk',
      description: 'needs review', riskLevel: 'HIGH' as const,
      confidenceScore: 80, status: 'PENDING' as const, decision: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    const row = ApprovalMapper.toRow(approval as never);
    assert.equal(row.id, 'apr-1');
    assert.equal(row.risk_level, 'HIGH');
    const restored = ApprovalMapper.fromRow(row as never);
    assert.equal(restored.approvalId, 'apr-1');
    assert.equal(restored.riskLevel, 'HIGH');
  });

  test('76. mappers — CheckpointMapper round trip', () => {
    const cp = {
      checkpointId: 'cp-1', executionId: 'exec-1', organizationId: 'org-1',
      stage: 'VALIDATING', contentHash: 'hash-1', state: { data: 1 },
      completedNodeIds: [], timestamp: '2026-01-01T00:00:00Z',
    };
    const row = CheckpointMapper.toRow(cp as never);
    assert.equal(row.id, 'cp-1');
    assert.equal(row.node_id, 'VALIDATING');
    const restored = CheckpointMapper.fromRow(row as never);
    assert.equal(restored.checkpointId, 'cp-1');
    assert.equal(restored.stage, 'VALIDATING');
  });

  test('77. mappers — IdempotencyMapper round trip', () => {
    const record = {
      idempotencyKey: 'key-1', organizationId: 'org-1',
      requestHash: 'hash-abc', response: { result: 'ok' },
      statusCode: 200, createdAt: '2026-01-01T00:00:00Z',
      expiresAt: '2026-01-02T00:00:00Z',
    };
    const row = IdempotencyMapper.toRow(record as never);
    assert.equal(row.key, 'key-1');
    assert.equal(row.organization_id, 'org-1');
    const restored = IdempotencyMapper.fromRow(row as never);
    assert.equal(restored.idempotencyKey, 'key-1');
  });

  test('78. mappers — OutboxEventMapper round trip', () => {
    const event = {
      id: 'evt-1', organizationId: 'org-1', eventType: 'test.event',
      aggregateId: 'agg-1', payload: { data: 1 }, status: 'PENDING' as const,
      retryCount: 0, maxRetries: 5, nextAttemptAt: '2026-01-01T00:00:00Z',
      lastError: null, publishedAt: null,
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    };
    const row = OutboxEventMapper.toRow(event);
    assert.equal(row.id, 'evt-1');
    assert.equal(row.event_type, 'test.event');
    const restored = OutboxEventMapper.fromRow(row as never);
    assert.equal(restored.id, 'evt-1');
    assert.equal(restored.eventType, 'test.event');
  });

  test('79. mappers — AuditLogMapper round trip', () => {
    const entry = {
      auditLogId: 'log-1', organizationId: 'org-1', actorId: 'user-1',
      action: 'workflow.create', resourceType: 'workflow', resourceId: 'wf-1',
      result: 'SUCCESS' as const, correlationId: 'corr-1', requestId: 'req-1',
      metadata: { foo: 'bar' }, timestamp: '2026-01-01T00:00:00Z',
    };
    const row = AuditLogMapper.toRow(entry);
    assert.equal(row.id, 'log-1');
    assert.equal(row.action, 'workflow.create');
    const restored = AuditLogMapper.fromRow(row as never);
    assert.equal(restored.auditLogId, 'log-1');
    assert.equal(restored.action, 'workflow.create');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 14. Transaction Manager
  // ══════════════════════════════════════════════════════════════════════════════

  test('80. transaction — PostgresTransactionManager can be constructed', () => {
    const tm = new PostgresTransactionManager(null as never, makeIdGen());
    assert.ok(tm);
  });

  test('81. transaction — UnitOfWork collects and executes operations', async () => {
    const uow = new UnitOfWork<{ a: number; b: string }>();
    uow.add('a', async () => 42);
    uow.add('b', async () => 'hello');
    const results = await uow.execute();
    assert.equal(results.a, 42);
    assert.equal(results.b, 'hello');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 15. Multitenancy / Tenant Isolation
  // ══════════════════════════════════════════════════════════════════════════════

  test('82. multitenancy — cache keys are org-scoped and cannot collide', () => {
    const cache = new InMemoryCache(60000, 1000);
    const tenantCache = new TenantScopedCache(cache);
    tenantCache.set('org-A', 'config', 'value-A');
    tenantCache.set('org-B', 'config', 'value-B');
    assert.equal(tenantCache.get('org-A', 'config'), 'value-A');
    assert.equal(tenantCache.get('org-B', 'config'), 'value-B');
    assert.notEqual(tenantCache.get('org-A', 'config'), tenantCache.get('org-B', 'config'));
  });

  test('83. multitenancy — outbox events are org-scoped', async () => {
    const repo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const handler = new SimulatedOutboxHandler();
    const publisher = new OutboxPublisher(repo, handler, FIXED_CLOCK_STR, makeIdGen());
    await publisher.createEvent('org-A', 'event', 'agg', {});
    await publisher.createEvent('org-B', 'event', 'agg', {});
    const aEvents = await repo.findByOrganization('org-A');
    const bEvents = await repo.findByOrganization('org-B');
    assert.equal(aEvents.length, 1);
    assert.equal(bEvents.length, 1);
    assert.notEqual(aEvents[0].organizationId, bEvents[0].organizationId);
  });

  test('84. multitenancy — locks are resource-scoped not org-scoped', async () => {
    const lock = new InMemoryLock();
    const info1 = await lock.acquire('org-A:resource-1', 'owner-A', 5000);
    const info2 = await lock.acquire('org-B:resource-1', 'owner-B', 5000);
    assert.ok(info1);
    assert.ok(info2, 'different orgs can lock different resources with same name');
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 16. Integration — end-to-end outbox + job queue
  // ══════════════════════════════════════════════════════════════════════════════

  test('85. integration — outbox publication job triggers outbox processor', async () => {
    const outboxRepo = new InMemoryOutboxRepository(FIXED_CLOCK_STR);
    const outboxHandler = new SimulatedOutboxHandler();
    const outboxPublisher = new OutboxPublisher(outboxRepo, outboxHandler, FIXED_CLOCK_STR, makeIdGen());
    await outboxPublisher.createEvent('org-1', 'test.event', 'agg-1', { value: 42 });

    const queue = new InMemoryJobQueue(FIXED_CLOCK_STR, makeIdGen());
    queue.registerHandler('outbox-publication', { handle: async () => {
      const result = await outboxPublisher.processBatch(10);
      return { success: true, output: { published: result.published }, durationMs: 0, error: null };
    } });
    await queue.enqueue('outbox-publication', 'org-1', {});
    const result = await queue.processBatch(5);
    assert.equal(result.succeeded, 1);
    assert.equal(outboxHandler.getPublished().length, 1);
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
