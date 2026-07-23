import type { ConnectorOperationRequest, ConnectorOperationResult, ConnectorOperation, ConnectorExecutionContext } from './ConnectorExecutionResult';
import { ConnectorOperationExecutor, OperationRegistry } from './ConnectorOperationExecutor';
import { ConnectorExecutionPipeline, DEFAULT_PIPELINE_CONFIG } from './ConnectorExecutionPipeline';
import type { PipelineConfig } from './ConnectorExecutionPipeline';
import { RetryPolicy } from '../resilience/RetryPolicy';
import { ExponentialBackoff } from '../resilience/ExponentialBackoff';
import { TimeoutPolicy } from '../resilience/TimeoutPolicy';
import { CircuitBreaker } from '../resilience/CircuitBreaker';
import { RateLimiter } from '../resilience/RateLimiter';
import { ConnectorTelemetry } from '../observability/ConnectorTelemetry';
import { ConnectorMetrics } from '../observability/ConnectorMetrics';
import { ConnectorTrace } from '../observability/ConnectorTrace';
import { AuditLog } from '../observability/ConnectorAuditEvent';
import { ConnectorRuntimeError } from '../errors/ConnectorRuntimeError';
import type { ConnectorId } from '../types/index';

export interface ConnectorRuntimeConfig {
  retryPolicy?: RetryPolicy;
  backoff?: ExponentialBackoff;
  timeoutPolicy?: TimeoutPolicy;
  circuitBreaker?: CircuitBreaker;
  rateLimiter?: RateLimiter;
  telemetry?: ConnectorTelemetry;
  metrics?: ConnectorMetrics;
  trace?: ConnectorTrace;
  auditLog?: AuditLog;
  pipeline?: Partial<PipelineConfig>;
}

export class ConnectorRuntime {
  private readonly operationRegistry: OperationRegistry;
  private readonly executor: ConnectorOperationExecutor;
  private readonly pipeline: ConnectorExecutionPipeline;
  private readonly retryPolicy: RetryPolicy;
  private readonly backoff: ExponentialBackoff;
  private readonly timeoutPolicy: TimeoutPolicy;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly rateLimiter: RateLimiter;
  private readonly telemetry: ConnectorTelemetry;
  private readonly metrics: ConnectorMetrics;
  private readonly trace: ConnectorTrace;
  private readonly auditLog: AuditLog;
  private readonly pipelineConfig: PipelineConfig;
  private executionCounter = 0;

  constructor(config: ConnectorRuntimeConfig = {}) {
    this.retryPolicy = config.retryPolicy ?? new RetryPolicy();
    this.backoff = config.backoff ?? new ExponentialBackoff({ initialDelayMs: 50, maxDelayMs: 500 });
    this.timeoutPolicy = config.timeoutPolicy ?? new TimeoutPolicy();
    this.circuitBreaker = config.circuitBreaker ?? new CircuitBreaker();
    this.rateLimiter = config.rateLimiter ?? new RateLimiter();
    this.telemetry = config.telemetry ?? new ConnectorTelemetry();
    this.metrics = config.metrics ?? new ConnectorMetrics();
    this.trace = config.trace ?? new ConnectorTrace();
    this.auditLog = config.auditLog ?? new AuditLog();

    this.pipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config.pipeline };

    this.operationRegistry = new OperationRegistry();
    this.executor = new ConnectorOperationExecutor(this.operationRegistry);
    this.pipeline = new ConnectorExecutionPipeline(
      this.executor,
      this.operationRegistry,
      this.retryPolicy,
      this.backoff,
      this.timeoutPolicy,
      this.circuitBreaker,
      this.rateLimiter,
      this.telemetry,
      this.metrics,
      this.trace,
      this.auditLog,
      this.pipelineConfig,
    );
  }

  registerOperation(connectorId: ConnectorId, operation: ConnectorOperation): void {
    this.operationRegistry.register(connectorId, operation);
  }

  hasOperation(connectorId: ConnectorId, operationName: string): boolean {
    return this.operationRegistry.has(connectorId, operationName);
  }

  listOperations(connectorId: ConnectorId): ConnectorOperation[] {
    return this.operationRegistry.listByConnector(connectorId);
  }

  async execute(request: ConnectorOperationRequest): Promise<ConnectorOperationResult> {
    const executionId = `exec_${++this.executionCounter}_${Date.now()}`;
    return this.pipeline.execute(request, executionId);
  }

  async executeById(
    connectorId: ConnectorId,
    operation: string,
    input: Record<string, unknown>,
    context: ConnectorExecutionContext,
    abortSignal?: AbortSignal,
  ): Promise<ConnectorOperationResult> {
    return this.execute({ connectorId, operation, input, context, abortSignal });
  }

  getTelemetry(): ConnectorTelemetry {
    return this.telemetry;
  }

  getMetrics(): ConnectorMetrics {
    return this.metrics;
  }

  getTrace(): ConnectorTrace {
    return this.trace;
  }

  getAuditLog(): AuditLog {
    return this.auditLog;
  }

  getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  getRetryPolicy(): RetryPolicy {
    return this.retryPolicy;
  }

  getTimeoutPolicy(): TimeoutPolicy {
    return this.timeoutPolicy;
  }

  reset(): void {
    this.circuitBreaker.resetAll();
    this.rateLimiter.resetAll();
    this.telemetry.clear();
    this.metrics.clear();
    this.trace.clear();
    this.auditLog.clear();
    this.executionCounter = 0;
  }
}

export { ConnectorRuntimeError };
export type { ConnectorOperation, ConnectorOperationRequest, ConnectorOperationResult, ConnectorExecutionContext };
