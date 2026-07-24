export interface GitHubRateLimitHeaders {
  readonly limit: number | null;
  readonly remaining: number | null;
  readonly used: number | null;
  readonly reset: number | null;
  readonly resetAt: string | null;
  readonly resource: string | null;
  readonly retryAfterMs: number | null;
}

export class GitHubRateLimitMapper {
  static extractFromHeaders(headers: Record<string, string>): GitHubRateLimitHeaders | null {
    const hasRateLimitHeader =
      'x-ratelimit-limit' in headers ||
      'x-ratelimit-remaining' in headers ||
      'x-ratelimit-used' in headers ||
      'x-ratelimit-reset' in headers ||
      'retry-after' in headers;

    if (!hasRateLimitHeader) return null;

    const resetEpoch = this.parseIntSafe(headers['x-ratelimit-reset']);
    const retryAfterRaw = headers['retry-after'];
    const retryAfterMs = retryAfterRaw ? this.parseIntSafe(retryAfterRaw) : null;

    return {
      limit: this.parseIntSafe(headers['x-ratelimit-limit']),
      remaining: this.parseIntSafe(headers['x-ratelimit-remaining']),
      used: this.parseIntSafe(headers['x-ratelimit-used']),
      reset: resetEpoch,
      resetAt: resetEpoch !== null && resetEpoch > 0
        ? new Date(resetEpoch * 1000).toISOString()
        : null,
      resource: headers['x-ratelimit-resource'] ?? null,
      retryAfterMs: retryAfterMs !== null ? retryAfterMs * 1000 : null,
    };
  }

  static toMetadata(rateLimit: GitHubRateLimitHeaders): Record<string, unknown> {
    return {
      rateLimitLimit: rateLimit.limit,
      rateLimitRemaining: rateLimit.remaining,
      rateLimitUsed: rateLimit.used,
      rateLimitResetAt: rateLimit.resetAt,
      rateLimitResource: rateLimit.resource,
      rateLimitRetryAfterMs: rateLimit.retryAfterMs,
    };
  }

  static isRateLimited(rateLimit: GitHubRateLimitHeaders | null): boolean {
    if (!rateLimit) return false;
    if (rateLimit.remaining !== null && rateLimit.remaining === 0) return true;
    if (rateLimit.retryAfterMs !== null && rateLimit.retryAfterMs > 0) return true;
    return false;
  }

  private static parseIntSafe(value: string | undefined): number | null {
    if (value === undefined || value === null || value.length === 0) return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
