// ─── WorkflowResumeManager ──────────────────────────────────────────────────────
// Handles pause/resume of workflow executions via checkpoints and resume tokens.

import type { IWorkflowResumeManager, WorkflowRunContext } from '../interfaces/RuntimeInterfaces';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { WorkflowDefinition, WorkflowExecution, WorkflowStepExecution } from '../models/WorkflowModels';
import type { RuntimeCheckpoint, ResumeToken } from '../models/CheckpointModels';
import type { NodeExecutionState } from '../models/RuntimeModels';
import { validateCheckpointCompatibility, validateResumeToken } from '../policies/RuntimePolicies';
import { CheckpointIncompatibleError, ResumeTokenExpiredError, ResumeTokenConsumedError } from '../errors/RuntimeErrors';

export class WorkflowResumeManager implements IWorkflowResumeManager {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  resume(
    execution: RuntimeExecution,
    definition: WorkflowDefinition,
    checkpoint: RuntimeCheckpoint,
    context: WorkflowRunContext,
  ): Promise<WorkflowExecution> {
    // Validate checkpoint compatibility
    if (!validateCheckpointCompatibility(checkpoint, definition.contentHash)) {
      throw new CheckpointIncompatibleError(checkpoint.checkpointId, definition.contentHash, checkpoint.contentHash);
    }

    // Rebuild execution state from checkpoint
    const completedNodeIds = new Set(checkpoint.completedNodeIds);

    // Find the existing workflow execution or create a new one
    const existingWfExec = execution.workflowExecution;
    const steps: WorkflowStepExecution[] = definition.nodes.map(node => {
      const isCompleted = completedNodeIds.has(node.nodeId);
      return {
        stepId: this.idGenerator(),
        nodeId: node.nodeId,
        nodeType: node.type,
        state: (isCompleted ? 'COMPLETED' : 'PENDING') as NodeExecutionState,
        startedAt: isCompleted ? checkpoint.timestamp : null,
        completedAt: isCompleted ? checkpoint.timestamp : null,
        output: isCompleted ? { resumed: true } : null,
        error: null,
        attempts: isCompleted ? 1 : 0,
        compensated: false,
      };
    });

    const wfExec: WorkflowExecution = {
      workflowExecutionId: existingWfExec?.workflowExecutionId ?? this.idGenerator(),
      workflowId: definition.workflowId,
      organizationId: execution.organizationId,
      runtimeExecutionId: execution.executionId,
      status: 'RESUMING',
      steps,
      completedStepIds: Array.from(completedNodeIds),
      failedStepIds: [],
      currentStepIndex: completedNodeIds.size,
      startedAt: existingWfExec?.startedAt ?? this.clock(),
      completedAt: null,
    };

    // Resume from the next uncompleted node
    const startIndex = definition.nodes.findIndex(n => !completedNodeIds.has(n.nodeId));
    if (startIndex === -1) {
      // All nodes completed — nothing to resume
      wfExec.status = 'COMPLETED';
      wfExec.completedAt = this.clock();
      return Promise.resolve(wfExec);
    }

    // Execute remaining nodes (simplified — delegates to the runner pattern)
    const remainingNodes = definition.nodes.slice(startIndex);
    const newlyCompleted = new Set(completedNodeIds);

    for (let i = 0; i < remainingNodes.length; i++) {
      const node = remainingNodes[i];
      const stepIdx = startIndex + i;
      const step = steps[stepIdx];

      const depsMet = node.dependsOn.every(dep => newlyCompleted.has(dep));
      if (!depsMet) {
        step.state = 'SKIPPED';
        continue;
      }

      step.state = 'RUNNING';
      step.startedAt = this.clock();
      step.attempts = 1;

      try {
        step.state = 'COMPLETED';
        step.completedAt = this.clock();
        step.output = { nodeType: node.type, label: node.label, resumed: true };
        newlyCompleted.add(node.nodeId);
        wfExec.completedStepIds.push(node.nodeId);

        // Create new checkpoint
        const cp: RuntimeCheckpoint = {
          checkpointId: this.idGenerator(),
          executionId: execution.executionId,
          organizationId: execution.organizationId,
          stage: node.nodeId,
          contentHash: definition.contentHash,
          state: { completedNodeIds: Array.from(newlyCompleted) },
          completedNodeIds: Array.from(newlyCompleted),
          timestamp: this.clock(),
        };
        execution.checkpoints.push(cp);
        context.checkpoints.push(cp);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        step.state = 'FAILED';
        step.error = errorMsg;
        wfExec.failedStepIds.push(node.nodeId);
        wfExec.status = 'FAILED';
        wfExec.completedAt = this.clock();
        return Promise.resolve(wfExec);
      }
    }

    if (wfExec.failedStepIds.length === 0) wfExec.status = 'COMPLETED';
    else if (wfExec.completedStepIds.length > 0) wfExec.status = 'PARTIAL';
    else wfExec.status = 'FAILED';

    wfExec.completedAt = this.clock();
    wfExec.currentStepIndex = definition.nodes.length;
    return Promise.resolve(wfExec);
  }

  createResumeToken(executionId: string, organizationId: string, checkpoint: RuntimeCheckpoint): ResumeToken {
    return {
      tokenId: this.idGenerator(),
      executionId,
      organizationId,
      checkpointId: checkpoint.checkpointId,
      contentHash: checkpoint.contentHash,
      createdAt: this.clock(),
      expiresAt: null,
      consumed: false,
    };
  }

  validateToken(token: ResumeToken, currentContentHash: string): void {
    const now = this.clock();
    const result = validateResumeToken(token, currentContentHash, now);
    if (!result.valid) {
      if (result.error === 'Token already consumed.') throw new ResumeTokenConsumedError(token.tokenId);
      if (result.error === 'Token expired.') throw new ResumeTokenExpiredError(token.tokenId);
      throw new CheckpointIncompatibleError(token.tokenId, currentContentHash, token.contentHash);
    }
  }
}
