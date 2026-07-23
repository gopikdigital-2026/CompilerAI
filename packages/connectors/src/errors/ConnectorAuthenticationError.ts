import { ConnectorRuntimeError } from './ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';

export class ConnectorAuthenticationError extends ConnectorRuntimeError {
  constructor(
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
    message: string,
    cause?: Error,
  ) {
    super(message, 'AUTHENTICATION_ERROR', false, connectorId, operation, executionId, cause);
    this.name = 'ConnectorAuthenticationError';
  }
}
