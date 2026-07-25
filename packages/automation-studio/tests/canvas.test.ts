import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasViewport } from '../src/canvas/CanvasViewport.js';
import { CanvasSelection } from '../src/canvas/CanvasSelection.js';
import { MiniMap } from '../src/canvas/MiniMap.js';
import { AutoLayout } from '../src/canvas/AutoLayout.js';
import { CanvasPerformance } from '../src/canvas/CanvasPerformance.js';
import { generateLargeWorkflow, generateBranchedWorkflow } from './sprint28-helpers.js';

// ---------------------------------------------------------------------------
// CanvasViewport
// ---------------------------------------------------------------------------

describe('CanvasViewport', () => {
  let vp: CanvasViewport;

  beforeEach(() => {
    vp = new CanvasViewport();
  });

  it('default state has x=0, y=0, zoom=1', () => {
    assert.equal(vp.state.x, 0);
    assert.equal(vp.state.y, 0);
    assert.equal(vp.state.zoom, 1);
  });

  it('zoomIn increases zoom by 1.2x', () => {
    vp.zoomIn();
    assert.equal(vp.state.zoom, 1.2);
  });

  it('zoomOut decreases zoom by 1.2x', () => {
    vp.zoomOut();
    assert.ok(Math.abs(vp.state.zoom - 1 / 1.2) < 1e-10);
  });

  it('setZoom clamps to [0.1, 3.0]', () => {
    vp.setZoom(2.5);
    assert.equal(vp.state.zoom, 2.5);
  });

  it('zoom below 0.1 clamped to 0.1', () => {
    vp.setZoom(0.01);
    assert.equal(vp.state.zoom, 0.1);
  });

  it('zoom above 3.0 clamped to 3.0', () => {
    vp.setZoom(5);
    assert.equal(vp.state.zoom, 3.0);
  });

  it('resetZoom sets zoom to 1', () => {
    vp.setZoom(2.5);
    vp.resetZoom();
    assert.equal(vp.state.zoom, 1);
  });

  it('pan changes x and y', () => {
    vp.pan(10, 20);
    assert.equal(vp.state.x, 10);
    assert.equal(vp.state.y, 20);
  });

  it('panTo sets x and y directly', () => {
    vp.panTo(100, 200);
    assert.equal(vp.state.x, 100);
    assert.equal(vp.state.y, 200);
  });

  it('center resets pan to 0,0', () => {
    vp.panTo(100, 200);
    vp.center();
    assert.equal(vp.state.x, 0);
    assert.equal(vp.state.y, 0);
  });

  it('fitToContent adjusts zoom and pan to fit all nodes', () => {
    const nodes = [
      { id: 'n1', positionX: 0, positionY: 0 },
      { id: 'n2', positionX: 500, positionY: 300 },
    ];
    vp.fitToContent(nodes);
    assert.ok(vp.state.zoom > 0 && vp.state.zoom <= 3.0);
    // The content should be centered.
    assert.ok(vp.state.x !== 0 || vp.state.y !== 0);
  });

  it('fitToContent with empty nodes resets to center and zoom 1', () => {
    vp.fitToContent([]);
    assert.equal(vp.state.x, 0);
    assert.equal(vp.state.y, 0);
    assert.equal(vp.state.zoom, 1);
  });

  it('screenToCanvas converts correctly', () => {
    vp.panTo(100, 50);
    vp.setZoom(2);
    const { x, y } = vp.screenToCanvas(300, 250);
    assert.equal(x, (300 - 100) / 2);
    assert.equal(y, (250 - 50) / 2);
  });

  it('canvasToScreen converts correctly', () => {
    vp.panTo(100, 50);
    vp.setZoom(2);
    const { x, y } = vp.canvasToScreen(50, 75);
    assert.equal(x, 50 * 2 + 100);
    assert.equal(y, 75 * 2 + 50);
  });

  it('screenToCanvas and canvasToScreen are inverses', () => {
    vp.panTo(120, 80);
    vp.setZoom(1.5);
    const canvas = { x: 42, y: 99 };
    const screen = vp.canvasToScreen(canvas.x, canvas.y);
    const back = vp.screenToCanvas(screen.x, screen.y);
    assert.ok(Math.abs(back.x - canvas.x) < 1e-9);
    assert.ok(Math.abs(back.y - canvas.y) < 1e-9);
  });

  it('getVisibleNodes returns only nodes within viewport', () => {
    vp.panTo(0, 0);
    vp.setZoom(1);
    const nodes = [
      { id: 'in1', positionX: 10, positionY: 10 },
      { id: 'in2', positionX: 500, positionY: 500 },
      { id: 'out1', positionX: 5000, positionY: 5000 },
      { id: 'out2', positionX: -5000, positionY: -5000 },
    ];
    const result = vp.getVisibleNodes(nodes);
    assert.ok(result.visibleNodeIds.includes('in1'));
    assert.ok(result.visibleNodeIds.includes('in2'));
    assert.ok(!result.visibleNodeIds.includes('out1'));
    assert.ok(!result.visibleNodeIds.includes('out2'));
    assert.equal(result.totalCount, 4);
    assert.equal(result.visibleCount, 2);
  });

  it('getVisibleNodes with 500+ nodes is performant (under 50ms)', () => {
    const { nodes } = generateLargeWorkflow(500);
    const positioned = nodes.map((n) => ({
      id: n.id,
      positionX: n.positionX,
      positionY: n.positionY,
    }));
    vp.panTo(0, 0);
    vp.setZoom(1);
    const start = Date.now();
    const result = vp.getVisibleNodes(positioned);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 50, `getVisibleNodes took ${elapsed}ms, expected < 50ms`);
    assert.equal(result.totalCount, 500);
  });

  it('getContentBounds returns correct bounding box', () => {
    const nodes = [
      { positionX: 10, positionY: 20 },
      { positionX: 300, positionY: 400 },
    ];
    const bounds = vp.getContentBounds(nodes);
    assert.equal(bounds.minX, 10);
    assert.equal(bounds.minY, 20);
    assert.equal(bounds.maxX, 300 + 200); // default width 200
    assert.equal(bounds.maxY, 400 + 80); // default height 80
  });

  it('getContentBounds with empty nodes returns zeros', () => {
    const bounds = vp.getContentBounds([]);
    assert.equal(bounds.minX, 0);
    assert.equal(bounds.minY, 0);
    assert.equal(bounds.maxX, 0);
    assert.equal(bounds.maxY, 0);
  });

  it('focusNode centers on a specific node', () => {
    const node = { positionX: 500, positionY: 300, width: 200, height: 80 };
    vp.focusNode(node, 1200, 800);
    assert.ok(vp.state.zoom > 0 && vp.state.zoom <= 3.0);
    // The node center should map to viewport center.
    const screenCenter = vp.canvasToScreen(500 + 100, 300 + 40);
    assert.ok(Math.abs(screenCenter.x - 600) < 5);
    assert.ok(Math.abs(screenCenter.y - 400) < 5);
  });
});

