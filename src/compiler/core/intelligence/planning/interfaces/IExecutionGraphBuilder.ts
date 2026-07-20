import type { PlanNode } from '../models/PlanNode';
import type { PlanEdge } from '../models/PlanEdge';
import type { ExecutionGraph } from '../models/ExecutionGraph';

// ─── Execution Graph Builder interface ─────────────────────────────────────────
// Builds the DAG structure from nodes and edges. Contains no business rules —
// only graph algorithms: cycle detection, topological sort, parallel groups.

export interface IExecutionGraphBuilder {
  readonly id: string;

  /** Build the full execution graph from raw nodes and edges. */
  build(nodes: PlanNode[], edges: PlanEdge[]): ExecutionGraph;

  /** Detect cycles and return the first cycle found, or null. */
  detectCycle(nodes: PlanNode[], edges: PlanEdge[]): string[] | null;

  /** Compute deterministic topological order. Throws on cycle. */
  topologicalSort(nodes: PlanNode[], edges: PlanEdge[]): string[];

  /** Identify groups of nodes that can execute in parallel. */
  parallelGroups(nodes: PlanNode[], edges: PlanEdge[], topoOrder: string[]): string[][];

  /** Identify entry nodes (no incoming edges). */
  entryNodes(nodes: PlanNode[], edges: PlanEdge[]): string[];

  /** Identify terminal nodes (no outgoing edges). */
  terminalNodes(nodes: PlanNode[], edges: PlanEdge[]): string[];
}
