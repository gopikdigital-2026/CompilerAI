import type { ConnectorId, UUID, ISOString, Metadata } from '../types/index';
import type { ConnectorRuntimeError } from '../errors/ConnectorRuntimeError';

export interface ConnectorOperationRequest<TInput = Record<string, unknown>> {
  connectorId: ConnectorId;
  operation: string;
  input: TInput;
  context: ConnectorExecutionContext;
  abortSignal?: AbortSignal;
}

export interface ConnectorExecutionContext {
  organizationId: UUID;
  userId: UUID | null;
  requestId: string;
  correlationId: string;
  traceId: string;
  metadata: Metadata;
}

export interface ConnectorOperationResult<TOutput = unknown> {
  success: boolean;
  data: TOutput | null;
  error: ConnectorRuntimeError | null;
  connectorId: ConnectorId;
  operation: string;
  executionId: string;
  startedAt: ISOString;
  completedAt: ISOString;
  durationMs: number;
  attempts: number;
  traceId: string;
  metadata: Metadata;
}

export interface ConnectorOperation<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  execute(input: TInput, context: ConnectorExecutionContext, signal: AbortSignal): Promise<TOutput>;
  validateInput(input: TInput): string[];
  requiredCapabilities: string[];
  timeoutMs: number;
  retryable: boolean;
  idempotent: boolean;
}
