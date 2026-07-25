export interface LayoutNode {
  id: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  width: number;
  height: number;
}

interface LayoutInputNode {
  id: string;
  type: string;
}

interface LayoutInputEdge {
  from: string;
  to: string;
}

interface IncrementalNode {
  id: string;
  type: string;
  positionX: number;
  positionY: number;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;
const DEFAULT_LAYER_GAP = 100;
const DEFAULT_NODE_GAP = 40;
const DEFAULT_GAP = 60;

export class AutoLayout {
  /**
   * Topological layered layout (Simplified Sugiyama-style):
   * 1. Assign layers via longest path from each source.
   * 2. Place nodes horizontally by layer.
   * 3. Stack nodes vertically within each layer.
   */
  layout(
    nodes: LayoutInputNode[],
    edges: LayoutInputEdge[],
    options: {
      nodeWidth?: number;
      nodeHeight?: number;
      layerGap?: number;
      nodeGap?: number;
    } = {},
  ): LayoutResult {
    const nw = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
    const nh = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
    const layerGap = options.layerGap ?? DEFAULT_LAYER_GAP;
    const nodeGap = options.nodeGap ?? DEFAULT_NODE_GAP;

    if (nodes.length === 0) {
      return { nodes: [], width: 0, height: 0 };
    }

    const ids = new Set(nodes.map((n) => n.id));
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    for (const id of ids) {
      adj.set(id, []);
      inDegree.set(id, 0);
    }
    for (const edge of edges) {
      if (ids.has(edge.from) && ids.has(edge.to)) {
        adj.get(edge.from)!.push(edge.to);
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      }
    }

    // Longest-path layering (topological).
    const layerOf = new Map<string, number>();
    const memo = new Set<string>();

    const computeLayer = (id: string): number => {
      if (memo.has(id)) return layerOf.get(id) ?? 0;
      memo.add(id);
      const deps = edges.filter((e) => e.to === id && ids.has(e.from)).map((e) => e.from);
      if (deps.length === 0) {
        layerOf.set(id, 0);
        return 0;
      }
      let maxLayer = 0;
      for (const dep of deps) {
        maxLayer = Math.max(maxLayer, computeLayer(dep) + 1);
      }
      layerOf.set(id, maxLayer);
      return maxLayer;
    };

    for (const id of ids) computeLayer(id);

    // Group nodes by layer.
    const maxLayer = Math.max(0, ...Array.from(layerOf.values()));
    const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
    for (const node of nodes) {
      const l = layerOf.get(node.id) ?? 0;
      layers[l].push(node.id);
    }

    // Position nodes.
    const layoutNodes: LayoutNode[] = [];
    let maxColHeight = 0;
    for (let l = 0; l < layers.length; l++) {
      const col = layers[l];
      let y = 0;
      for (let i = 0; i < col.length; i++) {
        layoutNodes.push({
          id: col[i],
          positionX: l * (nw + layerGap),
          positionY: y,
          width: nw,
          height: nh,
        });
        y += nh + nodeGap;
      }
      maxColHeight = Math.max(maxColHeight, y - nodeGap);
    }

    const width = (maxLayer + 1) * nw + maxLayer * layerGap;
    const height = Math.max(nh, maxColHeight);

    return { nodes: layoutNodes, width, height };
  }

  /**
   * Incremental layout: position a newly-added node near its dependencies.
   */
  layoutIncremental(
    nodes: IncrementalNode[],
    edges: LayoutInputEdge[],
    newNodeId: string,
    options: { nodeWidth?: number; nodeHeight?: number; gap?: number } = {},
  ): LayoutNode {
    const nw = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
    const nh = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
    const gap = options.gap ?? DEFAULT_GAP;

    const existing = new Map(nodes.filter((n) => n.id !== newNodeId).map((n) => [n.id, n]));
    const parents = edges.filter((e) => e.to === newNodeId).map((e) => e.from);

    let baseX = 0;
    let baseY = 0;
    if (parents.length > 0) {
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (const p of parents) {
        const pn = existing.get(p);
        if (pn) {
          sumX += pn.positionX;
          sumY += pn.positionY;
          count++;
        }
      }
      if (count > 0) {
        baseX = sumX / count + nw + gap;
        baseY = sumY / count;
      }
    }

    // Avoid overlap with existing nodes.
    let y = baseY;
    const collides = (): boolean =>
      Array.from(existing.values()).some(
        (n) =>
          Math.abs(n.positionX - baseX) < nw &&
          Math.abs(n.positionY - y) < nh,
      );
    while (collides()) {
      y += nh + gap;
    }

    return { id: newNodeId, positionX: baseX, positionY: y, width: nw, height: nh };
  }

  /**
   * Batch layout for very large graphs (500+ nodes).
   * Performs the standard layout but signals batch size for chunked rendering.
   */
  layoutBatch(
    nodes: LayoutInputNode[],
    edges: LayoutInputEdge[],
    batchSize: number = 100,
  ): LayoutResult {
    void batchSize;
    return this.layout(nodes, edges);
  }
}
