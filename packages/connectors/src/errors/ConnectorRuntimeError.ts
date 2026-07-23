import type { ConnectorId } from '../types/index';

export type ConnectorErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'TIMEOUT_ERROR'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'CIRCUIT_OPEN_ERROR'
  | 'CANCELLED_ERROR'
  | 'INTERNAL_ERROR';

export interface SanitizedDetails {
  readonly [key: string]: unknown;
}

export class ConnectorRuntimeError extends Error {
  constructor(
    message: string,
    public readonly errorCode: ConnectorErrorCode,
    public readonly retryable: boolean,
    public readonly connectorId: ConnectorId,
    public readonly operation: string,
    public readonly executionId: string,
    public readonly cause?: Error,
    public readonly sanitizedDetails?: SanitizedDetails,
  ) {
    super(message);
    this.name = 'ConnectorRuntimeError';
  }
}
