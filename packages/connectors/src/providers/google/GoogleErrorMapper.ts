import { ConnectorRuntimeError } from '../../errors/ConnectorRuntimeError';
import { ConnectorAuthenticationError } from '../../errors/ConnectorAuthenticationError';
import { ConnectorRateLimitError } from '../../errors/ConnectorRateLimitError';
import { sanitizeMetadata } from '../../observability/sanitize';
import type { ConnectorId } from '../../types/index';
import { isGoogleRateLimitReason, GoogleRateLimitMapper } from './GoogleRateLimitMapper';

interface GoogleApiErrorResponse {
  readonly error?: {
    readonly code?: number;
    readonly message?: string;
    readonly status?: string;
    readonly errors?: readonly {
      readonly domain?: string;
      readonly reason?: string;
      readonly message?: string;
      readonly locationType?: string;
      readonly location?: string;
    }[];
  };
}

export class GoogleErrorMapper {
  static mapHttpError(
    status: number,
    body: unknown,
    headers: Record<string, string>,
    connectorId: ConnectorId,
  ): ConnectorRuntimeError {
    const errorBody = body as GoogleApiErrorResponse | null;
    const message = errorBody?.error?.message ?? `Google API returned status ${status}`;
    const reason = GoogleRateLimitMapper.extractFromErrorBody(body);
    const sanitizedHeaders = sanitizeMetadata(headers) as Record<string, unknown>;
    const details = { headers: sanitizedHeaders, reason };
    const operation = 'apiRequest';
    const executionId = 'unknown';

    if (status === 401) {
      const authReason = reason ?? 'authError';
      if (authReason === 'authError' || authReason === 'invalidCredentials') {
        return new ConnectorAuthenticationError(
          connectorId, operation, executionId,
          `Google authentication failed: ${this.sanitizeMessage(message)}`,
        );
      }
      return new ConnectorAuthenticationError(
        connectorId, operation, executionId,
        `Google authentication failed: ${this.sanitizeMessage(message)}`,
      );
    }

    if (status === 403) {
      if (reason && isGoogleRateLimitReason(reason)) {
        return this.createRateLimitError(headers, reason, connectorId, operation, executionId);
      }
      if (reason === 'insufficientPermissions' || reason === 'forbidden') {
        return new ConnectorRuntimeError(
          `Google authorization failed: ${this.sanitizeMessage(message)}`, 'AUTHORIZATION_ERROR', false,
          connectorId, operation, executionId, undefined, details,
        );
      }
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' ||
          message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')) {
        return this.createRateLimitError(headers, reason ?? 'quotaExceeded', connectorId, operation, executionId);
      }
      return new ConnectorRuntimeError(
        `Google authorization failed: ${this.sanitizeMessage(message)}`, 'AUTHORIZATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 404) {
      return new ConnectorRuntimeError(
        `Google resource not found: ${this.sanitizeMessage(message)}`, 'VALIDATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 409) {
      return new ConnectorRuntimeError(
        `Google conflict: ${this.sanitizeMessage(message)}`, 'PROVIDER_ERROR', true,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 412) {
      return new ConnectorRuntimeError(
        `Google precondition failed: ${this.sanitizeMessage(message)}`, 'VALIDATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 429) {
      return this.createRateLimitError(headers, reason ?? 'rateLimitExceeded', connectorId, operation, executionId);
    }

    if (status >= 500 && status < 600) {
      const retryable = reason === 'backendError';
      return new ConnectorRuntimeError(
        `Google server error (${status}): ${this.sanitizeMessage(message)}`, 'PROVIDER_ERROR', retryable,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status >= 400 && status < 500) {
      return new ConnectorRuntimeError(
        `Google client error (${status}): ${this.sanitizeMessage(message)}`, 'VALIDATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    return new ConnectorRuntimeError(
      `Unexpected Google response (${status}): ${this.sanitizeMessage(message)}`, 'INTERNAL_ERROR', false,
      connectorId, operation, executionId, undefined, details,
    );
  }

  static mapNetworkError(error: Error, connectorId: ConnectorId): ConnectorRuntimeError {
    const sanitizedMessage = sanitizeMetadata({ message: error.message }).message ?? 'Network error';
    return new ConnectorRuntimeError(
      `Google network error: ${sanitizedMessage}`, 'NETWORK_ERROR', true,
      connectorId, 'apiRequest', 'unknown', error,
    );
  }

  private static createRateLimitError(
    headers: Record<string, string>,
    _reason: string,
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
  ): ConnectorRateLimitError {
    const rateLimit = GoogleRateLimitMapper.extractFromHeaders(headers);
    const retryAfterMs = rateLimit?.retryAfterMs ?? undefined;

    return new ConnectorRateLimitError(
      connectorId, operation, executionId,
      {
        limit: rateLimit?.limit ?? 0,
        remaining: rateLimit?.remaining ?? 0,
        resetAt: rateLimit?.resetAt ?? new Date().toISOString(),
        retryAfterMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : undefined,
      } as never,
    );
  }

  private static sanitizeMessage(message: string): string {
    return message
      .replace(/token|secret|key|password|bearer/gi, '[REDACTED]');
  }
}
