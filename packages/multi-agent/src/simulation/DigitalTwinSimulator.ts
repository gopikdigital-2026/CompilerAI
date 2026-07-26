import type {
  ExecutionPlan,
  IAgentRegistry,
  ISimulationEngine,
  PlannedTask,
  PolicySet,
  SimulationConflict,
  SimulationResult,
  SimulationTaskResult,
} from '../models.js';

export class DigitalTwinSimulator implements ISimulationEngine {
  simulate(plan: ExecutionPlan, registry: IAgentRegistry, policies: PolicySet): SimulationResult {
    const taskResults: SimulationTaskResult[] = [];
    const conflicts: SimulationConflict[] = [];
    const trace: string[] = [`Simulation started for workflow '${plan.id}'`];

    const agentLoad = new Map<string, number>();

    for (const task of plan.tasks) {
      trace.push(`  → Task '${task.name}' (agent: ${task.agentId}, priority: ${task.priority})`);

      const taskConflicts = this.detectConflicts(task, plan, policies, agentLoad);
      conflicts.push(...taskConflicts);

      for (const c of taskConflicts) {
        trace.push(`    ⚠ ${c.type}: ${c.description}`);
      }

      const agent = registry.get(task.agentId);
      const agentConfidence = agent?.confidence ?? 0.80;
      const conflictPenalty = taskConflicts.filter((c) => c.severity === 'error').length * 0.15;
      const approvalPenalty = task.approval.required ? 0.05 : 0;
      const successProb = Math.max(0.3, Math.min(0.98, agentConfidence - conflictPenalty - approvalPenalty));

      taskResults.push({
        taskId: task.id,
        agentId: task.agentId,
        estimatedCost: task.estimatedCost,
        estimatedDurationMs: task.estimatedDurationMs,
        successProbability: successProb,
        conflicts: taskConflicts,
      });

      agentLoad.set(task.agentId, (agentLoad.get(task.agentId) ?? 0) + 1);
      trace.push(`    ✓ Success probability: ${(successProb * 100).toFixed(1)}%`);
    }

    const errorConflicts = conflicts.filter((c) => c.severity === 'error');
    const overallSuccess = errorConflicts.length === 0;
    const avgSuccess = taskResults.reduce((sum, r) => sum + r.successProbability, 0) / Math.max(1, taskResults.length);
    const totalCost = taskResults.reduce((sum, r) => sum + r.estimatedCost, 0);
    const totalDuration = taskResults.reduce((sum, r) => sum + r.estimatedDurationMs, 0);

    trace.push(`Simulation completed: ${overallSuccess ? 'SUCCESS' : 'CONFLICTS DETECTED'}`);
    trace.push(`  Total cost: ${totalCost.toFixed(2)}, Total duration: ${totalDuration}ms`);
    trace.push(`  Overall success probability: ${(avgSuccess * 100).toFixed(1)}%`);

    return {
      workflowId: plan.id,
      success: overallSuccess,
      overallSuccessProbability: avgSuccess,
      totalEstimatedCost: totalCost,
      totalEstimatedDurationMs: totalDuration,
      taskResults,
      conflicts,
      workflowTrace: trace,
    };
  }

  private detectConflicts(
    task: PlannedTask,
    plan: ExecutionPlan,
    policies: PolicySet,
    agentLoad: Map<string, number>,
  ): SimulationConflict[] {
    const conflicts: SimulationConflict[] = [];

    // Resource conflict: same agent assigned to multiple parallel tasks
    if ((agentLoad.get(task.agentId) ?? 0) >= 1) {
      const parallelTasks = plan.tasks.filter(
        (t) => t.agentId === task.agentId && t.id !== task.id && !t.dependencies.some((d) => d.taskId === task.id),
      );
      if (parallelTasks.length > 0) {
        conflicts.push({
          type: 'resource_conflict',
          taskId: task.id,
          description: `Agent '${task.agentId}' is assigned to multiple tasks that may run in parallel`,
          severity: 'warning',
        });
      }
    }

    // Dependency conflict: circular or missing dependencies
    for (const dep of task.dependencies) {
      if (dep.taskId === task.id) {
        conflicts.push({
          type: 'dependency_conflict',
          taskId: task.id,
          description: `Task '${task.id}' depends on itself`,
          severity: 'error',
        });
      }
      const depTask = plan.tasks.find((t) => t.id === dep.taskId);
      if (!depTask) {
        conflicts.push({
          type: 'dependency_conflict',
          taskId: task.id,
          description: `Task '${task.id}' depends on non-existent task '${dep.taskId}'`,
          severity: 'error',
        });
      }
    }

    // Policy violation: agent not authorized
    if (!policies.authorizedAgents.includes(task.agentId)) {
      conflicts.push({
        type: 'policy_violation',
        taskId: task.id,
        description: `Agent '${task.agentId}' is not authorized by policy`,
        severity: 'error',
      });
    }

    // Policy violation: cost exceeds limit
    if (task.estimatedCost > policies.maxCostPerWorkflow) {
      conflicts.push({
        type: 'policy_violation',
        taskId: task.id,
        description: `Task cost ${task.estimatedCost.toFixed(2)} exceeds maximum per-workflow cost ${policies.maxCostPerWorkflow.toFixed(2)}`,
        severity: 'error',
      });
    }

    // Approval blocked: approval required but reason not in policy
    if (task.approval.required && !policies.requireApprovalFor.includes(task.approval.reason)) {
      conflicts.push({
        type: 'approval_blocked',
        taskId: task.id,
        description: `Task '${task.name}' requires approval for '${task.approval.reason}' which is not configured in policies`,
        severity: 'warning',
      });
    }

    return conflicts;
  }
}
