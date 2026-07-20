// ─── Parallelization rules ──────────────────────────────────────────────────────
// Pure rules for determining which nodes can run in parallel.

import type { PlanNode } from '../models/PlanNode';

export function canParallelize(node: PlanNode): boolean {
  return node.canRunInParallel && node.type !== 'FINAL_SYNTHESIS' && node.type !== 'HUMAN_APPROVAL';
}

export function groupParallelNodes(
  topoOrder: string[],
  nodes: Map<string, PlanNode>,
  _dependents: Map<string, Set<string>>,
): string[][] {
  const groups: string[][] = [];
  const completed = new Set<string>();
  let remaining = [...topoOrder];

  while (remaining.length > 0) {
    // Find all nodes whose dependencies are all satisfied.
    const ready = remaining.filter(id => {
      const deps = nodes.get(id)?.dependencies ?? [];
      return deps.every(d => completed.has(d));
    });

    if (ready.length === 0) break;

    // Among ready nodes, identify those that can run in parallel.
    const parallelReady = ready.filter(id => {
      const node = nodes.get(id);
      return node ? canParallelize(node) : false;
    });

    if (parallelReady.length > 1) {
      groups.push([...parallelReady].sort());
    }

    // Mark ALL ready nodes as completed — parallel and sequential alike —
    // so the next wave of dependents can proceed.
    for (const id of ready) completed.add(id);
    remaining = remaining.filter(id => !completed.has(id));
  }

  return groups;
}
