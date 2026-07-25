import type { ViewportState } from './CanvasViewport.js';

export interface MiniMapNode {
  id: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  type: string; // for coloring
}

export interface MiniMapData {
  nodes: MiniMapNode[];
  viewport: { x: number; y: number; width: number; height: number }; // normalized
  width: number; // original canvas content width
  height: number; // original canvas content height
}

interface MiniMapInputNode {
  id: string;
  positionX: number;
  positionY: number;
  type: string;
  width?: number;
  height?: number;
}

const DEFAULT_MAP_WIDTH = 200;
const DEFAULT_MAP_HEIGHT = 150;

export class MiniMap {
  generate(
    nodes: MiniMapInputNode[],
    viewport: ViewportState,
    mapWidth: number = DEFAULT_MAP_WIDTH,
    mapHeight: number = DEFAULT_MAP_HEIGHT,
  ): MiniMapData {
    if (nodes.length === 0) {
      return {
        nodes: [],
        viewport: { x: 0, y: 0, width: 1, height: 1 },
        width: mapWidth,
        height: mapHeight,
      };
    }

    // Compute content bounds
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of nodes) {
      const w = node.width ?? 200;
      const h = node.height ?? 80;
      minX = Math.min(minX, node.positionX);
      minY = Math.min(minY, node.positionY);
      maxX = Math.max(maxX, node.positionX + w);
      maxY = Math.max(maxY, node.positionY + h);
    }

    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);

    const miniNodes: MiniMapNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      x: (node.positionX - minX) / contentWidth,
      y: (node.positionY - minY) / contentHeight,
    }));

    // Viewport in canvas coordinates: top-left (viewMinX, viewMinY) and size.
    const viewMinX = (0 - viewport.x) / viewport.zoom;
    const viewMinY = (0 - viewport.y) / viewport.zoom;
    const viewW = viewport.width / viewport.zoom;
    const viewH = viewport.height / viewport.zoom;

    const vp = {
      x: Math.max(0, Math.min(1, (viewMinX - minX) / contentWidth)),
      y: Math.max(0, Math.min(1, (viewMinY - minY) / contentHeight)),
      width: Math.max(0, Math.min(1, viewW / contentWidth)),
      height: Math.max(0, Math.min(1, viewH / contentHeight)),
    };

    return {
      nodes: miniNodes,
      viewport: vp,
      width: contentWidth,
      height: contentHeight,
    };
  }
}
