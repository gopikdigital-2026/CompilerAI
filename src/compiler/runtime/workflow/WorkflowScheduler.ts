// ─── WorkflowScheduler ──────────────────────────────────────────────────────────
// Schedules workflow nodes — sequential or DAG (topological order with parallel groups).

import type { IWorkflowScheduler } from '../interfaces/RuntimeInterfaces';
import type { WorkflowDefinition } from '../models/WorkflowModels';

export class WorkflowScheduler implements IWorkflowScheduler {
  schedule(definition: WorkflowDefinition, mode: 'SEQUENTIAL' | 'DAG'): string[][] {
    if (mode === 'SEQUENTIAL') {
      return definition.nodes
        .slice()
        .sort((a, b) => a.order - b.order)
        .map(n => [n.nodeId]);
    }

    // DAG: topological sort with parallel grouping (Kahn's algorithm)
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();

    for (const node of definition.nodes) {
      inDegree.set(node.nodeId, node.dependsOn.length);
      for (const dep of node.dependsOn) {
        if (!dependents.has(dep)) dependents.set(dep, []);
        dependents.get(dep)!.push(node.nodeId);
      }
    }

    const groups: string[][] = [];
    let current = definition.nodes.filter(n => inDegree.get(n.nodeId) === 0).map(n => n.nodeId);

    while (current.length > 0) {
      groups.push(current);
      const next: string[] = [];
      for (const nodeId of current) {
        const deps = dependents.get(nodeId) ?? [];
        for (const dep of deps) {
          const deg = (inDegree.get(dep) ?? 0) - 1;
          inDegree.set(dep, deg);
          if (deg === 0) next.push(dep);
        }
      }
      current = next;
    }

    return groups;
  }

  getNextNodes(definition: WorkflowDefinition, completedNodeIds: Set<string>): string[] {
    const result: string[] = [];
    for (const node of definition.nodes) {
      if (completedNodeIds.has(node.nodeId)) continue;
      const allDepsMet = node.dependsOn.every(dep => completedNodeIds.has(dep));
      if (allDepsMet) result.push(node.nodeId);
    }
    return result;
  }
}
