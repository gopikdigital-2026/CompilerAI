import type { WorkflowNode, WorkflowConnection } from '../models/WorkflowModels';
import type { Workflow } from '../models/WorkflowDefinition';
import { NodeRegistry } from './NodeRegistry';
import { WorkflowValidationError } from '../errors/AutomationStudioErrors';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeErrors: Record<string, string[]>;
}

export class WorkflowValidator {
  constructor(private readonly nodeRegistry: NodeRegistry) {}

  validate(workflow: Workflow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeErrors: Record<string, string[]> = {};

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }

    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }

    const triggerNodes = workflow.nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have a trigger node');
    }
    if (triggerNodes.length > 1) {
      errors.push('Workflow can only have one trigger node');
    }

    const endNodes = workflow.nodes.filter((n) => n.type === 'end');
    if (endNodes.length === 0) {
      warnings.push('Workflow has no end node');
    }

    for (const node of workflow.nodes) {
      const nErrors: string[] = [];

      if (!this.nodeRegistry.isKnownType(node.type)) {
        nErrors.push(`Unknown node type: ${node.type}`);
      }

      const configErrors = this.nodeRegistry.validateNodeConfig(node.type, node.config);
      nErrors.push(...configErrors);

      if (node.type === 'trigger') {
        const incoming = workflow.connections.filter((c) => c.toNodeId === node.id);
        if (incoming.length > 0) {
          nErrors.push('Trigger node cannot have incoming connections');
        }
      }

      if (node.type === 'end') {
        const outgoing = workflow.connections.filter((c) => c.fromNodeId === node.id);
        if (outgoing.length > 0) {
          nErrors.push('End node cannot have outgoing connections');
        }
      }

      if (nErrors.length > 0) {
        nodeErrors[node.id] = nErrors;
        errors.push(...nErrors.map((e) => `[${node.label}] ${e}`));
      }
    }

    for (const conn of workflow.connections) {
      const fromNode = workflow.nodes.find((n) => n.id === conn.fromNodeId);
      const toNode = workflow.nodes.find((n) => n.id === conn.toNodeId);

      if (!fromNode) {
        errors.push(`Connection ${conn.id} references missing source node ${conn.fromNodeId}`);
        continue;
      }
      if (!toNode) {
        errors.push(`Connection ${conn.id} references missing target node ${conn.toNodeId}`);
        continue;
      }

      const connErrors = this.nodeRegistry.validateConnection(
        fromNode.type, toNode.type, conn.fromPort, conn.toPort,
      );
      for (const e of connErrors) {
        errors.push(`[${fromNode.label} → ${toNode.label}] ${e}`);
      }

      const incomingToTarget = workflow.connections.filter((c) => c.toNodeId === toNode.id);
      const targetDef = this.nodeRegistry.getDefinition(toNode.type);
      if (targetDef.maxInputs === 1 && incomingToTarget.length > 1) {
        warnings.push(`Node "${toNode.label}" has multiple inputs but only accepts 1`);
      }
    }

    const reachable = this.findReachableNodes(workflow.nodes, workflow.connections, triggerNodes[0]?.id);
    const unreachable = workflow.nodes.filter((n) => !reachable.has(n.id) && n.type !== 'trigger');
    for (const node of unreachable) {
      warnings.push(`Node "${node.label}" is unreachable from the trigger`);
    }

    const hasCycle = this.detectCycle(workflow.nodes, workflow.connections);
    if (hasCycle) {
      errors.push('Workflow contains a cycle');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      nodeErrors,
    };
  }

  assertValid(workflow: Workflow): void {
    const result = this.validate(workflow);
    if (!result.valid) {
      throw new WorkflowValidationError('Workflow validation failed', result.errors);
    }
  }

  validateNode(node: WorkflowNode, connections: WorkflowConnection[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const configErrors = this.nodeRegistry.validateNodeConfig(node.type, node.config);
    errors.push(...configErrors);

    if (node.type === 'trigger') {
      const incoming = connections.filter((c) => c.toNodeId === node.id);
      if (incoming.length > 0) {
        errors.push('Trigger node cannot have incoming connections');
      }
    }
    if (node.type === 'end') {
      const outgoing = connections.filter((c) => c.fromNodeId === node.id);
      if (outgoing.length > 0) {
        errors.push('End node cannot have outgoing connections');
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private findReachableNodes(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[],
    triggerId: string | undefined,
  ): Set<string> {
    const reachable = new Set<string>();
    if (!triggerId) return reachable;

    const queue: string[] = [triggerId];
    const adj = new Map<string, string[]>();
    for (const conn of connections) {
      const list = adj.get(conn.fromNodeId) ?? [];
      list.push(conn.toNodeId);
      adj.set(conn.fromNodeId, list);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      const neighbors = adj.get(current) ?? [];
      for (const n of neighbors) {
        if (!reachable.has(n)) queue.push(n);
      }
    }

    void nodes;
    return reachable;
  }

  private detectCycle(
    nodes: WorkflowNode[],
    connections: WorkflowConnection[],
  ): boolean {
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n.id, []);
    for (const conn of connections) {
      const list = adj.get(conn.fromNodeId);
      if (list) list.push(conn.toNodeId);
    }

    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const n of nodes) color.set(n.id, WHITE);

    const dfs = (nodeId: string): boolean => {
      color.set(nodeId, GRAY);
      const neighbors = adj.get(nodeId) ?? [];
      for (const n of neighbors) {
        const c = color.get(n);
        if (c === GRAY) return true;
        if (c === WHITE && dfs(n)) return true;
      }
      color.set(nodeId, BLACK);
      return false;
    };

    for (const n of nodes) {
      if (color.get(n.id) === WHITE) {
        if (dfs(n.id)) return true;
      }
    }
    return false;
  }
}