// ---------------------------------------------------------------------------
// CanvasSelection
// ---------------------------------------------------------------------------

describe('CanvasSelection', () => {
  let sel: CanvasSelection;

  beforeEach(() => {
    sel = new CanvasSelection();
  });

  it('select sets single selection', () => {
    sel.select('n1');
    assert.deepEqual(sel.getSelectedIds(), ['n1']);
  });

  it('toggleSelect adds then removes', () => {
    sel.toggleSelect('n1');
    assert.ok(sel.isSelected('n1'));
    sel.toggleSelect('n1');
    assert.ok(!sel.isSelected('n1'));
  });

  it('multiSelect replaces selection', () => {
    sel.select('n1');
    sel.multiSelect(['n2', 'n3']);
    assert.deepEqual(sel.getSelectedIds().sort(), ['n2', 'n3']);
  });

  it('addToSelection adds without clearing', () => {
    sel.select('n1');
    sel.addToSelection(['n2', 'n3']);
    assert.equal(sel.getSelectionCount(), 3);
  });

  it('clearSelection empties', () => {
    sel.select('n1');
    sel.clearSelection();
    assert.equal(sel.getSelectionCount(), 0);
  });

  it('selectAll selects all', () => {
    sel.selectAll(['n1', 'n2', 'n3']);
    assert.equal(sel.getSelectionCount(), 3);
  });

  it('invertSelection inverts', () => {
    sel.select('n1');
    sel.invertSelection(['n1', 'n2', 'n3']);
    const ids = sel.getSelectedIds().sort();
    assert.deepEqual(ids, ['n2', 'n3']);
  });

  it('isSelected checks correctly', () => {
    sel.select('n1');
    assert.ok(sel.isSelected('n1'));
    assert.ok(!sel.isSelected('n2'));
  });

  it('getSelectionCount returns count', () => {
    sel.multiSelect(['n1', 'n2']);
    assert.equal(sel.getSelectionCount(), 2);
  });

  it('hasSelection returns true when selection exists', () => {
    assert.ok(!sel.hasSelection());
    sel.select('n1');
    assert.ok(sel.hasSelection());
  });

  it('selectInBox selects nodes within rectangle', () => {
    const nodes = [
      { id: 'inside', positionX: 50, positionY: 50 },
      { id: 'outside', positionX: 500, positionY: 500 },
    ];
    sel.selectInBox(nodes, { x: 0, y: 0, width: 200, height: 200 });
    assert.deepEqual(sel.getSelectedIds(), ['inside']);
  });

  it('groupSelected creates a group', () => {
    sel.multiSelect(['n1', 'n2']);
    const group = sel.groupSelected('g1');
    assert.equal(group.groupId, 'g1');
    assert.deepEqual(group.nodeIds.sort(), ['n1', 'n2']);
    assert.ok(sel.getGroups().has('g1'));
  });

  it('ungroup removes group', () => {
    sel.multiSelect(['n1', 'n2']);
    sel.groupSelected('g1');
    sel.ungroup('g1');
    assert.ok(!sel.getGroups().has('g1'));
  });

  it('getGroups returns groups map', () => {
    sel.multiSelect(['n1']);
    sel.groupSelected('g1');
    sel.multiSelect(['n2']);
    sel.groupSelected('g2');
    const groups = sel.getGroups();
    assert.equal(groups.size, 2);
    assert.deepEqual(groups.get('g1'), ['n1']);
    assert.deepEqual(groups.get('g2'), ['n2']);
  });
});

