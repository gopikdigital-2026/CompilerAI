import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { AutoLayout } from '../src/canvas/AutoLayout.js';
import { CanvasViewport } from '../src/canvas/CanvasViewport.js';
import { CanvasPerformance } from '../src/canvas/CanvasPerformance.js';
import { VisualSimulation } from '../src/simulation/VisualSimulation.js';
import { NodeRegistry } from '../src/designer/NodeRegistry.js';
import { WorkflowValidator } from '../src/designer/WorkflowValidator.js';
import { ConnectorNodeLibrary } from '../src/node-library/ConnectorNodeLibrary.js';
import { PropertyInspector } from '../src/inspector/PropertyInspector.js';
import { VersionManager } from '../src/versioning/VersionManager.js';
import {
  generateLargeWorkflow,
  generateBranchedWorkflow,
  buildWorkflow,
  buildWorkflowWithVersions,
  makeIdGenerator,
  fixedClock,
  createMinimalWorkflow,
} from './sprint28-helpers.js';
import type { Workflow } from '../src/models/WorkflowDefinition.js';

describe('Performance tests', () => {
  let largeWf: Workflow;
  let largeNodes: ReturnType<typeof generateLargeWorkflow>['nodes'];
  let largeConns: ReturnType<typeof generateLargeWorkflow>['connections'];

  before(() => {
    const { nodes, connections } = generateLargeWorkflow(500);
    largeNodes = nodes;
    largeConns = connections;
    largeWf = buildWorkflow(nodes, connections);
  });

  it('Generate 500 nodes and 499 edges (linear chain)', () => {
    assert.equal(largeNodes.length, 500);
    assert.equal(largeConns.length, 499);
    // Verify structure: first is trigger, last is end.
    assert.equal(largeNodes[0]!.type, 'trigger');
    assert.equal(largeNodes[499]!.type, 'end');
  });

  it('AutoLayout 500 nodes completes under 200ms', () => {
    const layout = new AutoLayout();
    const layoutNodes = largeNodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = largeConns.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = layout.layout(layoutNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `AutoLayout 500 nodes took ${elapsed}ms, expected < 200ms`);
    assert.equal(result.nodes.length, 500);
  });

  it('CanvasViewport.getVisibleNodes 500 nodes under 50ms', () => {
    const vp = new CanvasViewport();
    const positioned = largeNodes.map((n) => ({
      id: n.id,
      positionX: n.positionX,
      positionY: n.positionY,
    }));
    const start = Date.now();
    const result = vp.getVisibleNodes(positioned);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 50, `getVisibleNodes 500 nodes took ${elapsed}ms, expected < 50ms`);
    assert.equal(result.totalCount, 500);
  });

  it('CanvasPerformance.virtualize 500 nodes under 20ms', () => {
    const positioned = largeNodes.map((n) => ({
      id: n.id,
      positionX: n.positionX,
      positionY: n.positionY,
    }));
    const viewport = { x: 0, y: 0, zoom: 1, width: 1200, height: 800 };
    const start = Date.now();
    CanvasPerformance.virtualize(positioned, viewport, 200, 80);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 20, `virtualize 500 nodes took ${elapsed}ms, expected < 20ms`);
  });

  it('CanvasPerformance.batchValidate 500 nodes under 100ms', () => {
    const typedNodes = largeNodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = largeConns.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = CanvasPerformance.batchValidate(typedNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `batchValidate 500 nodes took ${elapsed}ms, expected < 100ms`);
    assert.ok(!result.cycles);
  });

  it('VisualSimulation.simulate 500 nodes under 500ms', () => {
    const sim = new VisualSimulation();
    const start = Date.now();
    const result = sim.simulate(largeWf);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `simulate 500 nodes took ${elapsed}ms, expected < 500ms`);
    assert.equal(result.nodes.length, 500);
  });

  it('WorkflowValidator.validate 500 nodes under 200ms', () => {
    const registry = new NodeRegistry();
    const validator = new WorkflowValidator(registry);
    const start = Date.now();
    const result = validator.validate(largeWf);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `validate 500 nodes took ${elapsed}ms, expected < 200ms`);
    // The workflow should be valid (trigger → chain → end).
    assert.ok(result.valid, `Expected valid workflow: ${result.errors.join('; ')}`);
  });

  it('CanvasPerformance.estimateMemory for 500 nodes > 0', () => {
    const mem = CanvasPerformance.estimateMemory(500, 499);
    assert.ok(mem > 0);
    // 500 * 1.2 + 499 * 0.3 = 600 + 149.7 = 750 (rounded)
    assert.ok(mem >= 700);
  });

  it('CanvasPerformance.checkPerformance with 500 nodes', () => {
    const metrics = {
      nodeCount: 500,
      edgeCount: 499,
      visibleNodeCount: 100,
      renderTimeMs: 30,
      layoutTimeMs: 50,
      validationTimeMs: 40,
      memoryEstimateKB: CanvasPerformance.estimateMemory(500, 499),
    };
    const result = CanvasPerformance.checkPerformance(metrics);
    // With virtualization (visibleNodeCount < nodeCount) and good times, should be acceptable.
    assert.ok(result.acceptable);
  });

  it('1000 nodes layout performance', () => {
    const { nodes, connections } = generateLargeWorkflow(1000);
    const layout = new AutoLayout();
    const layoutNodes = nodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = connections.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = layout.layout(layoutNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 400, `layout 1000 nodes took ${elapsed}ms, expected < 400ms`);
    assert.equal(result.nodes.length, 1000);
  });

  it('500 nodes with parallel branches (not just linear)', () => {
    // 10 branches × 50 chain length = 500+ nodes
    const { nodes, connections } = generateBranchedWorkflow(10, 49);
    // 10 branches × 49 nodes + 1 trigger + 1 end = 492... let's verify.
    assert.ok(nodes.length >= 490, `Expected ~500 nodes, got ${nodes.length}`);
    const layout = new AutoLayout();
    const layoutNodes = nodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = connections.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const start = Date.now();
    const result = layout.layout(layoutNodes, edges);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `branched layout took ${elapsed}ms, expected < 200ms`);
    assert.equal(result.nodes.length, nodes.length);
  });

  it('Node search across 26 definitions is fast', () => {
    const lib = new ConnectorNodeLibrary();
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      lib.search('gmail');
    }
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `1000 searches took ${elapsed}ms, expected < 100ms`);
  });

  it('Inspector inspect for node in 500-node workflow', () => {
    const registry = new NodeRegistry();
    const lib = new ConnectorNodeLibrary();
    const inspector = new PropertyInspector(registry, lib);
    // Pick a node in the middle of the chain.
    const targetNode = largeNodes[250]!;
    const start = Date.now();
    const result = inspector.inspect(targetNode, largeConns, largeNodes);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `inspect in 500-node workflow took ${elapsed}ms, expected < 100ms`);
    assert.equal(result.nodeId, targetNode.id);
  });

  it('VersionManager diff for 500-node workflow', () => {
    const vm = new VersionManager(makeIdGenerator(), fixedClock());
    // Build a versioned workflow with 2 versions of the 500-node chain.
    const { nodes: v1Nodes, connections: v1Conns } = generateLargeWorkflow(500);
    const { nodes: v2Nodes, connections: v2Conns } = generateLargeWorkflow(500);
    // Make v2 slightly different: change the label of node 250.
    v2Nodes[250]! = { ...v2Nodes[250]!, label: 'Modified Step' };
    const wf = buildWorkflowWithVersions([
      { version: 1, nodes: v1Nodes, connections: v1Conns },
      { version: 2, nodes: v2Nodes, connections: v2Conns },
    ]);
    const start = Date.now();
    const d = vm.diff(wf, 1, 2);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `diff 500-node workflow took ${elapsed}ms, expected < 200ms`);
    assert.ok(d.modifiedNodes.length > 0);
  });

  it('CanvasPerformance.measure reports duration for 500-node layout', () => {
    const layout = new AutoLayout();
    const layoutNodes = largeNodes.map((n) => ({ id: n.id, type: n.type as string }));
    const edges = largeConns.map((c) => ({ from: c.fromNodeId, to: c.toNodeId }));
    const { durationMs } = CanvasPerformance.measure(() => layout.layout(layoutNodes, edges));
    assert.ok(typeof durationMs === 'number');
    assert.ok(durationMs >= 0);
  });

  it('Simulate 500-node workflow with timeline is performant', () => {
    const sim = new VisualSimulation();
    const start = Date.now();
    const timeline = sim.getTimeline(largeWf, 500);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `getTimeline 500 nodes took ${elapsed}ms, expected < 200ms`);
    assert.equal(timeline.length, 500);
  });
});
