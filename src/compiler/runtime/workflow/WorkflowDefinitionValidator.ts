// ─── WorkflowDefinitionValidator ────────────────────────────────────────────────

import type { IWorkflowDefinitionValidator } from '../interfaces/RuntimeInterfaces';
import type { WorkflowDefinition } from '../models/WorkflowModels';
import { validateWorkflowDefinition, computeContentHash } from '../policies/RuntimePolicies';

export class WorkflowDefinitionValidator implements IWorkflowDefinitionValidator {
  validate(definition: WorkflowDefinition): { valid: boolean; errors: string[] } {
    const errors = validateWorkflowDefinition(definition);

    // Validate content hash
    const computedHash = computeContentHash(definition);
    if (definition.contentHash && definition.contentHash !== computedHash) {
      errors.push('Content hash mismatch — workflow may have been tampered with.');
    }

    // Validate edges reference valid nodes
    const nodeIds = new Set(definition.nodes.map(n => n.nodeId));
    for (const edge of definition.edges) {
      if (!nodeIds.has(edge.sourceNodeId)) errors.push(`Edge ${edge.edgeId} references unknown source: ${edge.sourceNodeId}.`);
      if (!nodeIds.has(edge.targetNodeId)) errors.push(`Edge ${edge.edgeId} references unknown target: ${edge.targetNodeId}.`);
    }

    return { valid: errors.length === 0, errors };
  }
}
