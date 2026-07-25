export interface ViewportState {
  x: number; // pan offset X
  y: number; // pan offset Y
  zoom: number; // 0.1 to 3.0
  width: number; // canvas width
  height: number; // canvas height
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface VisibleNodesResult {
  visibleNodeIds: string[];
  totalCount: number;
  visibleCount: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

interface PositionedNode {
  id: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export class CanvasViewport {
  state: ViewportState;

  constructor(initial?: Partial<ViewportState>) {
    this.state = {
      x: initial?.x ?? 0,
      y: initial?.y ?? 0,
      zoom: initial?.zoom ?? DEFAULT_ZOOM,
      width: initial?.width ?? 1200,
      height: initial?.height ?? 800,
    };
  }

  // --- Zoom -----------------------------------------------------------------

  zoomIn(factor: number = 1.2): void {
    this.state.zoom = clampZoom(this.state.zoom * factor);
  }

  zoomOut(factor: number = 1.2): void {
    this.state.zoom = clampZoom(this.state.zoom / factor);
  }

  setZoom(zoom: number): void {
    this.state.zoom = clampZoom(zoom);
  }

  resetZoom(): void {
    this.state.zoom = DEFAULT_ZOOM;
  }

  // --- Pan ------------------------------------------------------------------

  pan(dx: number, dy: number): void {
    this.state.x += dx;
    this.state.y += dy;
  }

  panTo(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  center(): void {
    this.state.x = 0;
    this.state.y = 0;
  }

  // --- Fit ------------------------------------------------------------------

  fitToContent(
    nodes: Array<{ id: string; positionX: number; positionY: number }>,
    padding: number = 80,
  ): void {
    if (nodes.length === 0) {
      this.center();
      this.resetZoom();
      return;
    }

    const bounds = this.getContentBounds(nodes);
    const contentWidth = bounds.maxX - bounds.minX + padding * 2;
    const contentHeight = bounds.maxY - bounds.minY + padding * 2;

    const zoomX = this.state.width / contentWidth;
    const zoomY = this.state.height / contentHeight;
    this.state.zoom = clampZoom(Math.min(zoomX, zoomY));

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    this.state.x = this.state.width / 2 - cx * this.state.zoom;
    this.state.y = this.state.height / 2 - cy * this.state.zoom;
  }

  // --- Coordinate conversion ------------------------------------------------

  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.state.x) / this.state.zoom,
      y: (screenY - this.state.y) / this.state.zoom,
    };
  }

  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    return {
      x: canvasX * this.state.zoom + this.state.x,
      y: canvasY * this.state.zoom + this.state.y,
    };
  }

  // --- Visibility / virtualization ------------------------------------------

  getVisibleNodes(
    nodes: PositionedNode[],
    nodeWidth: number = 200,
    nodeHeight: number = 80,
  ): VisibleNodesResult {
    const visible: string[] = [];
    const { x, y, zoom, width, height } = this.state;
    const viewMinX = (0 - x) / zoom;
    const viewMinY = (0 - y) / zoom;
    const viewMaxX = (width - x) / zoom;
    const viewMaxY = (height - y) / zoom;

    for (const node of nodes) {
      const nw = node.width ?? nodeWidth;
      const nh = node.height ?? nodeHeight;
      const nx = node.positionX;
      const ny = node.positionY;
      const overlaps =
        nx < viewMaxX && nx + nw > viewMinX && ny < viewMaxY && ny + nh > viewMinY;
      if (overlaps) visible.push(node.id);
    }

    return {
      visibleNodeIds: visible,
      totalCount: nodes.length,
      visibleCount: visible.length,
    };
  }

  // --- Bounding box ---------------------------------------------------------

  getContentBounds(
    nodes: Array<{ positionX: number; positionY: number; width?: number; height?: number }>,
  ): BoundingBox {
    if (nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
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
    return { minX, minY, maxX, maxY };
  }

  // --- Focus a single node --------------------------------------------------

  focusNode(
    node: { positionX: number; positionY: number; width?: number; height?: number },
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const w = node.width ?? 200;
    const h = node.height ?? 80;
    this.state.zoom = clampZoom(Math.min(viewportWidth / (w * 3), viewportHeight / (h * 3)));
    const cx = node.positionX + w / 2;
    const cy = node.positionY + h / 2;
    this.state.x = viewportWidth / 2 - cx * this.state.zoom;
    this.state.y = viewportHeight / 2 - cy * this.state.zoom;
  }
}
