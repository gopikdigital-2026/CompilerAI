import type { HttpTransport, RequestOptions } from '../transport/HttpTransport';
import type {
  CreateExecutionRequest,
  ExecutionResponse,
  ExecutionResultResponse,
  ResumeExecutionRequest,
  CancelExecutionRequest,
  PauseExecutionRequest,
  TelemetryEvent,
  ExecutionTrace,
} from '../types';

export interface CreateExecutionOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
  requestId?: string;
  correlationId?: string;
}

export class ExecutionsResource {
  constructor(private readonly transport: HttpTransport) {}

  create(body: CreateExecutionRequest, opts?: CreateExecutionOptions): Promise<ExecutionResponse> {
    const idemKey = body.idempotencyKey ?? opts?.idempotencyKey;
    if (!idemKey) {
      throw new Error('executions.create: idempotencyKey is required (either in body or options)');
    }
    const reqOpts: RequestOptions = {
      method: 'POST',
      path: '/executions',
      body,
      idempotencyKey: idemKey,
      signal: opts?.signal,
      requestId: opts?.requestId,
      correlationId: opts?.correlationId,
    };
    return this.transport.request<ExecutionResponse>(reqOpts);
  }

  get(executionId: string, opts?: { signal?: AbortSignal; requestId?: string }): Promise<ExecutionResponse> {
    return this.transport.request<ExecutionResponse>({
      method: 'GET',
      path: `/executions/${encodeURIComponent(executionId)}`,
      signal: opts?.signal,
      requestId: opts?.requestId,
    });
  }

  getResult(executionId: string, opts?: { signal?: AbortSignal; requestId?: string }): Promise<ExecutionResultResponse> {
    return this.transport.request<ExecutionResultResponse>({
      method: 'GET',
      path: `/executions/${encodeURIComponent(executionId)}/result`,
      signal: opts?.signal,
      requestId: opts?.requestId,
    });
  }

  pause(executionId: string, body?: PauseExecutionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ExecutionResponse> {
    return this.transport.request<ExecutionResponse>({
      method: 'POST',
      path: `/executions/${encodeURIComponent(executionId)}/pause`,
      body: body ?? {},
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  resume(executionId: string, body: ResumeExecutionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ExecutionResponse> {
    return this.transport.request<ExecutionResponse>({
      method: 'POST',
      path: `/executions/${encodeURIComponent(executionId)}/resume`,
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  cancel(executionId: string, body?: CancelExecutionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ExecutionResponse> {
    return this.transport.request<ExecutionResponse>({
      method: 'POST',
      path: `/executions/${encodeURIComponent(executionId)}/cancel`,
      body: body ?? { reason: 'No reason provided' },
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  getEvents(executionId: string, opts?: { signal?: AbortSignal; requestId?: string }): Promise<TelemetryEvent[]> {
    return this.transport.request<TelemetryEvent[]>({
      method: 'GET',
      path: `/executions/${encodeURIComponent(executionId)}/events`,
      signal: opts?.signal,
      requestId: opts?.requestId,
    });
  }

  getTrace(executionId: string, opts?: { signal?: AbortSignal; requestId?: string }): Promise<ExecutionTrace> {
    return this.transport.request<ExecutionTrace>({
      method: 'GET',
      path: `/executions/${encodeURIComponent(executionId)}/trace`,
      signal: opts?.signal,
      requestId: opts?.requestId,
    });
  }
}
