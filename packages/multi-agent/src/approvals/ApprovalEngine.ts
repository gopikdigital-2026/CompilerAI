import type { ApprovalRequest, ApprovalState, IApprovalEngine } from '../models.js';

const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000;

export class ApprovalEngine implements IApprovalEngine {
  private readonly requests = new Map<string, ApprovalRequest>();
  private counter = 0;

  request(
    input: Omit<ApprovalRequest, 'id' | 'state' | 'requestedAt' | 'expiresAt'>,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): ApprovalRequest {
    const id = `approval-${++this.counter}`;
    const now = new Date();
    const approval: ApprovalRequest = {
      ...input,
      id,
      state: 'pending',
      requestedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + timeoutMs).toISOString(),
    };
    this.requests.set(id, approval);
    return approval;
  }

  approve(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest {
    const approval = this.requests.get(approvalId);
    if (!approval) throw new Error(`Approval '${approvalId}' not found`);
    if (approval.state !== 'pending') throw new Error(`Approval '${approvalId}' is already ${approval.state}`);
    const updated: ApprovalRequest = {
      ...approval,
      state: 'approved' as ApprovalState,
      decidedAt: new Date().toISOString(),
      decidedBy,
      reason,
    };
    this.requests.set(approvalId, updated);
    return updated;
  }

  reject(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest {
    const approval = this.requests.get(approvalId);
    if (!approval) throw new Error(`Approval '${approvalId}' not found`);
    if (approval.state !== 'pending') throw new Error(`Approval '${approvalId}' is already ${approval.state}`);
    const updated: ApprovalRequest = {
      ...approval,
      state: 'rejected' as ApprovalState,
      decidedAt: new Date().toISOString(),
      decidedBy,
      reason,
    };
    this.requests.set(approvalId, updated);
    return updated;
  }

  get(approvalId: string): ApprovalRequest | undefined {
    return this.requests.get(approvalId);
  }

  getPending(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((a) => a.state === 'pending');
  }

  expireOverdue(): ApprovalRequest[] {
    const now = new Date();
    const expired: ApprovalRequest[] = [];
    for (const [id, approval] of this.requests) {
      if (approval.state === 'pending' && new Date(approval.expiresAt) < now) {
        const updated: ApprovalRequest = {
          ...approval,
          state: 'expired' as ApprovalState,
          decidedAt: now.toISOString(),
        };
        this.requests.set(id, updated);
        expired.push(updated);
      }
    }
    return expired;
  }
}
