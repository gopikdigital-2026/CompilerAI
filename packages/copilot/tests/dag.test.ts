/**
 * tests/dag.test.ts
 *
 * Tests focused on DAG structure, topological ordering, and edge semantics.
 * 20+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { NaturalLanguageParser } from '../src/parser/NaturalLanguageParser.js';
import { WorkflowPlanner } from '../src/planner/WorkflowPlanner.js';
import type { DAGEdge, WorkflowDAG } from '../src/planner/models.js';
import { createFullRegistry, SPRINT_EN } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: NaturalLanguageParser;
let planner: WorkflowPlanner;

function buildSprintDAG(): WorkflowDAG {
  const intent = parser.parse(SPRINT_EN);
  return planner.plan(intent, createFullRegistry());
}

/**
 * Verify that the given id-list is a valid topological ordering of the DAG
 * (every edge from→to has from appearing before to in the list).
 */
function isValidTopologicalOrder(order: string[], edges: DAGEdge[]): boolean {
  const pos = new Map<string, number>(order.map((id, i) => [id, i]));
  for (const edge of edges) {
    const fromPos = pos.get(edge.from);
    const toPos = pos.get(edge.to);
    if (fromPos === undefined || toPos === undefined) return false;
    if (fromPos >= toPos) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkflowDAG', () => {
  beforeEach(() => {
    parser = new NaturalLanguageParser();
    planner = new WorkflowPlanner();
  });

  // ── Topological sort correctness ──────────────────────────────────────

  describe('topological sort', () => {
    it('executionOrder is a valid topological ordering of sprint DAG', () => {
      const dag = buildSprintDAG();
      assert.ok(
        isValidTopologicalOrder(dag.executionOrder, dag.edges),
        'executionOrder violates topological order',
      );
    });

    it('5-node chain: trigger comes first in executionOrder', () => {
      const dag = buildSprintDAG();
      const firstId = dag.executionOrder[0];
      const firstNode = dag.nodes.find((n) => n.id === firstId);
      assert.equal(firstNode?.type, 'trigger');
    });

    it('all 5 nodes appear in executionOrder', () => {
      const dag = buildSprintDAG();
      assert.equal(dag.executionOrder.length, dag.nodes.length);
    });

    it('executionOrder contains no duplicate node ids', () => {
      const dag = buildSprintDAG();
      const set = new Set(dag.executionOrder);
      assert.equal(set.size, dag.executionOrder.length);
    });

    it('condition node appears before the github action it guards', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      const githubNode = dag.nodes.find((n) => n.capabilityName === 'github.issues.create');
      assert.ok(condNode && githubNode, 'Expected both nodes');
      const condPos = dag.executionOrder.indexOf(condNode!.id);
      const ghPos = dag.executionOrder.indexOf(githubNode!.id);
      assert.ok(condPos < ghPos, `Condition pos ${condPos} should be before github pos ${ghPos}`);
    });

    it('drive action appears before condition node (condition guards github, not drive)', () => {
      const dag = buildSprintDAG();
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      assert.ok(driveNode && condNode, 'Expected both nodes');
      const drivePos = dag.executionOrder.indexOf(driveNode!.id);
      const condPos = dag.executionOrder.indexOf(condNode!.id);
      assert.ok(drivePos < condPos, `Drive pos ${drivePos} should be before condition pos ${condPos}`);
    });

    it('calendar action comes after github action in execution order', () => {
      const dag = buildSprintDAG();
      const githubNode = dag.nodes.find((n) => n.capabilityName === 'github.issues.create');
      const calNode = dag.nodes.find((n) => n.capabilityName === 'calendar.events.write');
      assert.ok(githubNode && calNode, 'Expected both nodes');
      const ghPos = dag.executionOrder.indexOf(githubNode!.id);
      const calPos = dag.executionOrder.indexOf(calNode!.id);
      assert.ok(ghPos < calPos, `GitHub pos ${ghPos} should be before calendar pos ${calPos}`);
    });
  });

  // ── Parallel branches ─────────────────────────────────────────────────

  describe('parallel branches', () => {
    it('two separate action nodes both appear after trigger', () => {
      // Build a workflow with 2 actions from a single trigger
      const intent = parser.parse(
        'When I receive an email in Gmail, notify the team on Slack and create an issue in GitHub.',
      );
      const dag = planner.plan(intent, createFullRegistry());
      const triggerPos = dag.executionOrder.findIndex(
        (id) => dag.nodes.find((n) => n.id === id)?.type === 'trigger',
      );
      const actionPositions = dag.nodes
        .filter((n) => n.type === 'action')
        .map((n) => dag.executionOrder.indexOf(n.id));

      for (const pos of actionPositions) {
        assert.ok(pos > triggerPos, `Action at pos ${pos} should come after trigger at pos ${triggerPos}`);
      }
    });
  });

  // ── Node dependencies ─────────────────────────────────────────────────

  describe('node dependencies', () => {
    it('trigger node has empty dependsOn', () => {
      const dag = buildSprintDAG();
      const trigger = dag.nodes.find((n) => n.type === 'trigger');
      assert.deepEqual(trigger?.dependsOn, []);
    });

    it('drive action dependsOn contains trigger id', () => {
      const dag = buildSprintDAG();
      const trigger = dag.nodes.find((n) => n.type === 'trigger');
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      assert.ok(driveNode?.dependsOn.includes(trigger!.id));
    });

    it('condition node dependsOn contains drive action id', () => {
      const dag = buildSprintDAG();
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      assert.ok(condNode?.dependsOn.includes(driveNode!.id));
    });

    it('github action dependsOn contains condition node id', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      const githubNode = dag.nodes.find((n) => n.capabilityName === 'github.issues.create');
      assert.ok(githubNode?.dependsOn.includes(condNode!.id));
    });
  });

  // ── No duplicate edges ────────────────────────────────────────────────

  describe('no duplicate edges', () => {
    it('sprint DAG has no duplicate edge (same from→to)', () => {
      const dag = buildSprintDAG();
      const seen = new Set<string>();
      for (const edge of dag.edges) {
        const key = `${edge.from}->${edge.to}`;
        assert.ok(!seen.has(key), `Duplicate edge found: ${key}`);
        seen.add(key);
      }
    });
  });

  // ── Edge type semantics ───────────────────────────────────────────────

  describe('edge type semantics', () => {
    it('edge from condition node to github action has type conditional', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      const edge = dag.edges.find((e) => e.from === condNode!.id);
      assert.ok(edge, 'Expected edge from condition node');
      assert.equal(edge!.type, 'conditional');
    });

    it('edge from trigger to drive action has type success', () => {
      const dag = buildSprintDAG();
      const trigger = dag.nodes.find((n) => n.type === 'trigger');
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      const edge = dag.edges.find(
        (e) => e.from === trigger!.id && e.to === driveNode!.id,
      );
      assert.ok(edge, 'Expected trigger→drive edge');
      assert.equal(edge!.type, 'success');
    });

    it('conditional edge has non-null condition field', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      const edge = dag.edges.find((e) => e.from === condNode!.id);
      assert.ok(edge, 'Expected conditional edge');
      assert.notEqual(edge!.condition, null);
    });

    it('non-conditional edge has null condition field', () => {
      const dag = buildSprintDAG();
      const trigger = dag.nodes.find((n) => n.type === 'trigger');
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      const edge = dag.edges.find(
        (e) => e.from === trigger!.id && e.to === driveNode!.id,
      );
      assert.ok(edge, 'Expected trigger→drive edge');
      assert.equal(edge!.condition, null);
    });
  });

  // ── Edge count ────────────────────────────────────────────────────────

  describe('edge count', () => {
    it('sprint DAG has exactly 4 edges (for 5 nodes in a chain)', () => {
      // trigger→drive, drive→condition, condition→github, github→calendar
      const dag = buildSprintDAG();
      assert.equal(dag.edges.length, 4);
    });
  });
});
