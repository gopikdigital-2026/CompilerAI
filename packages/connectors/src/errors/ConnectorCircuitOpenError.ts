import { ConnectorRuntimeError } from './ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';

export interface CircuitOpenDetails {
  failureCount: number;
  failureThreshold: number;
  openUntil: string;
}

export class ConnectorCircuitOpenError extends ConnectorRuntimeError {
  constructor(
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
    public readonly circuit: CircuitOpenDetails,
  ) {
    super(
      `Circuit breaker is OPEN for ${connectorId}.${operation} (failures: ${circuit.failureCount}/${circuit.failureThreshold})`,
      'CIRCUIT_OPEN_ERROR',
      false,
      connectorId,
      operation,
      executionId,
      undefined,
      { failureCount: circuit.failureCount, failureThreshold: circuit.failureThreshold, openUntil: circuit.openUntil },
    );
    this.name = 'ConnectorCircuitOpenError';
  }
}
