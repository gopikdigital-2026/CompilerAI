// ─── Typed application configuration ─────────────────────────────────────────────
// Centralized config — no domain code reads env vars directly.

import { ConfigurationError } from '../errors/InfrastructureErrors';

export interface DatabaseConfig {
  url:           string;
  maxConnections: number;
  connectionTimeoutMs: number;
  idleTimeoutMs:  number;
  ssl:            boolean;
}

export interface QueueConfig {
  maxConcurrency: number;
  jobTimeoutMs:   number;
  maxRetries:     number;
  backoffMs:      number;
  backoffMultiplier: number;
  pollIntervalMs: number;
}

export interface CacheConfig {
  defaultTtlMs:  number;
  maxEntries:    number;
  cleanupIntervalMs: number;
}

export interface TelemetryConfig {
  enabled:        boolean;
  queryLogEnabled: boolean;
  slowQueryThresholdMs: number;
  redactSql:      boolean;
}

export interface RuntimeConfig {
  maxDurationMs:     number;
  defaultRiskTolerance: string;
  minimumConfidenceThreshold: number;
  checkpointInterval: number;
}

export interface SecurityConfig {
  rateLimitPerOrg:    number;
  rateLimitWindowMs:  number;
  requestTimeoutMs:   number;
  maxBodySizeBytes:   number;
  apiKeyHeader:       string;
  authTokenHeader:    string;
}

export interface RetryConfig {
  maxRetries:      number;
  baseDelayMs:     number;
  maxDelayMs:      number;
  backoffMultiplier: number;
}

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface ApplicationConfig {
  environment:    Environment;
  database:       DatabaseConfig;
  queue:          QueueConfig;
  cache:          CacheConfig;
  telemetry:      TelemetryConfig;
  runtime:        RuntimeConfig;
  security:       SecurityConfig;
  retry:          RetryConfig;
}

// ── Config loader ──────────────────────────────────────────────────────────────

export class ConfigLoader {
  static load(env: Record<string, string | undefined>): ApplicationConfig {
    const environment = (env.NODE_ENV as Environment) ?? 'development';
    return {
      environment,
      database: {
        url: env.SUPABASE_DB_URL ?? env.DATABASE_URL ?? '',
        maxConnections: parseInt(env.DB_MAX_CONNECTIONS ?? '10', 10),
        connectionTimeoutMs: parseInt(env.DB_CONNECTION_TIMEOUT_MS ?? '5000', 10),
        idleTimeoutMs: parseInt(env.DB_IDLE_TIMEOUT_MS ?? '30000', 10),
        ssl: env.DB_SSL === 'true',
      },
      queue: {
        maxConcurrency: parseInt(env.QUEUE_MAX_CONCURRENCY ?? '5', 10),
        jobTimeoutMs: parseInt(env.QUEUE_JOB_TIMEOUT_MS ?? '30000', 10),
        maxRetries: parseInt(env.QUEUE_MAX_RETRIES ?? '3', 10),
        backoffMs: parseInt(env.QUEUE_BACKOFF_MS ?? '1000', 10),
        backoffMultiplier: parseFloat(env.QUEUE_BACKOFF_MULTIPLIER ?? '2'),
        pollIntervalMs: parseInt(env.QUEUE_POLL_INTERVAL_MS ?? '5000', 10),
      },
      cache: {
        defaultTtlMs: parseInt(env.CACHE_DEFAULT_TTL_MS ?? '60000', 10),
        maxEntries: parseInt(env.CACHE_MAX_ENTRIES ?? '1000', 10),
        cleanupIntervalMs: parseInt(env.CACHE_CLEANUP_INTERVAL_MS ?? '300000', 10),
      },
      telemetry: {
        enabled: env.TELEMETRY_ENABLED !== 'false',
        queryLogEnabled: env.QUERY_LOG_ENABLED === 'true',
        slowQueryThresholdMs: parseInt(env.SLOW_QUERY_THRESHOLD_MS ?? '500', 10),
        redactSql: env.REDACT_SQL !== 'false',
      },
      runtime: {
        maxDurationMs: parseInt(env.RUNTIME_MAX_DURATION_MS ?? '60000', 10),
        defaultRiskTolerance: env.RUNTIME_DEFAULT_RISK_TOLERANCE ?? 'MEDIUM',
        minimumConfidenceThreshold: parseInt(env.RUNTIME_MIN_CONFIDENCE ?? '50', 10),
        checkpointInterval: parseInt(env.CHECKPOINT_INTERVAL ?? '5', 10),
      },
      security: {
        rateLimitPerOrg: parseInt(env.RATE_LIMIT_PER_ORG ?? '100', 10),
        rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
        requestTimeoutMs: parseInt(env.REQUEST_TIMEOUT_MS ?? '30000', 10),
        maxBodySizeBytes: parseInt(env.MAX_BODY_SIZE_BYTES ?? '1048576', 10),
        apiKeyHeader: env.API_KEY_HEADER ?? 'X-API-Key',
        authTokenHeader: env.AUTH_TOKEN_HEADER ?? 'Authorization',
      },
      retry: {
        maxRetries: parseInt(env.RETRY_MAX ?? '3', 10),
        baseDelayMs: parseInt(env.RETRY_BASE_DELAY_MS ?? '100', 10),
        maxDelayMs: parseInt(env.RETRY_MAX_DELAY_MS ?? '5000', 10),
        backoffMultiplier: parseFloat(env.RETRY_BACKOFF_MULTIPLIER ?? '2'),
      },
    };
  }
}

// ── Config validator ───────────────────────────────────────────────────────────

export class ConfigValidator {
  static validate(config: ApplicationConfig): string[] {
    const errors: string[] = [];
    if (!config.database.url) errors.push('database.url is required');
    if (config.database.maxConnections < 1) errors.push('database.maxConnections must be >= 1');
    if (config.queue.maxConcurrency < 1) errors.push('queue.maxConcurrency must be >= 1');
    if (config.queue.maxRetries < 0) errors.push('queue.maxRetries must be >= 0');
    if (config.cache.defaultTtlMs < 1000) errors.push('cache.defaultTtlMs must be >= 1000');
    if (config.runtime.maxDurationMs < 1000) errors.push('runtime.maxDurationMs must be >= 1000');
    if (config.security.rateLimitPerOrg < 1) errors.push('security.rateLimitPerOrg must be >= 1');
    if (config.security.maxBodySizeBytes < 1024) errors.push('security.maxBodySizeBytes must be >= 1024');
    return errors;
  }

  static validateOrThrow(config: ApplicationConfig): void {
    const errors = this.validate(config);
    if (errors.length > 0) {
      throw new ConfigurationError(`Invalid configuration:\n  - ${errors.join('\n  - ')}`);
    }
  }
}

// Re-export ConfigurationError for convenience
export { ConfigurationError } from '../errors/InfrastructureErrors';
