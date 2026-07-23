import { ConnectorRuntimeError } from './ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';

export class ConnectorTimeoutError extends ConnectorRuntimeError {
  constructor(
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
    public readonly timeoutMs: number,
  ) {
    super(
      `Operation ${operation} timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      false,
      connectorId,
      operation,
      executionId,
      undefined,
      { timeoutMs },
    );
    this.name = 'ConnectorTimeoutError';
  }
}
