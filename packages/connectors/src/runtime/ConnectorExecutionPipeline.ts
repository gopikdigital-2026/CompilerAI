import type { ConnectorOperationRequest, ConnectorOperationResult } from './ConnectorExecutionResult';
import type { ConnectorRuntimeError } from '../errors/ConnectorRuntimeError';
import { ConnectorRuntimeError as RuntimeError } from '../errors/ConnectorRuntimeError';
import { ConnectorRateLimitError } from '../errors/ConnectorRateLimitError';
import { ConnectorTimeoutError } from '../errors/ConnectorTimeoutError';
import { ConnectorCircuitOpenError } from '../errors/ConnectorCircuitOpenError';
import { ConnectorOperationExecutor } from './ConnectorOperationExecutor';
import type { IOperationRegistry } from './ConnectorOperationExecutor';
import type { ConnectorOperation } from './ConnectorExecutionResult';
import { RetryPolicy } from '../resilience/RetryPolicy';
import { ExponentialBackoff } from '../resilience/ExponentialBackoff';
import { TimeoutPolicy } from '../resilience/TimeoutPolicy';
import { CircuitBreaker } from '../resilience/CircuitBreaker';
import { RateLimiter } from '../resilience/RateLimiter';
import type { ConnectorTelemetry } from '../observability/ConnectorTelemetry';
import type { ConnectorMetrics } from '../observability/ConnectorMetrics';
import type { ConnectorTrace } from '../observability/ConnectorTrace';
import type { AuditLog } from '../observability/ConnectorAuditEvent';
import { createAuditEvent } from '../observability/ConnectorAuditEvent';

export interface PipelineConfig {
  retryPolicy?: RetryPolicy;
  backoff?: ExponentialBackoff;
  timeoutPolicy?: TimeoutPolicy;
  circuitBreaker?: CircuitBreaker;
  rateLimiter?: RateLimiter;
  enableRateLimit: boolean;
  enableCircuitBreaker: boolean;
  enableRetry: boolean;
  enableTimeout: boolean;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enableRateLimit: true,
  enableCircuitBreaker: true,
  enableRetry: true,
  enableTimeout: true,
};

export class ConnectorExecutionPipeline {
  constructor(
    private readonly executor: ConnectorOperationExecutor,
    private readonly operationRegistry: IOperationRegistry,
    private readonly retryPolicy: RetryPolicy,
    private readonly backoff: ExponentialBackoff,
    private readonly timeoutPolicy: TimeoutPolicy,
    private readonly circuitBreaker: CircuitBreaker,
    private readonly rateLimiter: RateLimiter,
    private readonly telemetry: ConnectorTelemetry,
    private readonly metrics: ConnectorMetrics,
    private readonly trace: ConnectorTrace,
    private readonly auditLog: AuditLog,
    private readonly config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
  ) {}

