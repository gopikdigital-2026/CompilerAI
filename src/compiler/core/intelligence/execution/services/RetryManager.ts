// ─── RetryManager ───────────────────────────────────────────────────────────────
// Executes a function with retry logic — simulated delays, deterministic.

import type { IRetryManager } from '../interfaces/IExecutionEngine';
import type { RetryConfig, RetryAttempt } from '../models/RetryConfig';

export class RetryManager implements IRetryManager {
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  async executeWithRetry<T>(
    fn: () => Promise<{ success: boolean; result: T; error: string | null }>,
    config: RetryConfig,
    stepId: string,
  ): Promise<{ success: boolean; result: T; error: string | null; attempts: RetryAttempt[] }> {
    const attempts: RetryAttempt[] = [];
    let lastResult: T | null = null;
    let lastError: string | null = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      const timestamp = this.clock();
      let delayMs = 0;

      if (attempt > 1) {
        delayMs = config.exponential
          ? config.baseDelayMs * Math.pow(2, attempt - 2)
          : config.baseDelayMs;
        // Simulated delay — use a minimal real delay for async semantics
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 10)));
        }
      }

      const outcome = await fn();
      lastResult = outcome.result;
      lastError = outcome.error;

      attempts.push({
        attempt,
        stepId,
        success: outcome.success,
        error: outcome.error,
        delayMs,
        timestamp,
      });

      if (outcome.success) {
        return { success: true, result: outcome.result, error: null, attempts };
      }

      if (attempt > config.maxRetries + 1) break;
    }

    return {
      success: false,
      result: lastResult as T,
      error: lastError,
      attempts,
    };
  }
}
