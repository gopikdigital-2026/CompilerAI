// ─── ApprovalPolicyEvaluator ────────────────────────────────────────────────────

import type { IApprovalPolicyEvaluator } from '../interfaces/RuntimeInterfaces';
import type { WorkflowDefinition } from '../models/WorkflowModels';
import type { ApprovalReason } from '../models/ApprovalModels';
import { shouldRequireApproval } from '../policies/RuntimePolicies';

export class ApprovalPolicyEvaluator implements IApprovalPolicyEvaluator {
  evaluate(
    node: WorkflowDefinition['nodes'][number],
    context: { riskLevel: string; confidenceScore: number; confidenceThreshold: number },
  ): { requiresApproval: boolean; reason: string | null } {
    const required = shouldRequireApproval(
      context.riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      context.confidenceScore,
      context.confidenceThreshold,
      node.requiresApproval,
    );

    if (!required) return { requiresApproval: false, reason: null };

    let reason: ApprovalReason = 'ORGANIZATION_POLICY';
    if (node.requiresApproval) reason = 'TOOL_REQUIRES_AUTHORIZATION';
    else if (context.riskLevel === 'HIGH' || context.riskLevel === 'CRITICAL') reason = 'RISK_THRESHOLD_EXCEEDED';
    else if (context.confidenceScore < context.confidenceThreshold) reason = 'INSUFFICIENT_CONFIDENCE';

    return { requiresApproval: true, reason };
  }
}
