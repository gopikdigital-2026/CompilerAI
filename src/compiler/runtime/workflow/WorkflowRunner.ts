// ─── WorkflowRunner ─────────────────────────────────────────────────────────────
// Executes workflow nodes sequentially or as a DAG, with checkpoints and approval gates.

import type { IWorkflowRunner, WorkflowRunContext } from '../interfaces/RuntimeInterfaces';
import type { RuntimeExecution } from '../models/RuntimeExecution';
import type { WorkflowDefinition, WorkflowExecution, WorkflowStepExecution } from '../models/WorkflowModels';
import type { RuntimeCheckpoint } from '../models/CheckpointModels';
import type { WorkflowNodeType, NodeExecutionState } from '../models/RuntimeModels';
import { computeContentHash } from '../policies/RuntimePolicies';

export class WorkflowRunner implements IWorkflowRunner {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  async run(
    execution: RuntimeExecution,
    definition: WorkflowDefinition,
    context: WorkflowRunContext,
  ): Promise<WorkflowExecution> {
    const wfExecId = this.idGenerator();
    const steps: WorkflowStepExecution[] = definition.nodes.map(node => ({
      stepId: this.idGenerator(),
      nodeId: node.nodeId,
      nodeType: node.type,
      state: 'PENDING' as NodeExecutionState,
      startedAt: null, completedAt: null, output: null, error: null, attempts: 0, compensated: false,
    }));

    const wfExec: WorkflowExecution = {
      workflowExecutionId: wfExecId,
      workflowId: definition.workflowId,
      organizationId: execution.organizationId,
      runtimeExecutionId: execution.executionId,
      status: 'RUNNING',
      steps,
      completedStepIds: [],
      failedStepIds: [],
      currentStepIndex: 0,
      startedAt: this.clock(),
      completedAt: null,
    };

        const eventBus = context.runtime;
    void eventBus;

    const completedNodeIds = new Set<string>();

    // Execute nodes in order
    for (let i = 0; i < definition.nodes.length; i++) {
      const node = definition.nodes[i];
      const step = steps[i];

      // Check if dependencies are met
      const depsMet = node.dependsOn.every(dep => completedNodeIds.has(dep));
      if (!depsMet) {
        step.state = 'SKIPPED';
        step.error = 'Dependencies not met.';
        continue;
      }

      // Emit node started event
      context.events.push(this.makeEvent('WorkflowNodeStarted', execution, node.nodeId, `Node started: ${node.label}`));

      step.state = 'RUNNING';
      step.startedAt = this.clock();
      step.attempts = 1;

      try {
        // Execute the node based on its type
        const output = await this.executeNode(node, execution, context);

        step.state = 'COMPLETED';
        step.completedAt = this.clock();
        step.output = output;
        completedNodeIds.add(node.nodeId);
        wfExec.completedStepIds.push(node.nodeId);

        context.events.push(this.makeEvent('WorkflowNodeCompleted', execution, node.nodeId, `Node completed: ${node.label}`));

        // Create checkpoint after each node
        const checkpoint = this.createCheckpoint(execution, definition, node.nodeId, completedNodeIds);
        execution.checkpoints.push(checkpoint);
        context.checkpoints.push(checkpoint);
        context.events.push(this.makeEvent('CheckpointCreated', execution, node.nodeId, `Checkpoint after: ${node.label}`, checkpoint.checkpointId));

        // Check if approval is required
        if (node.requiresApproval) {
          const approvalReq = context.approvalManager.requestApproval({
            executionId: execution.executionId,
            organizationId: execution.organizationId,
            nodeId: node.nodeId,
            nodeLabel: node.label,
            reason: 'TOOL_REQUIRES_AUTHORIZATION',
            description: `Approval required for node: ${node.label}`,
            riskLevel: 'MEDIUM',
            confidenceScore: 75,
            expiresAt: null,
          });
          context.events.push(this.makeEvent('ApprovalRequested', execution, node.nodeId, `Approval requested for: ${node.label}`, undefined, approvalReq.approvalId));

          // In a real system, the runtime would pause here and wait for approval.
          // For the simulated runtime, we auto-approve to allow the pipeline to continue.
          // The test suite can override this behavior by submitting a rejection.
          const decision = {
            decisionId: this.idGenerator(),
            approvalId: approvalReq.approvalId,
            decision: 'APPROVED' as const,
            reviewedBy: 'system-auto',
            comment: 'Auto-approved in simulated mode.',
            decidedAt: this.clock(),
            requestedChanges: [],
          };
          context.approvalManager.submitDecision(approvalReq.approvalId, decision);
          context.events.push(this.makeEvent('ApprovalReceived', execution, node.nodeId, `Approval received for: ${node.label}`, undefined, approvalReq.approvalId));
        }

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        step.state = 'FAILED';
        step.completedAt = this.clock();
        step.error = errorMsg;
        wfExec.failedStepIds.push(node.nodeId);

        context.events.push(this.makeEvent('WorkflowNodeFailed', execution, node.nodeId, `Node failed: ${node.label} — ${errorMsg}`));

        // Stop on first failure in sequential mode
        break;
      }
    }

    // Determine final status
    const allCompleted = wfExec.completedStepIds.length === definition.nodes.length;
    const someFailed = wfExec.failedStepIds.length > 0;
    const someCompleted = wfExec.completedStepIds.length > 0;

    if (allCompleted) wfExec.status = 'COMPLETED';
    else if (someFailed && someCompleted) wfExec.status = 'PARTIAL';
    else if (someFailed) wfExec.status = 'FAILED';
    else wfExec.status = 'COMPLETED';

    wfExec.completedAt = this.clock();
    wfExec.currentStepIndex = definition.nodes.length;
    return wfExec;
  }

  private async executeNode(
    node: WorkflowDefinition['nodes'][number],
    execution: RuntimeExecution,
    _context: WorkflowRunContext,
  ): Promise<Record<string, unknown>> {
    // Node execution is simulated — no real APIs.
    // Each node type produces a deterministic output descriptor.
    const nodeType = node.type as WorkflowNodeType;
    void execution;
    return {
      nodeType,
      nodeId: node.nodeId,
      label: node.label,
      simulated: true,
      timestamp: this.clock(),
    };
  }

  private createCheckpoint(
    execution: RuntimeExecution,
    definition: WorkflowDefinition,
    stage: string,
    completedNodeIds: Set<string>,
  ): RuntimeCheckpoint {
    return {
      checkpointId: this.idGenerator(),
      executionId: execution.executionId,
      organizationId: execution.organizationId,
      stage,
      contentHash: computeContentHash(definition),
      state: { completedNodeIds: Array.from(completedNodeIds) },
      completedNodeIds: Array.from(completedNodeIds),
      timestamp: this.clock(),
    };
  }

  private makeEvent(
    eventType: 'WorkflowNodeStarted' | 'WorkflowNodeCompleted' | 'WorkflowNodeFailed' | 'CheckpointCreated' | 'ApprovalRequested' | 'ApprovalReceived',
    execution: RuntimeExecution,
    nodeId: string,
    summary: string,
    checkpointId?: string,
    approvalId?: string,
  ): import('../models/RuntimeEvent').RuntimeEvent {
    return {
      eventId: this.idGenerator(),
      eventType,
      executionId: execution.executionId,
      organizationId: execution.organizationId,
      timestamp: this.clock(),
      summary,
      nodeId,
      checkpointId: checkpointId ?? null,
      approvalId: approvalId ?? null,
      metadata: {},
    };
  }
}
