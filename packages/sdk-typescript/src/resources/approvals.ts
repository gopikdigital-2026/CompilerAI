import type { HttpTransport, RequestOptions } from '../transport/HttpTransport';
import type { ApprovalResponse, ApprovalDecisionRequest, ListApprovalsParams, PaginatedResponse } from '../types';

export class ApprovalsResource {
  constructor(private readonly transport: HttpTransport) {}

  list(params?: ListApprovalsParams, opts?: { signal?: AbortSignal }): Promise<PaginatedResponse<ApprovalResponse>> {
    const query: Record<string, string | number | boolean | undefined> = {};
    if (params?.executionId) query.executionId = params.executionId;
    if (params?.status) query.status = params.status;
    if (params?.limit) query.limit = params.limit;
    if (params?.cursor) query.cursor = params.cursor;

    const reqOpts: RequestOptions = {
      method: 'GET',
      path: '/approvals',
      query: Object.keys(query).length > 0 ? query : undefined,
      signal: opts?.signal,
    };
    return this.transport.requestPaginated<ApprovalResponse>(reqOpts);
  }

  get(approvalId: string, opts?: { signal?: AbortSignal }): Promise<ApprovalResponse> {
    return this.transport.request<ApprovalResponse>({
      method: 'GET',
      path: `/approvals/${encodeURIComponent(approvalId)}`,
      signal: opts?.signal,
    });
  }

  approve(approvalId: string, body: ApprovalDecisionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ApprovalResponse> {
    return this.transport.request<ApprovalResponse>({
      method: 'POST',
      path: `/approvals/${encodeURIComponent(approvalId)}/approve`,
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  reject(approvalId: string, body: ApprovalDecisionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ApprovalResponse> {
    return this.transport.request<ApprovalResponse>({
      method: 'POST',
      path: `/approvals/${encodeURIComponent(approvalId)}/reject`,
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }

  requestChanges(approvalId: string, body: ApprovalDecisionRequest, opts?: { idempotencyKey?: string; signal?: AbortSignal }): Promise<ApprovalResponse> {
    return this.transport.request<ApprovalResponse>({
      method: 'POST',
      path: `/approvals/${encodeURIComponent(approvalId)}/request-changes`,
      body,
      idempotencyKey: opts?.idempotencyKey,
      signal: opts?.signal,
    });
  }
}
