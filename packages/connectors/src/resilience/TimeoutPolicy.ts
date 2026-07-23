import { ConnectorTimeoutError } from '../errors/ConnectorTimeoutError';
import type { ConnectorId } from '../types/index';

export interface TimeoutPolicyConfig {
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutPolicyConfig = {
  defaultTimeoutMs: 30_000,
  maxTimeoutMs: 120_000,
};

export class TimeoutPolicy {
  private readonly config: TimeoutPolicyConfig;

  constructor(config: Partial<TimeoutPolicyConfig> = {}) {
    this.config = { ...DEFAULT_TIMEOUT_CONFIG, ...config };
  }

  resolveTimeout(operationTimeoutMs?: number): number {
    if (operationTimeoutMs && operationTimeoutMs > 0) {
      return Math.min(operationTimeoutMs, this.config.maxTimeoutMs);
    }
    return this.config.defaultTimeoutMs;
  }

  createAbortSignal(timeoutMs: number, externalSignal?: AbortSignal): { signal: AbortSignal; timer: NodeJS.Timeout | null } {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | null = null;

    timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
        clearTimeout(timer);
        return { signal: controller.signal, timer: null };
      }
      externalSignal.addEventListener('abort', () => {
        controller.abort();
        clearTimeout(timer);
      }, { once: true });
    }

    return { signal: controller.signal, timer };
  }

  createTimeoutError(connectorId: ConnectorId, operation: string, executionId: string, timeoutMs: number): ConnectorTimeoutError {
    return new ConnectorTimeoutError(connectorId, operation, executionId, timeoutMs);
  }

  isTimeoutError(error: unknown): boolean {
    return error instanceof ConnectorTimeoutError || (error instanceof DOMException && error.name === 'TimeoutError');
  }

  isAbortError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'AbortError';
  }

  clearTimer(timer: NodeJS.Timeout | null): void {
    if (timer) clearTimeout(timer);
  }
}
