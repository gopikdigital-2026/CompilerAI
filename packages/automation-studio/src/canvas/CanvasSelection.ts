export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PositionedNode {
  id: string;
  positionX: number;
  positionY: number;
  width?: number;
  height?: number;
}

function rectOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export class CanvasSelection {
  private selectedIds: Set<string>;
  private readonly groups: Map<string, string[]> = new Map();

  constructor() {
    this.selectedIds = new Set<string>();
  }

  select(nodeId: string): void {
    this.selectedIds.clear();
    this.selectedIds.add(nodeId);
  }

  toggleSelect(nodeId: string): void {
    if (this.selectedIds.has(nodeId)) {
      this.selectedIds.delete(nodeId);
    } else {
      this.selectedIds.add(nodeId);
    }
  }

  multiSelect(nodeIds: string[]): void {
    this.selectedIds.clear();
    for (const id of nodeIds) this.selectedIds.add(id);
  }

  addToSelection(nodeIds: string[]): void {
    for (const id of nodeIds) this.selectedIds.add(id);
  }

  clearSelection(): void {
    this.selectedIds.clear();
  }

  selectAll(nodeIds: string[]): void {
    this.selectedIds.clear();
    for (const id of nodeIds) this.selectedIds.add(id);
  }

  invertSelection(allNodeIds: string[]): void {
    const next = new Set<string>();
    for (const id of allNodeIds) {
      if (!this.selectedIds.has(id)) next.add(id);
    }
    this.selectedIds = next;
  }

  isSelected(nodeId: string): boolean {
    return this.selectedIds.has(nodeId);
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }

  getSelectionCount(): number {
    return this.selectedIds.size;
  }

  hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  selectInBox(nodes: PositionedNode[], box: SelectionBox): void {
    this.selectedIds.clear();
    for (const node of nodes) {
      const nw = node.width ?? 200;
      const nh = node.height ?? 80;
      if (
        rectOverlap(node.positionX, node.positionY, nw, nh, box.x, box.y, box.width, box.height)
      ) {
        this.selectedIds.add(node.id);
      }
    }
  }

  // --- Group operations -----------------------------------------------------

  groupSelected(groupId: string): { groupId: string; nodeIds: string[] } {
    const ids = this.getSelectedIds();
    this.groups.set(groupId, ids);
    return { groupId, nodeIds: ids };
  }

  ungroup(groupId: string): void {
    this.groups.delete(groupId);
  }

  getGroups(): Map<string, string[]> {
    return new Map(this.groups);
  }
}
