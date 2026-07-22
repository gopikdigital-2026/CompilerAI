// ─── Infrastructure error classes ───────────────────────────────────────────────
// Safe-to-expose infrastructure errors. No internal provider details leak.

export class InfrastructureError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = 'InfrastructureError';
    this.code = code;
    this.retryable = retryable;
  }
}

export class DatabaseUnavailableError extends InfrastructureError {
  constructor(message = 'Database is temporarily unavailable') {
    super('DATABASE_UNAVAILABLE', message, true);
    this.name = 'DatabaseUnavailableError';
  }
}

export class RepositoryError extends InfrastructureError {
  constructor(message = 'Repository operation failed', retryable = false) {
    super('REPOSITORY_ERROR', message, retryable);
    this.name = 'RepositoryError';
  }
}

export class TransactionError extends InfrastructureError {
  constructor(message = 'Transaction failed', retryable = false) {
    super('TRANSACTION_ERROR', message, retryable);
    this.name = 'TransactionError';
  }
}

export class LockAcquisitionError extends InfrastructureError {
  constructor(message = 'Failed to acquire distributed lock') {
    super('LOCK_ACQUISITION_ERROR', message, false);
    this.name = 'LockAcquisitionError';
  }
}

export class QueueUnavailableError extends InfrastructureError {
  constructor(message = 'Job queue is unavailable') {
    super('QUEUE_UNAVAILABLE', message, true);
    this.name = 'QueueUnavailableError';
  }
}

export class JobProcessingError extends InfrastructureError {
  readonly jobId: string;
  constructor(jobId: string, message = 'Job processing failed') {
    super('JOB_PROCESSING_ERROR', message, false);
    this.name = 'JobProcessingError';
    this.jobId = jobId;
  }
}

export class OutboxPublishError extends InfrastructureError {
  readonly eventId: string;
  constructor(eventId: string, message = 'Failed to publish outbox event') {
    super('OUTBOX_PUBLISH_ERROR', message, true);
    this.name = 'OutboxPublishError';
    this.eventId = eventId;
  }
}

export class CacheError extends InfrastructureError {
  constructor(message = 'Cache operation failed') {
    super('CACHE_ERROR', message, false);
    this.name = 'CacheError';
  }
}

export class SecretProviderError extends InfrastructureError {
  constructor(message = 'Secret provider error') {
    super('SECRET_PROVIDER_ERROR', message, false);
    this.name = 'SecretProviderError';
  }
}

export class ConfigurationError extends InfrastructureError {
  constructor(message = 'Configuration validation failed') {
    super('CONFIGURATION_ERROR', message, false);
    this.name = 'ConfigurationError';
  }
}

// ── Safe error mapping for API responses ───────────────────────────────────────

export function toSafeMessage(err: unknown): string {
  if (err instanceof InfrastructureError) {
    return err.message;
  }
  return 'An internal infrastructure error occurred.';
}

export function isRetryableInfrastructureError(err: unknown): boolean {
  if (err instanceof InfrastructureError) return err.retryable;
  return false;
}