  async execute(request: ConnectorOperationRequest, executionId: string): Promise<ConnectorOperationResult> {
    const { connectorId, operation, context } = request;
    const { organizationId } = context;

    this.telemetry.emit({
      type: 'connector.execution.started',
      connectorId, organizationId, operation, executionId,
      timestamp: new Date().toISOString(),
      metadata: { requestId: context.requestId },
    });

    const span = this.trace.startSpan({
      traceId: context.traceId,
      parentSpanId: null,
      connectorId, organizationId, operation, executionId,
      attributes: context.metadata,
    });

    if (this.config.enableRateLimit) {
      const rateResult = this.rateLimiter.check(connectorId, organizationId, operation, context.userId);
      if (!rateResult.allowed) {
        const error = new ConnectorRateLimitError(
          connectorId, operation, executionId,
          this.rateLimiter.toRateLimitDetails(rateResult),
        );
        this.telemetry.emit({
          type: 'connector.rate_limit.exceeded',
          connectorId, organizationId, operation, executionId,
          timestamp: new Date().toISOString(),
          metadata: { limit: rateResult.limit, retryAfterMs: rateResult.retryAfterMs },
        });
        this.metrics.recordRateLimit({ connectorId, organizationId, operation });
        this.trace.endSpan(span.spanId, 'failed', { reason: 'rate_limited' });
        this.auditLog.log(createAuditEvent({
          eventType: 'rate_limit.exceeded', organizationId, userId: context.userId,
          connectorId, operation, executionId, outcome: 'denied',
          metadata: { limit: rateResult.limit },
        }));
        return this.buildFailedResult(request, executionId, error);
      }
    }

    if (this.config.enableCircuitBreaker) {
      if (!this.circuitBreaker.canExecute(connectorId, organizationId, operation)) {
        const openUntil = this.circuitBreaker.getOpenUntil(connectorId, organizationId, operation);
        const failureCount = this.circuitBreaker.getFailureCount(connectorId, organizationId, operation);
        const error = new ConnectorCircuitOpenError(
          connectorId, operation, executionId,
          { failureCount, failureThreshold: 5, openUntil: openUntil ?? new Date().toISOString() },
        );
        this.telemetry.emit({
          type: 'connector.circuit.opened',
          connectorId, organizationId, operation, executionId,
          timestamp: new Date().toISOString(),
          metadata: { failureCount, openUntil },
        });
        this.metrics.recordCircuitOpen({ connectorId, organizationId, operation });
        this.trace.endSpan(span.spanId, 'failed', { reason: 'circuit_open' });
        return this.buildFailedResult(request, executionId, error);
      }
    }

    const result = await this.executeWithRetry(request, executionId);

    if (result.success) {
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordSuccess(connectorId, organizationId, operation);
        const state = this.circuitBreaker.getState(connectorId, organizationId, operation);
        if (state === 'CLOSED') {
          // Could emit circuit.closed if transitioning from HALF_OPEN
        }
      }
      this.telemetry.emit({
        type: 'connector.execution.completed',
        connectorId, organizationId, operation, executionId,
        timestamp: new Date().toISOString(),
        metadata: { durationMs: result.durationMs, attempts: result.attempts },
      });
      this.metrics.recordExecution(
        { connectorId, organizationId, operation },
        true, result.durationMs, result.attempts, false,
      );
      this.trace.endSpan(span.spanId, 'completed', { durationMs: result.durationMs });
      this.auditLog.log(createAuditEvent({
        eventType: 'execution.completed', organizationId, userId: context.userId,
        connectorId, operation, executionId, outcome: 'success',
        metadata: { durationMs: result.durationMs, attempts: result.attempts },
      }));
    } else {
      if (result.error && this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordFailure(connectorId, organizationId, operation, result.error.errorCode);

        const state = this.circuitBreaker.getState(connectorId, organizationId, operation);
        if (state === 'OPEN') {
          this.telemetry.emit({
            type: 'connector.circuit.opened',
            connectorId, organizationId, operation, executionId,
            timestamp: new Date().toISOString(),
            metadata: { errorCode: result.error.errorCode },
          });
          this.metrics.recordCircuitOpen({ connectorId, organizationId, operation });
        }
      }
      this.telemetry.emit({
        type: 'connector.execution.failed',
        connectorId, organizationId, operation, executionId,
        timestamp: new Date().toISOString(),
        metadata: { errorCode: result.error?.errorCode, durationMs: result.durationMs, attempts: result.attempts },
      });
      this.metrics.recordExecution(
        { connectorId, organizationId, operation },
        false, result.durationMs, result.attempts,
        result.error?.errorCode === 'CANCELLED_ERROR',
      );
      this.trace.endSpan(span.spanId, 'failed', { errorCode: result.error?.errorCode });
      this.auditLog.log(createAuditEvent({
        eventType: 'execution.failed', organizationId, userId: context.userId,
        connectorId, operation, executionId, outcome: 'failure',
        metadata: { errorCode: result.error?.errorCode, durationMs: result.durationMs },
      }));
    }

