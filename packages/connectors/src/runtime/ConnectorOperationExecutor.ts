import type { ConnectorOperation, ConnectorOperationRequest, ConnectorOperationResult, ConnectorExecutionContext } from './ConnectorExecutionResult';
import type { ConnectorRuntimeError } from '../errors/ConnectorRuntimeError';
import { ConnectorRuntimeError as RuntimeError } from '../errors/ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';
import { ConnectorNotFoundError } from '../core/ConnectorErrors';

export interface IOperationRegistry {
  register(connectorId: ConnectorId, operation: ConnectorOperation): void;
  get(connectorId: ConnectorId, operationName: string): ConnectorOperation | null;
  listByConnector(connectorId: ConnectorId): ConnectorOperation[];
  has(connectorId: ConnectorId, operationName: string): boolean;
}

export class OperationRegistry implements IOperationRegistry {
  private operations = new Map<string, Map<string, ConnectorOperation>>();

  register(connectorId: ConnectorId, operation: ConnectorOperation): void {
    let connOps = this.operations.get(connectorId);
    if (!connOps) {
      connOps = new Map();
      this.operations.set(connectorId, connOps);
    }
    connOps.set(operation.name, operation);
  }

  get(connectorId: ConnectorId, operationName: string): ConnectorOperation | null {
    return this.operations.get(connectorId)?.get(operationName) ?? null;
  }

  listByConnector(connectorId: ConnectorId): ConnectorOperation[] {
    return Array.from(this.operations.get(connectorId)?.values() ?? []);
  }

  has(connectorId: ConnectorId, operationName: string): boolean {
    return this.operations.get(connectorId)?.has(operationName) ?? false;
  }
}

export class ConnectorOperationExecutor {
  constructor(
    private readonly operationRegistry: IOperationRegistry,
  ) {}

  async executeOperation(
    request: ConnectorOperationRequest,
    executionId: string,
    userAbortSignal?: AbortSignal,
  ): Promise<ConnectorOperationResult> {
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const op = this.operationRegistry.get(request.connectorId, request.operation);
    if (!op) {
      return this.fail(
        request, executionId, startedAt, startTime, 0,
        new RuntimeError(
          `Operation '${request.operation}' not found for connector '${request.connectorId}'`,
          'VALIDATION_ERROR', false,
          request.connectorId, request.operation, executionId,
        ),
      );
    }

    const validationErrors = op.validateInput(request.input);
    if (validationErrors.length > 0) {
      return this.fail(
        request, executionId, startedAt, startTime, 0,
        new RuntimeError(
          `Input validation failed: ${validationErrors.join('; ')}`,
          'VALIDATION_ERROR', false,
          request.connectorId, request.operation, executionId,
          undefined, { validationErrors },
        ),
      );
    }

    try {
      const data = await op.execute(request.input, request.context, request.abortSignal ?? new AbortController().signal);
      return this.success(request, executionId, startedAt, startTime, data, 1);
    } catch (e) {
      const error = this.toRuntimeError(e, request.connectorId, request.operation, executionId, userAbortSignal);
      return this.fail(request, executionId, startedAt, startTime, 1, error);
    }
  }

  private success(
    request: ConnectorOperationRequest,
    executionId: string,
    startedAt: string,
    startTime: number,
    data: unknown,
    attempts: number,
  ): ConnectorOperationResult {
    return {
      success: true,
      data,
      error: null,
      connectorId: request.connectorId,
      operation: request.operation,
      executionId,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      attempts,
      traceId: request.context.traceId,
      metadata: request.context.metadata,
    };
  }

  private fail(
    request: ConnectorOperationRequest,
    executionId: string,
    startedAt: string,
    startTime: number,
    attempts: number,
    error: ConnectorRuntimeError,
  ): ConnectorOperationResult {
    return {
      success: false,
      data: null,
      error,
      connectorId: request.connectorId,
      operation: request.operation,
      executionId,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      attempts,
      traceId: request.context.traceId,
      metadata: request.context.metadata,
    };
  }

  private toRuntimeError(
    e: unknown,
    connectorId: ConnectorId,
    operation: string,
    executionId: string,
    userAbortSignal?: AbortSignal,
  ): ConnectorRuntimeError {
    if (e instanceof RuntimeError) return e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      if (userAbortSignal?.aborted) {
        return new RuntimeError('Operation was cancelled', 'CANCELLED_ERROR', false, connectorId, operation, executionId);
      }
      return new RuntimeError('Operation timed out', 'TIMEOUT_ERROR', false, connectorId, operation, executionId);
    }
    if (e instanceof Error) {
      return new RuntimeError(e.message, 'PROVIDER_ERROR', true, connectorId, operation, executionId, e);
    }
    return new RuntimeError('Unknown error', 'INTERNAL_ERROR', false, connectorId, operation, executionId);
  }
}

export { ConnectorNotFoundError };
export type { ConnectorOperation, ConnectorOperationRequest, ConnectorOperationResult, ConnectorExecutionContext };
