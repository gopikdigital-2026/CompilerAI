export interface GoogleRateLimitInfo {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly resetAt: string | null;
  readonly retryAfterMs: number | null;
  readonly reason: string | null;
}

export class GoogleRateLimitMapper {
  static extractFromHeaders(headers: Record<string, string>): GoogleRateLimitInfo | null {
    const hasRateLimitHeader =
      'x-ratelimit-limit' in headers ||
      'x-ratelimit-remaining' in headers ||
      'retry-after' in headers;

    if (!hasRateLimitHeader) return null;

    const retryAfterRaw = headers['retry-after'];
    const retryAfterMs = retryAfterRaw ? this.parseRetryAfter(retryAfterRaw) : null;

    return {
      limit: this.parseIntSafe(headers['x-ratelimit-limit']),
      remaining: this.parseIntSafe(headers['x-ratelimit-remaining']),
      resetAt: null,
      retryAfterMs,
      reason: null,
    };
  }

  static toMetadata(rateLimit: GoogleRateLimitInfo): Record<string, unknown> {
    return {
      rateLimitLimit: rateLimit.limit,
      rateLimitRemaining: rateLimit.remaining,
      rateLimitResetAt: rateLimit.resetAt,
      rateLimitRetryAfterMs: rateLimit.retryAfterMs,
      rateLimitReason: rateLimit.reason,
    };
  }

  static isRateLimited(rateLimit: GoogleRateLimitInfo | null): boolean {
    if (!rateLimit) return false;
    if (rateLimit.remaining !== null && rateLimit.remaining === 0) return true;
    if (rateLimit.retryAfterMs !== null && rateLimit.retryAfterMs > 0) return true;
    return false;
  }

  static extractFromErrorBody(body: unknown): string | null {
    const errorBody = body as { error?: { errors?: readonly { reason?: string }[]; reason?: string } } | null;
    const reasons = errorBody?.error?.errors;
    if (reasons && reasons.length > 0 && reasons[0]?.reason) {
      return reasons[0].reason;
    }
    return errorBody?.error?.reason ?? null;
  }

  private static parseIntSafe(value: string | undefined): number | null {
    if (value === undefined || value === null || value.length === 0) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private static parseRetryAfter(value: string): number | null {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed * 1000;
    return null;
  }
}

const GOOGLE_RATE_LIMIT_REASONS = new Set([
  'rateLimitExceeded',
  'userRateLimitExceeded',
  'quotaExceeded',
  'dailyLimitExceeded',
]);

export function isGoogleRateLimitReason(reason: string): boolean {
  return GOOGLE_RATE_LIMIT_REASONS.has(reason);
}
