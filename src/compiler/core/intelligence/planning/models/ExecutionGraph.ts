// ─── Execution graph ──────────────────────────────────────────────────────────
// The DAG structure: nodes, edges, and computed structural properties.

import type { PlanNode } from './PlanNode';
import type { PlanEdge } from './PlanEdge';

export interface ExecutionGraph {
  nodes:             PlanNode[];
  edges:             PlanEdge[];
  /** Node ids with no incoming edges. */
  entryNodeIds:      string[];
  /** Node ids with no outgoing edges. */
  terminalNodeIds:   string[];
  /** Groups of node ids that can execute in parallel. */
  parallelGroups:    string[][];
  /** Deterministic topological order of node ids. */
  topologicalOrder:  string[];
}
