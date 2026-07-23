export interface ExponentialBackoffConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
  jitter: boolean;
}

export const DEFAULT_BACKOFF_CONFIG: ExponentialBackoffConfig = {
  initialDelayMs: 250,
  maxDelayMs: 5000,
  multiplier: 2,
  jitter: true,
};

export class ExponentialBackoff {
  private readonly config: ExponentialBackoffConfig;

  constructor(config: Partial<ExponentialBackoffConfig> = {}) {
    this.config = { ...DEFAULT_BACKOFF_CONFIG, ...config };
  }

  delayForAttempt(attempt: number): number {
    let delay = this.config.initialDelayMs * Math.pow(this.config.multiplier, attempt - 1);
    delay = Math.min(delay, this.config.maxDelayMs);

    if (this.config.jitter) {
      const jitterRange = delay * 0.25;
      delay = delay + (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.max(0, Math.round(delay));
  }

  async sleep(attempt: number, signal?: AbortSignal): Promise<void> {
    const delay = this.delayForAttempt(attempt);
    if (delay === 0) return;

    if (signal) {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }

    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
