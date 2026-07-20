import type { IExecutionGraphBuilder } from '../interfaces/IExecutionGraphBuilder';
import type { PlanNode } from '../models/PlanNode';
import type { PlanEdge } from '../models/PlanEdge';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import { CircularDependencyError } from '../errors/CircularDependencyError';
import { groupParallelNodes } from '../rules/ParallelizationRules';

// ─── Execution Graph Builder ──────────────────────────────────────────────────
// Builds the DAG structure from nodes and edges. Contains no business rules —
// only graph algorithms: cycle detection, topological sort, parallel groups.

export class ExecutionGraphBuilder implements IExecutionGraphBuilder {
  readonly id = 'execution-graph-builder-v1';

  build(nodes: PlanNode[], edges: PlanEdge[]): ExecutionGraph {
    const cycle = this.detectCycle(nodes, edges);
    if (cycle) throw new CircularDependencyError(cycle);

    const topologicalOrder = this.topologicalSort(nodes, edges);
    const entryNodeIds = this.entryNodes(nodes, edges);
    const terminalNodeIds = this.terminalNodes(nodes, edges);

    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const dependents = this.buildDependentsMap(edges);
    const parallelGroups = groupParallelNodes(topologicalOrder, nodeMap, dependents);

    return { nodes, edges, entryNodeIds, terminalNodeIds, parallelGroups, topologicalOrder };
  }

  detectCycle(nodes: PlanNode[], edges: PlanEdge[]): string[] | null {
    const adjacency = this.buildAdjacency(edges);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    for (const node of nodes) {
      const cycle = this.dfsCycle(node.nodeId, adjacency, visited, recursionStack, path);
      if (cycle) return cycle;
    }
    return null;
  }

  topologicalSort(nodes: PlanNode[], edges: PlanEdge[]): string[] {
    const cycle = this.detectCycle(nodes, edges);
    if (cycle) throw new CircularDependencyError(cycle);

    const inDegree = new Map<string, number>();
    const adjacency = this.buildAdjacency(edges);

    for (const node of nodes) inDegree.set(node.nodeId, 0);
    for (const edge of edges) {
      inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
    }

    // Use a sorted queue for deterministic output.
    const queue = nodes
      .map(n => n.nodeId)
      .filter(id => (inDegree.get(id) ?? 0) === 0)
      .sort();

    const order: string[] = [];
    const processed = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (processed.has(current)) continue;
      processed.add(current);
      order.push(current);

      const neighbors = (adjacency.get(current) ?? [])
        .filter(id => !processed.has(id))
        .sort();

      for (const neighbor of neighbors) {
        inDegree.set(neighbor, (inDegree.get(neighbor) ?? 1) - 1);
        if ((inDegree.get(neighbor) ?? 0) === 0) {
          queue.push(neighbor);
        }
      }

      // Re-sort for determinism
      queue.sort();
    }

    return order;
  }

  parallelGroups(nodes: PlanNode[], edges: PlanEdge[], topoOrder: string[]): string[][] {
    const nodeMap = new Map(nodes.map(n => [n.nodeId, n]));
    const dependents = this.buildDependentsMap(edges);
    return groupParallelNodes(topoOrder, nodeMap, dependents);
  }

  entryNodes(nodes: PlanNode[], edges: PlanEdge[]): string[] {
    const hasIncoming = new Set(edges.map(e => e.targetNodeId));
    return nodes.map(n => n.nodeId).filter(id => !hasIncoming.has(id)).sort();
  }

  terminalNodes(nodes: PlanNode[], edges: PlanEdge[]): string[] {
    const hasOutgoing = new Set(edges.map(e => e.sourceNodeId));
    return nodes.map(n => n.nodeId).filter(id => !hasOutgoing.has(id)).sort();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildAdjacency(edges: PlanEdge[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const edge of edges) {
      const list = map.get(edge.sourceNodeId) ?? [];
      list.push(edge.targetNodeId);
      map.set(edge.sourceNodeId, list);
    }
    return map;
  }

  private buildDependentsMap(edges: PlanEdge[]): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    for (const edge of edges) {
      const set = map.get(edge.targetNodeId) ?? new Set<string>();
      set.add(edge.sourceNodeId);
      map.set(edge.targetNodeId, set);
    }
    return map;
  }

  private dfsCycle(
    nodeId: string,
    adjacency: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
  ): string[] | null {
    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      return [...path.slice(cycleStart), nodeId];
    }
    if (visited.has(nodeId)) return null;

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = (adjacency.get(nodeId) ?? []).sort();
    for (const neighbor of neighbors) {
      const cycle = this.dfsCycle(neighbor, adjacency, visited, recursionStack, path);
      if (cycle) return cycle;
    }

    recursionStack.delete(nodeId);
    path.pop();
    return null;
  }
}
