export interface RetryPolicyConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrorCodes: string[];
  nonRetryableErrorCodes: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryPolicyConfig = {
  maxAttempts: 3,
  initialDelayMs: 250,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrorCodes: ['NETWORK_ERROR', 'PROVIDER_ERROR', 'RATE_LIMIT_ERROR'],
  nonRetryableErrorCodes: ['VALIDATION_ERROR', 'AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR', 'CANCELLED_ERROR'],
};

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
}

export class RetryPolicy {
  private readonly config: RetryPolicyConfig;

  constructor(config: Partial<RetryPolicyConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  shouldRetry(errorCode: string, attempt: number, isIdempotent: boolean): RetryDecision {
    const nonRetryable = this.config.nonRetryableErrorCodes.includes(errorCode);
    if (nonRetryable) {
      return { shouldRetry: false, delayMs: 0, attempt };
    }

    const retryable = this.config.retryableErrorCodes.includes(errorCode);
    if (!retryable && !isIdempotent) {
      return { shouldRetry: false, delayMs: 0, attempt };
    }

    if (attempt >= this.config.maxAttempts) {
      return { shouldRetry: false, delayMs: 0, attempt };
    }

    const delay = this.computeDelay(attempt);
    return { shouldRetry: true, delayMs: delay, attempt: attempt + 1 };
  }

  computeDelay(attempt: number): number {
    let delay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, this.config.maxDelayMs);

    if (this.config.jitter) {
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(0, Math.round(delay));
  }

  applyRetryAfter(retryAfterMs: number, attempt: number): number {
    return Math.min(retryAfterMs, this.config.maxDelayMs) || this.computeDelay(attempt);
  }

  get maxAttempts(): number {
    return this.config.maxAttempts;
  }
}
