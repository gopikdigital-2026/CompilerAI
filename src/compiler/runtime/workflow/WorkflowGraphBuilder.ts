// ─── WorkflowGraphBuilder ───────────────────────────────────────────────────────
// Builds a workflow definition from a runtime request — the standard CompilerAI pipeline.

import type { IWorkflowGraphBuilder } from '../interfaces/RuntimeInterfaces';
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../models/WorkflowModels';
import type { RuntimeRequest } from '../models/RuntimeRequest';
import { computeContentHash } from '../policies/RuntimePolicies';

const VERSION = '1.0.0';

function makeNode(
  nodeId: string, type: WorkflowNode['type'], label: string, order: number,
  dependsOn: string[] = [], requiresApproval = false,
): WorkflowNode {
  return {
    nodeId, type, label, order, config: {}, dependsOn,
    condition: null, branches: [], requiresApproval,
    maxRetries: 2, timeoutMs: 30_000,
  };
}

export class WorkflowGraphBuilder implements IWorkflowGraphBuilder {
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  buildFromRequest(request: RuntimeRequest): WorkflowDefinition {
    return this.buildDefaultPipeline(request.organizationId);
  }

  buildDefaultPipeline(organizationId: string): WorkflowDefinition {
    const nodes: WorkflowNode[] = [
      makeNode('n-intelligence', 'INTELLIGENCE', 'Intelligence Pipeline', 1, []),
      makeNode('n-memory-read', 'MEMORY_READ', 'Memory Retrieval', 2, ['n-intelligence']),
      makeNode('n-tool-selection', 'TOOL_SELECTION', 'Tool Intelligence', 3, ['n-intelligence']),
      makeNode('n-human-approval', 'HUMAN_APPROVAL', 'Human Approval Gate', 4, ['n-tool-selection'], true),
      makeNode('n-execution', 'TOOL_EXECUTION', 'Tool Execution', 5, ['n-human-approval']),
      makeNode('n-memory-write', 'MEMORY_WRITE', 'Memory Consolidation', 6, ['n-execution']),
      makeNode('n-learning', 'LEARNING', 'Learning', 7, ['n-memory-write']),
      makeNode('n-finalization', 'FINALIZATION', 'Finalization', 8, ['n-learning']),
    ];

    const edges: WorkflowEdge[] = nodes.slice(1).map((node, i) => ({
      edgeId: `e-${i}`,
      sourceNodeId: nodes[i].nodeId,
      targetNodeId: node.nodeId,
      condition: null,
    }));

    const def: WorkflowDefinition = {
      workflowId: 'wf-default-pipeline',
      organizationId,
      name: 'Default CompilerAI Pipeline',
      description: 'Standard end-to-end intelligence → execution → learning pipeline.',
      nodes, edges, mode: 'SEQUENTIAL',
      version: VERSION,
      createdAt: this.clock(),
      contentHash: '', // computed below
    };
    def.contentHash = computeContentHash(def);
    return def;
  }
}