// ---------------------------------------------------------------------------
// MiniMap
// ---------------------------------------------------------------------------

describe('MiniMap', () => {
  let mm: MiniMap;

  beforeEach(() => {
    mm = new MiniMap();
  });

  it('generate returns normalized positions (0-1)', () => {
    const nodes = [
      { id: 'n1', positionX: 0, positionY: 0, type: 'trigger' },
      { id: 'n2', positionX: 400, positionY: 300, type: 'end' },
    ];
    const data = mm.generate(nodes, { x: 0, y: 0, zoom: 1, width: 1200, height: 800 });
    for (const n of data.nodes) {
      assert.ok(n.x >= 0 && n.x <= 1, `x=${n.x} out of range`);
      assert.ok(n.y >= 0 && n.y <= 1, `y=${n.y} out of range`);
    }
  });

  it('generate returns viewport rectangle', () => {
    const nodes = [
      { id: 'n1', positionX: 0, positionY: 0, type: 'trigger' },
      { id: 'n2', positionX: 400, positionY: 300, type: 'end' },
    ];
    const data = mm.generate(nodes, { x: 0, y: 0, zoom: 1, width: 1200, height: 800 });
    assert.ok(typeof data.viewport.x === 'number');
    assert.ok(typeof data.viewport.y === 'number');
    assert.ok(typeof data.viewport.width === 'number');
    assert.ok(typeof data.viewport.height === 'number');
    assert.ok(data.viewport.width >= 0 && data.viewport.width <= 1);
    assert.ok(data.viewport.height >= 0 && data.viewport.height <= 1);
  });

  it('generate with single node', () => {
    const nodes = [{ id: 'n1', positionX: 100, positionY: 100, type: 'trigger' }];
    const data = mm.generate(nodes, { x: 0, y: 0, zoom: 1, width: 1200, height: 800 });
    assert.equal(data.nodes.length, 1);
    assert.equal(data.nodes[0]!.id, 'n1');
  });

  it('generate with empty nodes returns empty array', () => {
    const data = mm.generate([], { x: 0, y: 0, zoom: 1, width: 1200, height: 800 });
    assert.equal(data.nodes.length, 0);
    assert.equal(data.viewport.width, 1);
    assert.equal(data.viewport.height, 1);
  });

  it('generate with many nodes', () => {
    const nodes: Array<{ id: string; positionX: number; positionY: number; type: string }> = [];
    for (let i = 0; i < 100; i++) {
      nodes.push({ id: `n${i}`, positionX: i * 100, positionY: i * 50, type: 'tool' });
    }
    const data = mm.generate(nodes, { x: 0, y: 0, zoom: 1, width: 1200, height: 800 });
    assert.equal(data.nodes.length, 100);
    for (const n of data.nodes) {
      assert.ok(n.x >= 0 && n.x <= 1);
      assert.ok(n.y >= 0 && n.y <= 1);
    }
  });
});

