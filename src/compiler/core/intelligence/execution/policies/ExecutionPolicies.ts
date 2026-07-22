// ─── Execution policies ─────────────────────────────────────────────────────────
// Business rules governing execution approval, permissions, and rollback.

import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ToolPolicy } from '../../tools/models/ToolPolicy';
import type { ExecutionRequest } from '../models/ExecutionRequest';
import type { ToolPlanStatus } from '../../tools/models/ToolExecutionPlan';

/** Policy: only approved plans with humanApproved=true can execute. */
export function isPlanApproved(request: ExecutionRequest): boolean {
  return request.humanApproved === true;
}

/** Policy: plan status must be READY or PARTIAL — not BLOCKED or EMPTY. */
export function isPlanExecutable(plan: ToolExecutionPlan): boolean {
  const allowed: ToolPlanStatus[] = ['READY', 'PARTIAL'];
  return allowed.includes(plan.status) && plan.steps.length > 0;
}

/** Policy: check organization matches between plan and policy. */
export function checkOrganizationMatch(plan: ToolExecutionPlan, policy: ToolPolicy): boolean {
  return plan.organizationId === policy.organizationId;
}

/** Policy: determine if rollback should be triggered for a partial failure. */
export function shouldTriggerRollback(
  completedSteps: number,
  failedSteps: number,
  allowRollback: boolean,
): boolean {
  return allowRollback && failedSteps > 0 && completedSteps > 0;
}

/** Policy: compute deterministic idempotency key for a step. */
export function computeIdempotencyKey(prefix: string, planId: string, stepId: string): string {
  return `${prefix}:${planId}:${stepId}`;
}

/** Policy: validate retry config. */
export function validateRetryConfig(config: { maxRetries: number; baseDelayMs: number }): string[] {
  const errors: string[] = [];
  if (config.maxRetries < 0) errors.push('maxRetries must be >= 0.');
  if (config.baseDelayMs < 0) errors.push('baseDelayMs must be >= 0.');
  return errors;
}

/** Policy: determine final execution state from step results. */
export function deriveExecutionState(
  total: number,
  completed: number,
  failed: number,
  cancelled: number,
): 'COMPLETED' | 'FAILED' | 'PARTIAL' | 'CANCELLED' {
  if (cancelled > 0 && completed === 0) return 'CANCELLED';
  if (failed === 0 && completed === total) return 'COMPLETED';
  if (failed > 0 && completed > 0) return 'PARTIAL';
  if (failed > 0 && completed === 0) return 'FAILED';
  return 'PARTIAL';
}
