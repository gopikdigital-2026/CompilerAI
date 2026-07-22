import type { HttpTransport, RequestOptions } from '../transport/HttpTransport';
import type {
  CreateWorkflowRequest,
  WorkflowResponse,
  WorkflowValidationResponse,
  ActivateVersionResponse,
  DeactivateResponse,
} from '../types';

export class WorkflowsResource {
  constructor(private readonly transport: HttpTransport) {}

  create(body: CreateWorkflowRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<WorkflowResponse> {
    return this.transport.request<WorkflowResponse>({
      method: 'POST',
      path: '/workflows',
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  list(opts?: { signal?: AbortSignal }): Promise<WorkflowResponse[]> {
    return this.transport.request<WorkflowResponse[]>({
      method: 'GET',
      path: '/workflows',
      signal: opts?.signal,
    });
  }

  get(workflowId: string, opts?: { signal?: AbortSignal }): Promise<WorkflowResponse> {
    return this.transport.request<WorkflowResponse>({
      method: 'GET',
      path: `/workflows/${encodeURIComponent(workflowId)}`,
      signal: opts?.signal,
    });
  }

  validate(body: CreateWorkflowRequest, opts?: { signal?: AbortSignal }): Promise<WorkflowValidationResponse> {
    return this.transport.request<WorkflowValidationResponse>({
      method: 'POST',
      path: '/workflows/validate',
      body,
      signal: opts?.signal,
    });
  }

  createVersion(workflowId: string, body: CreateWorkflowRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<WorkflowResponse> {
    return this.transport.request<WorkflowResponse>({
      method: 'POST',
      path: `/workflows/${encodeURIComponent(workflowId)}/versions`,
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  activateVersion(workflowId: string, version: string, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ActivateVersionResponse> {
    return this.transport.request<ActivateVersionResponse>({
      method: 'POST',
      path: `/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(version)}/activate`,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  deactivate(workflowId: string, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<DeactivateResponse> {
    return this.transport.request<DeactivateResponse>({
      method: 'POST',
      path: `/workflows/${encodeURIComponent(workflowId)}/deactivate`,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }
}
