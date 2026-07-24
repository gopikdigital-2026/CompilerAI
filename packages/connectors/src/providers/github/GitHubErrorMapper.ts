import { ConnectorRuntimeError } from '../../errors/ConnectorRuntimeError';
import { ConnectorAuthenticationError } from '../../errors/ConnectorAuthenticationError';
import { ConnectorRateLimitError } from '../../errors/ConnectorRateLimitError';
import { sanitizeMetadata } from '../../observability/sanitize';
import type { ConnectorId } from '../../types/index';

interface GitHubApiErrorResponse {
  readonly message?: string;
  readonly documentation_url?: string;
  readonly errors?: readonly {
    readonly resource?: string;
    readonly field?: string;
    readonly code?: string;
    readonly message?: string;
  }[];
}

export class GitHubErrorMapper {
  static mapHttpError(
    status: number,
    body: unknown,
    headers: Record<string, string>,
    connectorId: ConnectorId,
  ): ConnectorRuntimeError {
    const errorBody = body as GitHubApiErrorResponse | null;
    const message = errorBody?.message ?? `GitHub API returned status ${status}`;
    const sanitizedHeaders = sanitizeMetadata(headers) as Record<string, unknown>;
    const details = { headers: sanitizedHeaders };
    const operation = 'apiRequest';
    const executionId = 'unknown';

    if (status === 401) {
      return new ConnectorAuthenticationError(
        connectorId, operation, executionId,
        `GitHub authentication failed: ${message}`,
      );
    }

    if (status === 403) {
      if (GitHubErrorMapper.isRateLimited(headers, errorBody)) {
        return GitHubErrorMapper.createRateLimitError(headers, connectorId, operation, executionId);
      }
      return new ConnectorRuntimeError(
        `GitHub authorization failed: ${message}`, 'AUTHORIZATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 404) {
      return new ConnectorRuntimeError(
        `GitHub resource not found: ${message}`, 'VALIDATION_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 409) {
      return new ConnectorRuntimeError(
        `GitHub conflict: ${message}`, 'PROVIDER_ERROR', true,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status === 422) {
      const validationErrors = errorBody?.errors?.map(
        (e) => `${e.resource ?? 'resource'}.${e.field ?? 'field'}: ${e.message ?? e.code ?? 'invalid'}`,
      ) ?? [message];
      return new ConnectorRuntimeError(
        `GitHub validation error: ${message}`, 'VALIDATION_ERROR', false,
        connectorId, operation, executionId, undefined,
        { validationErrors, headers: sanitizedHeaders },
      );
    }

    if (status === 429) {
      return GitHubErrorMapper.createRateLimitError(headers, connectorId, operation, executionId);
    }

    if (status >= 500 && status < 600) {
      return new ConnectorRuntimeError(
        `GitHub server error (${status}): ${message}`, 'PROVIDER_ERROR', true,
        connectorId, operation, executionId, undefined, details,
      );
    }

    if (status >= 400 && status < 500) {
      return new ConnectorRuntimeError(
        `GitHub client error (${status}): ${message}`, 'PROVIDER_ERROR', false,
        connectorId, operation, executionId, undefined, details,
      );
    }

    return new ConnectorRuntimeError(
      `Unexpected GitHub response (${status}): ${message}`, 'INTERNAL_ERROR', false,
      connectorId, operation, executionId, undefined, details,
    );
  }

  static mapNetworkError(error: Error, connectorId: ConnectorId): ConnectorRuntimeError {
    const sanitizedMessage = sanitizeMetadata({ message: error.message }).message ?? 'Network error';
    return new ConnectorRuntimeError(
      `GitHub network error: ${sanitizedMessage}`, 'NETWORK_ERROR', true,
      connectorId, 'apiRequest', 'unknown', error,
    );
  }

  private static isRateLimited(
    headers: Record<string, string>,
    body: GitHubApiErrorResponse | null,
  ): boolean {
    const remaining = headers['x-ratelimit-remaining'];
    if (remaining !== undefined && remaining === '0') return true;

    const retryAfter = headers['retry-after'];
    if (retryAfter !== undefined) return true;

    if (body?.message) {
      const msg = body.message.toLowerCase();
      if (msg.includes('rate limit') || msg.includes('secondary rate limit')) return true;
    }

    return false;
  }

  private static createRateLimitError(
    headers: Record<string, string>,
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
  ): ConnectorRateLimitError {
    const limit = parseInt(headers['x-ratelimit-limit'] ?? '0', 10) || 0;
    const remaining = parseInt(headers['x-ratelimit-remaining'] ?? '0', 10) || 0;
    const resetEpoch = parseInt(headers['x-ratelimit-reset'] ?? '0', 10);
    const resetAt = resetEpoch > 0 ? new Date(resetEpoch * 1000).toISOString() : new Date().toISOString();
    const retryAfterRaw = headers['retry-after'];
    const retryAfterMs = retryAfterRaw ? parseInt(retryAfterRaw, 10) * 1000 : 0;

    return new ConnectorRateLimitError(
      connectorId, operation, executionId,
      {
        limit,
        remaining,
        resetAt,
        retryAfterMs: retryAfterMs > 0 ? retryAfterMs : undefined,
      } as never,
    );
  }
}
