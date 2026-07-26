import type {
  AgentDeclaration,
  ExecutionPlan,
  IPolicyEngine,
  PolicySet,
  PolicyValidationResult,
  PolicyViolation,
} from '../models.js';

export class PolicyEngine implements IPolicyEngine {
  validatePlan(plan: ExecutionPlan, policies: PolicySet): PolicyValidationResult {
    const violations: PolicyViolation[] = [];

    if (plan.totalEstimatedCost > policies.maxCostPerWorkflow) {
      violations.push({
        rule: 'max_cost',
        description: `Estimated cost ${plan.totalEstimatedCost.toFixed(2)} exceeds maximum ${policies.maxCostPerWorkflow.toFixed(2)}`,
        severity: 'error',
      });
    }

    if (plan.totalEstimatedDurationMs > policies.maxDurationMs) {
      violations.push({
        rule: 'max_duration',
        description: `Estimated duration ${plan.totalEstimatedDurationMs}ms exceeds maximum ${policies.maxDurationMs}ms`,
        severity: 'error',
      });
    }

    for (const task of plan.tasks) {
      if (!policies.authorizedAgents.includes(task.agentId)) {
        violations.push({
          rule: 'authorized_agents',
          description: `Agent '${task.agentId}' is not authorized for task '${task.name}'`,
          severity: 'error',
        });
      }

      if (task.approval.required && !policies.requireApprovalFor.includes(task.approval.reason)) {
        violations.push({
          rule: 'approval_policy',
          description: `Task '${task.name}' requires approval for '${task.approval.reason}' but it is not in the approval-required list`,
          severity: 'warning',
        });
      }

      if (plan.tasks.filter((t) => t.id === task.id).length > 1) {
        violations.push({
          rule: 'unique_task_ids',
          description: `Duplicate task ID '${task.id}'`,
          severity: 'error',
        });
      }
    }

    const taskIds = new Set(plan.tasks.map((t) => t.id));
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        if (!taskIds.has(dep.taskId)) {
          violations.push({
            rule: 'dependency_integrity',
            description: `Task '${task.id}' depends on non-existent task '${dep.taskId}'`,
            severity: 'error',
          });
        }
      }
    }

    return { valid: violations.filter((v) => v.severity === 'error').length === 0, violations };
  }

  validateAgent(agent: AgentDeclaration, policies: PolicySet): PolicyValidationResult {
    const violations: PolicyViolation[] = [];

    if (!policies.authorizedAgents.includes(agent.id)) {
      violations.push({
        rule: 'authorized_agents',
        description: `Agent '${agent.id}' is not in the authorized agents list`,
        severity: 'error',
      });
    }

    const unauthorizedConnectors = agent.connectors.filter((c) => !policies.authorizedConnectors.includes(c));
    if (unauthorizedConnectors.length > 0) {
      violations.push({
        rule: 'authorized_connectors',
        description: `Agent '${agent.id}' uses unauthorized connectors: ${unauthorizedConnectors.join(', ')}`,
        severity: 'error',
      });
    }

    return { valid: violations.filter((v) => v.severity === 'error').length === 0, violations };
  }

  validateOperation(operation: string, policies: PolicySet): PolicyValidationResult {
    const violations: PolicyViolation[] = [];

    if (policies.restrictedOperations.includes(operation)) {
      violations.push({
        rule: 'restricted_operations',
        description: `Operation '${operation}' is restricted`,
        severity: 'error',
      });
    }

    return { valid: violations.length === 0, violations };
  }

  isWithinExecutionWindow(date: Date, policies: PolicySet): boolean {
    if (policies.executionWindows.length === 0) return true;
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    return policies.executionWindows.some((w) =>
      hour >= w.startHour && hour < w.endHour && w.daysOfWeek.includes(day),
    );
  }
}
