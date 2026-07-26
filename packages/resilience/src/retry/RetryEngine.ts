import type { IRetryEngine, RetryConfig, RetryResult } from '../models.js';

export class RetryEngine implements IRetryEngine {
  async execute<T>(fn: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>> {
    const delays: number[] = [];
    let totalDelayMs = 0;
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelayMs,
          delays,
        };
      } catch (err) {
        lastError = err;

        if (!config.isRetryable(err)) {
          return {
            success: false,
            error: err,
            attempts: attempt,
            totalDelayMs,
            delays,
          };
        }

        if (attempt >= config.maxAttempts) {
          break;
        }

        const delay = this.computeDelay(attempt, config);
        delays.push(delay);
        totalDelayMs += delay;
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalDelayMs,
      delays,
    };
  }

  private computeDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.strategy) {
      case 'exponential':
        delay = config.baseDelayMs * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = config.baseDelayMs * attempt;
        break;
      case 'fixed':
      default:
        delay = config.baseDelayMs;
        break;
    }

    delay = Math.min(delay, config.maxDelayMs);

    if (config.jitter) {
      const factor = config.jitterFactor ?? 0.5;
      const jitterAmount = delay * factor;
      delay = delay - jitterAmount + Math.random() * jitterAmount * 2;
    }

    return Math.max(0, Math.round(delay));
  }

  private sleep(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      setImmediate(() => resolve());
    });
  }
}

// Test-friendly sleep that uses setImmediate for small delays
export function createTestRetryEngine(): RetryEngine {
  return new RetryEngine();
}

export function createRetryConfig(options: Partial<RetryConfig> & { maxAttempts: number }): RetryConfig {
  return {
    maxAttempts: options.maxAttempts,
    strategy: options.strategy ?? 'exponential',
    baseDelayMs: options.baseDelayMs ?? 100,
    maxDelayMs: options.maxDelayMs ?? 10000,
    jitter: options.jitter ?? false,
    jitterFactor: options.jitterFactor,
    isRetryable: options.isRetryable ?? (() => true),
  };
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('timeout') || msg.includes('connection') || msg.includes('econnreset') || msg.includes('etimedout');
  }
  return true;
}

export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return !msg.includes('validation') && !msg.includes('unauthorized') && !msg.includes('forbidden') && !msg.includes('not found');
  }
  return true;
}