    return result;
  }

  private async executeWithRetry(request: ConnectorOperationRequest, executionId: string): Promise<ConnectorOperationResult> {
    let attempt = 1;

    while (true) {
      const timeoutMs = this.config.enableTimeout
        ? this.timeoutPolicy.resolveTimeout(this.getOperationTimeout(request))
        : 0;

      let timeoutSignal: { signal: AbortSignal; timer: NodeJS.Timeout | null } | null = null;
      let combinedSignal = request.abortSignal;

      if (timeoutMs > 0) {
        timeoutSignal = this.timeoutPolicy.createAbortSignal(timeoutMs, request.abortSignal);
        combinedSignal = timeoutSignal.signal;
      }

      const requestWithSignal: ConnectorOperationRequest = { ...request, abortSignal: combinedSignal };

      try {
        const result = await this.executor.executeOperation(requestWithSignal, executionId, request.abortSignal);
        if (timeoutSignal) this.timeoutPolicy.clearTimer(timeoutSignal.timer);

        if (result.success) {
          return { ...result, attempts: attempt };
        }

        if (result.error?.errorCode === 'CANCELLED_ERROR') {
          return { ...result, attempts: attempt };
        }

        if (!this.config.enableRetry) {
          return { ...result, attempts: attempt };
        }

        const op = this.getOperation(request);
        const isIdempotent = op?.idempotent ?? false;
        const retryDecision = this.retryPolicy.shouldRetry(
          result.error!.errorCode, attempt, isIdempotent,
        );

        if (!retryDecision.shouldRetry) {
          return { ...result, attempts: attempt };
        }

        this.telemetry.emit({
          type: 'connector.execution.retried',
          connectorId: request.connectorId,
          organizationId: request.context.organizationId,
          operation: request.operation,
          executionId,
          timestamp: new Date().toISOString(),
          metadata: { attempt, nextAttempt: retryDecision.attempt, delayMs: retryDecision.delayMs, errorCode: result.error!.errorCode },
        });

        attempt = retryDecision.attempt;
        await this.backoff.sleep(attempt - 1, request.abortSignal);
        continue;
      } catch (e) {
        if (timeoutSignal) this.timeoutPolicy.clearTimer(timeoutSignal.timer);

        if (this.timeoutPolicy.isAbortError(e)) {
          if (timeoutMs > 0 && combinedSignal?.aborted && !request.abortSignal?.aborted) {
            return this.buildFailedResult(
              request, executionId,
              new ConnectorTimeoutError(request.connectorId, request.operation, executionId, timeoutMs),
            );
          }
          return this.buildFailedResult(
            request, executionId,
            new RuntimeError('Operation was cancelled', 'CANCELLED_ERROR', false, request.connectorId, request.operation, executionId),
          );
        }

        if (this.timeoutPolicy.isTimeoutError(e)) {
          return this.buildFailedResult(
            request, executionId,
            new ConnectorTimeoutError(request.connectorId, request.operation, executionId, timeoutMs),
          );
        }

        const error = e instanceof Error ? e : new Error(String(e));
        return this.buildFailedResult(
          request, executionId,
          new RuntimeError(error.message, 'PROVIDER_ERROR', true, request.connectorId, request.operation, executionId, error),
        );
      }
    }
  }

  private getOperation(request: ConnectorOperationRequest): ConnectorOperation | null {
    return this.operationRegistry.get(request.connectorId, request.operation);
  }

  private getOperationTimeout(request: ConnectorOperationRequest): number | undefined {
    const op = this.getOperation(request);
    return op?.timeoutMs;
  }

  private buildFailedResult(
    request: ConnectorOperationRequest,
    executionId: string,
    error: ConnectorRuntimeError,
  ): ConnectorOperationResult {
    return {
      success: false,
      data: null,
      error,
      connectorId: request.connectorId,
      operation: request.operation,
      executionId,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      attempts: 1,
      traceId: request.context.traceId,
      metadata: request.context.metadata,
    };
  }
}
