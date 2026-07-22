// ─── ExecutionPolicyValidator ───────────────────────────────────────────────────
// Validates that an execution request is approved, executable, and permitted.

import type { IExecutionPolicyValidator } from '../interfaces/IExecutionEngine';
import type { ExecutionRequest } from '../models/ExecutionRequest';
import {
  isPlanApproved, isPlanExecutable, checkOrganizationMatch,
  validateRetryConfig,
} from '../policies/ExecutionPolicies';

export class ExecutionPolicyValidator implements IExecutionPolicyValidator {
  validate(request: ExecutionRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!isPlanApproved(request)) {
      errors.push(`Plan ${request.plan.planId} has not been approved (humanApproved=false).`);
    }
    if (!isPlanExecutable(request.plan)) {
      errors.push(`Plan ${request.plan.planId} is not executable (status: ${request.plan.status}, steps: ${request.plan.steps.length}).`);
    }
    if (!checkOrganizationMatch(request.plan, request.policy)) {
      errors.push(`Organization mismatch: plan org=${request.plan.organizationId}, policy org=${request.policy.organizationId}.`);
    }
    const retryErrors = validateRetryConfig({ maxRetries: request.maxRetries, baseDelayMs: 100 });
    errors.push(...retryErrors);

    return { valid: errors.length === 0, errors };
  }
}
