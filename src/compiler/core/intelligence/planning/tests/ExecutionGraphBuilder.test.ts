// ─── Execution Graph Builder — unit tests ──────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/planning/tests/ExecutionGraphBuilder.test.ts

import assert from 'node:assert/strict';
import { ExecutionGraphBuilder } from '../services/ExecutionGraphBuilder';
import { CircularDependencyError } from '../errors/CircularDependencyError';
import type { PlanNode } from '../models/PlanNode';
import type { PlanEdge } from '../models/PlanEdge';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  \u2713 ${name}`); }
  catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  \u2717 ${name}\n      ${msg}`);
  }
}

function makeNode(id: string, deps: string[] = []): PlanNode {
  return {
    nodeId: id, type: 'ANALYSIS', title: id, description: '', objective: '',
    dependencies: deps, inputs: [], expectedOutputs: [],
    requiredCapabilities: [], suggestedAgentType: 'GENERAL_PURPOSE_AGENT',
    suggestedToolCategories: [], requiresHumanApproval: false,
    riskLevel: 'LOW', estimatedComplexity: 'LOW', canRunInParallel: true,
    executionPriority: 50, status: 'DRAFT', metadata: {},
  };
}

function makeEdge(src: string, tgt: string, id: string): PlanEdge {
  return { edgeId: id, sourceNodeId: src, targetNodeId: tgt, dependencyType: 'FINISH_TO_START', required: true };
}

const builder = new ExecutionGraphBuilder();

test('builds a simple linear graph', () => {
  const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
  const edges = [makeEdge('a', 'b', 'e1'), makeEdge('b', 'c', 'e2')];
  const graph = builder.build(nodes, edges);
  assert.deepEqual(graph.topologicalOrder, ['a', 'b', 'c']);
  assert.deepEqual(graph.entryNodeIds, ['a']);
  assert.deepEqual(graph.terminalNodeIds, ['c']);
});

test('detects a cycle', () => {
  const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
  const edges = [makeEdge('a', 'b', 'e1'), makeEdge('b', 'c', 'e2'), makeEdge('c', 'a', 'e3')];
  const cycle = builder.detectCycle(nodes, edges);
  assert.ok(cycle !== null, 'should detect a cycle');
  assert.ok(cycle!.length >= 3, 'cycle should contain at least 3 nodes');
});

test('throws CircularDependencyError on build with cycle', () => {
  const nodes = [makeNode('a'), makeNode('b')];
  const edges = [makeEdge('a', 'b', 'e1'), makeEdge('b', 'a', 'e2')];
  assert.throws(() => builder.build(nodes, edges), CircularDependencyError);
});

test('identifies parallel groups', () => {
  const nodes = [
    { ...makeNode('start'), canRunInParallel: false },
    { ...makeNode('p1'), canRunInParallel: true },
    { ...makeNode('p2'), canRunInParallel: true },
    { ...makeNode('end'), canRunInParallel: false },
  ];
  const edges = [
    makeEdge('start', 'p1', 'e1'),
    makeEdge('start', 'p2', 'e2'),
    makeEdge('p1', 'end', 'e3'),
    makeEdge('p2', 'end', 'e4'),
  ];
  const graph = builder.build(nodes, edges);
  assert.ok(graph.parallelGroups.length > 0, 'should identify parallel groups');
  const parallelGroup = graph.parallelGroups.find(g => g.length >= 2);
  assert.ok(parallelGroup, 'should have a group with 2+ nodes');
  assert.deepEqual(parallelGroup!.sort(), ['p1', 'p2']);
});

test('topological sort is deterministic', () => {
  const nodes = [makeNode('x'), makeNode('y'), makeNode('z')];
  const edges = [makeEdge('x', 'y', 'e1'), makeEdge('y', 'z', 'e2')];
  const order1 = builder.topologicalSort(nodes, edges);
  const order2 = builder.topologicalSort(nodes, edges);
  assert.deepEqual(order1, order2);
});

test('entry and terminal nodes are correct', () => {
  const nodes = [makeNode('a'), makeNode('b'), makeNode('c'), makeNode('d')];
  const edges = [makeEdge('a', 'b', 'e1'), makeEdge('c', 'd', 'e2')];
  const graph = builder.build(nodes, edges);
  assert.deepEqual(graph.entryNodeIds, ['a', 'c']);
  assert.deepEqual(graph.terminalNodeIds, ['b', 'd']);
});

test('rejects self-dependency in cycle detection', () => {
  const nodes = [{ ...makeNode('a'), dependencies: ['a'] }];
  const edges = [makeEdge('a', 'a', 'e1')];
  const cycle = builder.detectCycle(nodes, edges);
  assert.ok(cycle !== null, 'self-dependency should be detected as cycle');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
