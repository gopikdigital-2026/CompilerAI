import type { ConnectorId, UUID, ISOString } from '../types/index';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  openDurationMs: number;
  monitoredErrorCodes: string[];
}

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  openDurationMs: 30_000,
  monitoredErrorCodes: ['PROVIDER_ERROR', 'NETWORK_ERROR', 'TIMEOUT_ERROR'],
};

interface CircuitStateRecord {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  openedAt: number | null;
  lastError: string | null;
}

export class CircuitBreaker {
  private readonly config: CircuitBreakerConfig;
  private states = new Map<string, CircuitStateRecord>();

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_CONFIG, ...config };
  }

  getState(connectorId: ConnectorId, organizationId: UUID, operation: string): CircuitState {
    const key = this.makeKey(connectorId, organizationId, operation);
    const record = this.states.get(key);
    if (!record) return 'CLOSED';

    if (record.state === 'OPEN') {
      if (record.openedAt && Date.now() - record.openedAt >= this.config.openDurationMs) {
        record.state = 'HALF_OPEN';
        record.successCount = 0;
      }
    }

    return record.state;
  }

  canExecute(connectorId: ConnectorId, organizationId: UUID, operation: string): boolean {
    const state = this.getState(connectorId, organizationId, operation);
    return state === 'CLOSED' || state === 'HALF_OPEN';
  }

  recordSuccess(connectorId: ConnectorId, organizationId: UUID, operation: string): void {
    const key = this.makeKey(connectorId, organizationId, operation);
    const record = this.getOrCreateRecord(key);

    if (record.state === 'HALF_OPEN') {
      record.successCount++;
      if (record.successCount >= this.config.successThreshold) {
        record.state = 'CLOSED';
        record.failureCount = 0;
        record.successCount = 0;
        record.openedAt = null;
        record.lastError = null;
      }
    } else if (record.state === 'CLOSED') {
      record.failureCount = 0;
    }
  }

  recordFailure(connectorId: ConnectorId, organizationId: UUID, operation: string, errorCode: string): void {
    if (!this.config.monitoredErrorCodes.includes(errorCode)) return;

    const key = this.makeKey(connectorId, organizationId, operation);
    const record = this.getOrCreateRecord(key);

    record.failureCount++;
    record.lastError = errorCode;

    if (record.state === 'HALF_OPEN') {
      record.state = 'OPEN';
      record.openedAt = Date.now();
      record.successCount = 0;
    } else if (record.state === 'CLOSED' && record.failureCount >= this.config.failureThreshold) {
      record.state = 'OPEN';
      record.openedAt = Date.now();
    }
  }

  getOpenUntil(connectorId: ConnectorId, organizationId: UUID, operation: string): ISOString | null {
    const key = this.makeKey(connectorId, organizationId, operation);
    const record = this.states.get(key);
    if (!record || !record.openedAt) return null;
    return new Date(record.openedAt + this.config.openDurationMs).toISOString();
  }

  getFailureCount(connectorId: ConnectorId, organizationId: UUID, operation: string): number {
    const key = this.makeKey(connectorId, organizationId, operation);
    return this.states.get(key)?.failureCount ?? 0;
  }

  reset(connectorId: ConnectorId, organizationId: UUID, operation: string): void {
    const key = this.makeKey(connectorId, organizationId, operation);
    this.states.delete(key);
  }

  resetAll(): void {
    this.states.clear();
  }

  private makeKey(connectorId: ConnectorId, organizationId: UUID, operation: string): string {
    return `${organizationId}:${connectorId}:${operation}`;
  }

  private getOrCreateRecord(key: string): CircuitStateRecord {
    let record = this.states.get(key);
    if (!record) {
      record = {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        openedAt: null,
        lastError: null,
      };
      this.states.set(key, record);
    }
    return record;
  }
}
