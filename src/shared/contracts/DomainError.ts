import type { CorrelationId, EntityId } from './Ids';
import type { Metadata } from './Result';

export type ErrorCategory =
  | 'VALIDATION'
  | 'AUTHORIZATION'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INFRASTRUCTURE'
  | 'TIMEOUT'
  | 'CANCELLATION'
  | 'DOMAIN_RULE'
  | 'AUTHENTICATION';

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  abstract readonly retryable: boolean;
  readonly severity: ErrorSeverity = 'MEDIUM';
  readonly correlationId?: CorrelationId;
  readonly entityId?: EntityId;
  readonly metadata: Metadata;
  readonly cause?: Error;

  constructor(
    message: string,
    opts?: {
      correlationId?: CorrelationId;
      entityId?: EntityId;
      metadata?: Metadata;
      cause?: Error;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.correlationId = opts?.correlationId;
    this.entityId = opts?.entityId;
    this.metadata = opts?.metadata ?? {};
    this.cause = opts?.cause;
  }

  toSafe(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      retryable: this.retryable,
      severity: this.severity,
      correlationId: this.correlationId,
      entityId: this.entityId,
    };
  }
}

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}

export function isRetryableError(e: unknown): boolean {
  if (e instanceof DomainError) return e.retryable;
  if (e instanceof Error) return false;
  return false;
}

export function toSafeError(e: unknown): string {
  if (e instanceof DomainError) return `${e.code}: ${e.message}`;
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return 'Unknown error';
}
