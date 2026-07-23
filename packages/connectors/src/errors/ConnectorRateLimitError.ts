import { ConnectorRuntimeError } from './ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';

export interface RateLimitDetails {
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterMs: number;
}

export class ConnectorRateLimitError extends ConnectorRuntimeError {
  constructor(
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
    public readonly rateLimit: RateLimitDetails,
  ) {
    super(
      `Rate limit exceeded for ${connectorId}.${operation}`,
      'RATE_LIMIT_ERROR',
      true,
      connectorId,
      operation,
      executionId,
      undefined,
      { limit: rateLimit.limit, remaining: rateLimit.remaining, resetAt: rateLimit.resetAt, retryAfterMs: rateLimit.retryAfterMs },
    );
    this.name = 'ConnectorRateLimitError';
  }
}
