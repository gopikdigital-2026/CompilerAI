// ─── ApprovalManager ────────────────────────────────────────────────────────────

import type { IApprovalManager } from '../interfaces/RuntimeInterfaces';
import type { ApprovalRequest, ApprovalDecision } from '../models/ApprovalModels';
import type { InMemoryApprovalRepository } from '../repositories/InMemoryRepositories';

export class ApprovalManager implements IApprovalManager {
  private readonly repository: InMemoryApprovalRepository;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(repository: InMemoryApprovalRepository, idGenerator: () => string, clock: () => string) {
    this.repository = repository;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  requestApproval(req: Omit<ApprovalRequest, 'approvalId' | 'status' | 'decision' | 'createdAt'>): ApprovalRequest {
    const approval: ApprovalRequest = {
      ...req,
      approvalId: this.idGenerator(),
      status: 'PENDING',
      decision: null,
      createdAt: this.clock(),
    };
    this.repository.save(approval);
    return approval;
  }

  submitDecision(approvalId: string, decision: ApprovalDecision): ApprovalRequest {
    const approval = this.repository.findById(approvalId);
    if (!approval) throw new Error(`Approval ${approvalId} not found.`);
    if (approval.status !== 'PENDING') throw new Error(`Approval ${approvalId} already processed.`);

    const updated: ApprovalRequest = {
      ...approval,
      status: decision.decision,
      decision,
    };
    this.repository.update(updated);
    return updated;
  }

  getApproval(approvalId: string): ApprovalRequest | null {
    return this.repository.findById(approvalId);
  }

  getPendingApprovals(organizationId: string): ApprovalRequest[] {
    return this.repository.findPending(organizationId);
  }
}
