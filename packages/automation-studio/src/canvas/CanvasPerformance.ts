import type { ViewportState } from './CanvasViewport.js';

export interface PerformanceMetrics {
  nodeCount: number;
  edgeCount: number;
  visibleNodeCount: number;
  renderTimeMs: number;
  layoutTimeMs: number;
  validationTimeMs: number;
  memoryEstimateKB: number;
}

interface PositionedNode {
  id: string;
  positionX: number;
  positionY: number;
}

interface TypedNode {
  id: string;
  type: string;
}

interface Edge {
  from: string;
  to: string;
}

export class CanvasPerformance {
  /**
   * Virtualization: return only visible node IDs based on viewport.
   */
  static virtualize(
    nodes: PositionedNode[],
    viewport: ViewportState,
    nodeWidth: number,
    nodeHeight: number,
  ): string[] {
    const viewMinX = (0 - viewport.x) / viewport.zoom;
    const viewMinY = (0 - viewport.y) / viewport.zoom;
    const viewMaxX = (viewport.width - viewport.x) / viewport.zoom;
    const viewMaxY = (viewport.height - viewport.y) / viewport.zoom;

    const visible: string[] = [];
    for (const node of nodes) {
      const nx = node.positionX;
      const ny = node.positionY;
      const overlaps =
        nx < viewMaxX && nx + nodeWidth > viewMinX && ny < viewMaxY && ny + nodeHeight > viewMinY;
      if (overlaps) visible.push(node.id);
    }
    return visible;
  }

  /**
   * Batch validation for large workflows. Detects cycles and orphan nodes.
   */
  static batchValidate(
    nodes: TypedNode[],
    edges: Edge[],
    batchSize: number = 100,
  ): { cycles: boolean; orphans: string[]; durationMs: number } {
    const start = Date.now();
    const ids = new Set(nodes.map((n) => n.id));

    // Orphan detection: nodes with no incoming and no outgoing edges,
    // excluding that orphans here means fully disconnected nodes.
    const hasEdge = new Set<string>();
    for (const e of edges) {
      if (ids.has(e.from) && ids.has(e.to)) {
        hasEdge.add(e.from);
        hasEdge.add(e.to);
      }
    }
    const orphans = nodes.filter((n) => !hasEdge.has(n.id)).map((n) => n.id);

    // Cycle detection (iterative DFS, color-marking) chunked by batchSize.
    const adj = new Map<string, string[]>();
    for (const id of ids) adj.set(id, []);
    for (const e of edges) {
      if (ids.has(e.from) && ids.has(e.to)) adj.get(e.from)!.push(e.to);
    }

    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    for (const id of ids) color.set(id, WHITE);

    let cycles = false;
    const stack: Array<{ id: string; idx: number }> = [];

    const allIds = Array.from(ids);
    outer: for (let i = 0; i < allIds.length; i++) {
      if (i % batchSize === 0 && i > 0) {
        // Yield opportunity marker — purely logical chunking.
      }
      if (color.get(allIds[i]) !== WHITE) continue;
      stack.push({ id: allIds[i], idx: 0 });
      color.set(allIds[i], GRAY);
      while (stack.length > 0) {
        const top = stack[stack.length - 1];
        const neighbors = adj.get(top.id) ?? [];
        if (top.idx >= neighbors.length) {
          color.set(top.id, BLACK);
          stack.pop();
          continue;
        }
        const next = neighbors[top.idx];
        top.idx++;
        const c = color.get(next) ?? WHITE;
        if (c === GRAY) {
          cycles = true;
          break outer;
        }
        if (c === WHITE) {
          color.set(next, GRAY);
          stack.push({ id: next, idx: 0 });
        }
      }
    }

    return { cycles, orphans, durationMs: Date.now() - start };
  }

  /**
   * Measure execution duration of a function.
   */
  static measure<T>(fn: () => T): { result: T; durationMs: number } {
    const start = Date.now();
    const result = fn();
    return { result, durationMs: Date.now() - start };
  }

  /**
   * Estimate memory usage in KB based on node/edge counts.
   */
  static estimateMemory(nodeCount: number, edgeCount: number): number {
    // Rough heuristic: ~1.2KB per node, ~0.3KB per edge.
    return Math.round(nodeCount * 1.2 + edgeCount * 0.3);
  }

  /**
   * Check whether performance metrics are within acceptable thresholds.
   */
  static checkPerformance(
    metrics: PerformanceMetrics,
  ): { acceptable: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let acceptable = true;

    if (metrics.renderTimeMs > 100) {
      warnings.push(`Render time ${metrics.renderTimeMs}ms exceeds 100ms threshold`);
      acceptable = false;
    }
    if (metrics.layoutTimeMs > 200) {
      warnings.push(`Layout time ${metrics.layoutTimeMs}ms exceeds 200ms threshold`);
      acceptable = false;
    }
    if (metrics.validationTimeMs > 150) {
      warnings.push(`Validation time ${metrics.validationTimeMs}ms exceeds 150ms threshold`);
      acceptable = false;
    }
    if (metrics.memoryEstimateKB > 1024) {
      warnings.push(`Memory estimate ${metrics.memoryEstimateKB}KB exceeds 1MB threshold`);
      acceptable = false;
    }
    if (metrics.visibleNodeCount > 200) {
      warnings.push(`Visible node count ${metrics.visibleNodeCount} exceeds 200`);
      acceptable = false;
    }
    if (metrics.nodeCount > 500 && metrics.visibleNodeCount === metrics.nodeCount) {
      warnings.push('Large workflow is not using virtualization');
    }

    return { acceptable, warnings };
  }
}