// ---------------------------------------------------------------------------
// AutoLayout
// ---------------------------------------------------------------------------

describe('AutoLayout', () => {
  let layout: AutoLayout;

  beforeEach(() => {
    layout = new AutoLayout();
  });

  it('layout places trigger first (layer 0)', () => {
    const nodes = [
      { id: 'n1', type: 'trigger' },
      { id: 'n2', type: 'tool' },
      { id: 'n3', type: 'end' },
    ];
    const edges = [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
    ];
    const result = layout.layout(nodes, edges);
    const triggerNode = result.nodes.find((n) => n.id === 'n1');
    assert.ok(triggerNode);
    assert.equal(triggerNode!.positionX, 0); // first layer = X 0
  });

  it('layout with chain of 5 nodes has increasing X', () => {
    const nodes = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i}`,
      type: i === 0 ? 'trigger' : i === 4 ? 'end' : 'tool',
    }));
    const edges = Array.from({ length: 4 }, (_, i) => ({ from: `n${i}`, to: `n${i + 1}` }));
    const result = layout.layout(nodes, edges);
    const xs = result.nodes.map((n) => n.positionX);
    for (let i = 1; i < xs.length; i++) {
      assert.ok(xs[i]! > xs[i - 1]!, `X should increase: xs=${xs.join(',')}`);
    }
  });

  it('layout with parallel branches', () => {
    // trigger → n2, n3 (parallel) → end
    const nodes = [
      { id: 'trig', type: 'trigger' },
      { id: 'a', type: 'tool' },
      { id: 'b', type: 'tool' },
      { id: 'end', type: 'end' },
    ];
    const edges = [
      { from: 'trig', to: 'a' },
      { from: 'trig', to: 'b' },
      { from: 'a', to: 'end' },
      { from: 'b', to: 'end' },
    ];
    const result = layout.layout(nodes, edges);
    assert.equal(result.nodes.length, 4);
    // a and b should be at same layer (same X)
    const a = result.nodes.find((n) => n.id === 'a')!;
    const b = result.nodes.find((n) => n.id === 'b')!;
    assert.equal(a.positionX, b.positionX);
    assert.notEqual(a.positionY, b.positionY);
  });

  it('layout with empty nodes returns empty result', () => {
    const result = layout.layout([], []);
    assert.equal(result.nodes.length, 0);
    assert.equal(result.width, 0);
    assert.equal(result.height, 0);
  });

  it('layoutBatch with 500 nodes completes under 200ms', () => {
    const { nodes, connections } = generateLargeWorkflow(500);
    const layoutNodes = nodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = connections.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = layout.layoutBatch(layoutNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `layoutBatch took ${elapsed}ms, expected < 200ms`);
    assert.equal(result.nodes.length, 500);
  });

  it('layoutIncremental for adding a new node', () => {
    const existing = [
      { id: 'n1', type: 'trigger', positionX: 0, positionY: 0 },
      { id: 'n2', type: 'tool', positionX: 300, positionY: 0 },
    ];
    const edges = [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
    ];
    const result = layout.layoutIncremental(existing, edges, 'n3');
    assert.equal(result.id, 'n3');
    assert.ok(result.positionX > 0);
  });

  it('layoutIncremental with no parents avoids overlap', () => {
    const existing = [
      { id: 'n1', type: 'trigger', positionX: 0, positionY: 0 },
    ];
    const edges: Array<{ from: string; to: string }> = [];
    const result = layout.layoutIncremental(existing, edges, 'n2');
    assert.equal(result.id, 'n2');
    // With no parents, baseX=0 baseY=0, but collision avoidance pushes it down past n1.
    assert.equal(result.positionX, 0);
    assert.ok(result.positionY > 0, 'Should be pushed down to avoid overlap with n1');
  });
});

// ---------------------------------------------------------------------------
// CanvasPerformance
// ---------------------------------------------------------------------------

describe('CanvasPerformance', () => {
  it('virtualize returns only visible node IDs', () => {
    const nodes = [
      { id: 'vis', positionX: 10, positionY: 10 },
      { id: 'invis', positionX: 10000, positionY: 10000 },
    ];
    const viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
    const visible = CanvasPerformance.virtualize(nodes, viewport, 200, 80);
    assert.ok(visible.includes('vis'));
    assert.ok(!visible.includes('invis'));
  });

  it('virtualize with 500+ nodes is fast', () => {
    const { nodes } = generateLargeWorkflow(500);
    const positioned = nodes.map((n) => ({ id: n.id, positionX: n.positionX, positionY: n.positionY }));
    const viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
    const start = Date.now();
    CanvasPerformance.virtualize(positioned, viewport, 200, 80);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 20, `virtualize took ${elapsed}ms, expected < 20ms`);
  });

  it('batchValidate detects cycles', () => {
    const nodes = [
      { id: 'a', type: 'trigger' },
      { id: 'b', type: 'tool' },
    ];
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ];
    const result = CanvasPerformance.batchValidate(nodes, edges);
    assert.ok(result.cycles);
  });

  it('batchValidate detects no cycles in DAG', () => {
    const nodes = [
      { id: 'a', type: 'trigger' },
      { id: 'b', type: 'tool' },
      { id: 'c', type: 'end' },
    ];
    const edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
    ];
    const result = CanvasPerformance.batchValidate(nodes, edges);
    assert.ok(!result.cycles);
  });

  it('batchValidate detects orphans', () => {
    const nodes = [
      { id: 'a', type: 'trigger' },
      { id: 'b', type: 'tool' },
      { id: 'orphan', type: 'tool' },
    ];
    const edges = [{ from: 'a', to: 'b' }];
    const result = CanvasPerformance.batchValidate(nodes, edges);
    assert.ok(result.orphans.includes('orphan'));
  });

  it('batchValidate with 500 nodes completes under 100ms', () => {
    const { nodes, connections } = generateLargeWorkflow(500);
    const typedNodes = nodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = connections.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = CanvasPerformance.batchValidate(typedNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `batchValidate took ${elapsed}ms, expected < 100ms`);
    assert.ok(!result.cycles);
  });

  it('measure returns duration', () => {
    const { result, durationMs } = CanvasPerformance.measure(() => 42);
    assert.equal(result, 42);
    assert.ok(typeof durationMs === 'number');
    assert.ok(durationMs >= 0);
  });

  it('estimateMemory returns positive number', () => {
    const mem = CanvasPerformance.estimateMemory(500, 499);
    assert.ok(mem > 0);
    // 500 * 1.2 + 499 * 0.3 = 600 + 149.7 = 750 (rounded)
    assert.ok(mem >= 700);
  });

  it('checkPerformance with good metrics returns acceptable', () => {
    const metrics = {
      nodeCount: 100,
      edgeCount: 99,
      visibleNodeCount: 50,
      renderTimeMs: 10,
      layoutTimeMs: 20,
      validationTimeMs: 15,
      memoryEstimateKB: 100,
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    assert.ok(result.acceptable);
    assert.equal(result.warnings.length, 0);
  });

  it('checkPerformance with too many visible nodes warning', () => {
    const metrics = {
      nodeCount: 300,
      edgeCount: 299,
      visibleNodeCount: 250,
      renderTimeMs: 10,
      layoutTimeMs: 20,
      validationTimeMs: 15,
      memoryEstimateKB: 100,
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    assert.ok(!result.acceptable);
    assert.ok(result.warnings.some((w) => w.includes('Visible node count')));
  });

  it('checkPerformance warns when large workflow not virtualized', () => {
    const metrics = {
      nodeCount: 600,
      edgeCount: 599,
      visibleNodeCount: 600,
      renderTimeMs: 10,
      layoutTimeMs: 20,
      validationTimeMs: 15,
      memoryEstimateKB: 100,
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    assert.ok(result.warnings.some((w) => w.includes('virtualization')));
  });

  it('checkPerformance warns on high render time', () => {
    const metrics = {
      nodeCount: 10,
      edgeCount: 9,
      visibleNodeCount: 10,
      renderTimeMs: 200,
      layoutTimeMs: 20,
      validationTimeMs: 15,
      memoryEstimateKB: 100,
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    assert.ok(!result.acceptable);
    assert.ok(result.warnings.some((w) => w.includes('Render time')));
  });

  it('checkPerformance warns on high memory', () => {
    const metrics = {
      nodeCount: 10,
      edgeCount: 9,
      visibleNodeCount: 10,
      renderTimeMs: 10,
      layoutTimeMs: 20,
      validationTimeMs: 15,
      memoryEstimateKB: 2048,
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    assert.ok(!result.acceptable);
    assert.ok(result.warnings.some((w) => w.includes('Memory')));
  });
});
