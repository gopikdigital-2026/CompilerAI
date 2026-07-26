import type {
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitState,
  ICircuitBreaker,
} from '../models.js';

interface CallResult {
  success: boolean;
  timestamp: number;
}

export class CircuitBreaker implements ICircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  private totalCalls = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;
  private lastFailureTime?: number;
  private lastStateChange = Date.now();
  private window: CallResult[] = [];
  private halfOpenCalls = 0;

  constructor(private readonly config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime! >= this.config.resetTimeoutMs) {
        this.transitionTo('half_open');
      } else {
        throw new Error(`Circuit breaker '${this.config.name}' is open`);
      }
    }

    if (this.state === 'half_open' && this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
      throw new Error(`Circuit breaker '${this.config.name}' is half-open and at max trial calls`);
    }

    if (this.state === 'half_open') {
      this.halfOpenCalls++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.totalCalls++;
    this.totalSuccesses++;
    this.consecutiveFailures = 0;
    this.recordWindow(true);

    if (this.state === 'half_open') {
      this.transitionTo('closed');
    }
  }

  private onFailure(): void {
    this.totalCalls++;
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    this.recordWindow(false);

    if (this.state === 'half_open') {
      this.transitionTo('open');
      return;
    }

    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.transitionTo('open');
      return;
    }

    if (this.config.failurePercentageThreshold !== undefined && this.window.length >= this.config.windowSize) {
      const failureRate = (this.window.filter((w) => !w.success).length / this.window.length) * 100;
      if (failureRate >= this.config.failurePercentageThreshold) {
        this.transitionTo('open');
      }
    }
  }

  private recordWindow(success: boolean): void {
    this.window.push({ success, timestamp: Date.now() });
    if (this.window.length > this.config.windowSize) {
      this.window.shift();
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.lastStateChange = Date.now();
    if (newState === 'closed') {
      this.consecutiveFailures = 0;
      this.halfOpenCalls = 0;
    }
    if (newState === 'half_open') {
      this.halfOpenCalls = 0;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      name: this.config.name,
      state: this.state,
      totalCalls: this.totalCalls,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : undefined,
      lastStateChange: new Date(this.lastStateChange).toISOString(),
      windowCalls: this.window.length,
      windowFailures: this.window.filter((w) => !w.success).length,
    };
  }

  reset(): void {
    this.transitionTo('closed');
    this.consecutiveFailures = 0;
    this.window = [];
  }

  open(): void {
    this.transitionTo('open');
    this.lastFailureTime = Date.now();
  }

  close(): void {
    this.transitionTo('closed');
  }
}

export function createCircuitBreakerConfig(
  name: string,
  options?: Partial<CircuitBreakerConfig>,
): CircuitBreakerConfig {
  return {
    name,
    failureThreshold: options?.failureThreshold ?? 5,
    failurePercentageThreshold: options?.failurePercentageThreshold,
    resetTimeoutMs: options?.resetTimeoutMs ?? 30000,
    windowSize: options?.windowSize ?? 20,
    halfOpenMaxCalls: options?.halfOpenMaxCalls ?? 3,
  };
}
