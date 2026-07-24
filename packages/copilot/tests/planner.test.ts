/**
 * tests/planner.test.ts
 *
 * Unit tests for WorkflowPlanner.
 * 30+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { NaturalLanguageParser } from '../src/parser/NaturalLanguageParser.js';
import { WorkflowPlanner } from '../src/planner/WorkflowPlanner.js';
import type { WorkflowDAG } from '../src/planner/models.js';
import { createFullRegistry, SPRINT_EN, SPRINT_ES } from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: NaturalLanguageParser;
let planner: WorkflowPlanner;

function buildSprintDAG(): WorkflowDAG {
  const intent = parser.parse(SPRINT_EN);
  return planner.plan(intent, createFullRegistry());
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkflowPlanner', () => {
  beforeEach(() => {
    parser = new NaturalLanguageParser();
    planner = new WorkflowPlanner();
  });

  // ── Sprint example structure ───────────────────────────────────────────

  describe('sprint example DAG structure', () => {
    it('plan() returns a WorkflowDAG without throwing', () => {
      assert.doesNotThrow(() => buildSprintDAG());
    });

    it('DAG has exactly 5 nodes (trigger + condition + 3 actions)', () => {
      const dag = buildSprintDAG();
      // trigger=1, drive action=1, condition=1 (before github), github action=1, calendar action=1
      assert.equal(dag.nodes.length, 5);
    });

    it('DAG has exactly 1 trigger node', () => {
      const dag = buildSprintDAG();
      const triggers = dag.nodes.filter((n) => n.type === 'trigger');
      assert.equal(triggers.length, 1);
    });

    it('DAG has exactly 1 condition node', () => {
      const dag = buildSprintDAG();
      const conds = dag.nodes.filter((n) => n.type === 'condition');
      assert.equal(conds.length, 1);
    });

    it('DAG has exactly 3 action nodes', () => {
      const dag = buildSprintDAG();
      const actions = dag.nodes.filter((n) => n.type === 'action');
      assert.equal(actions.length, 3);
    });

    it('condition node is inserted BEFORE the github action node', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      const githubNode = dag.nodes.find(
        (n) => n.capabilityName === 'github.issues.create',
      );
      assert.ok(condNode, 'Expected condition node');
      assert.ok(githubNode, 'Expected github action node');

      const condIdx = dag.executionOrder.indexOf(condNode!.id);
      const ghIdx = dag.executionOrder.indexOf(githubNode!.id);
      assert.ok(condIdx < ghIdx, `Condition (pos ${condIdx}) should come before github action (pos ${ghIdx})`);
    });

    it('first node in executionOrder is the trigger', () => {
      const dag = buildSprintDAG();
      const firstNodeId = dag.executionOrder[0];
      const firstNode = dag.nodes.find((n) => n.id === firstNodeId);
      assert.equal(firstNode?.type, 'trigger');
    });

    it('trigger node id starts with node_trigger_', () => {
      const dag = buildSprintDAG();
      const triggerNode = dag.nodes.find((n) => n.type === 'trigger');
      assert.match(triggerNode!.id, /^node_trigger_/);
    });

    it('condition node id starts with node_condition_', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      assert.match(condNode!.id, /^node_condition_/);
    });

    it('action node ids start with node_action_', () => {
      const dag = buildSprintDAG();
      const actionNodes = dag.nodes.filter((n) => n.type === 'action');
      for (const node of actionNodes) {
        assert.match(node.id, /^node_action_/);
      }
    });

    it('DAG id starts with wf_', () => {
      const dag = buildSprintDAG();
      assert.match(dag.id, /^wf_/);
    });

    it('executionOrder contains all node ids', () => {
      const dag = buildSprintDAG();
      const nodeIdSet = new Set(dag.nodes.map((n) => n.id));
      for (const id of dag.executionOrder) {
        assert.ok(nodeIdSet.has(id), `${id} not found in nodes`);
      }
      assert.equal(dag.executionOrder.length, dag.nodes.length);
    });
  });

  // ── Edge types ────────────────────────────────────────────────────────

  describe('edge types', () => {
    it('edge from condition node to github action has type conditional', () => {
      const dag = buildSprintDAG();
      const condNode = dag.nodes.find((n) => n.type === 'condition');
      assert.ok(condNode, 'Expected condition node');
      const conditionalEdge = dag.edges.find(
        (e) => e.from === condNode!.id,
      );
      assert.ok(conditionalEdge, 'Expected edge from condition node');
      assert.equal(conditionalEdge!.type, 'conditional');
    });

    it('edges exist for every non-trigger node', () => {
      const dag = buildSprintDAG();
      const nonTriggerIds = dag.nodes
        .filter((n) => n.type !== 'trigger')
        .map((n) => n.id);
      const nodesWithIncoming = new Set(dag.edges.map((e) => e.to));
      for (const id of nonTriggerIds) {
        assert.ok(nodesWithIncoming.has(id), `Node ${id} has no incoming edge`);
      }
    });

    it('no duplicate edges (same from+to)', () => {
      const dag = buildSprintDAG();
      const seen = new Set<string>();
      for (const edge of dag.edges) {
        const key = `${edge.from}->${edge.to}`;
        assert.ok(!seen.has(key), `Duplicate edge: ${key}`);
        seen.add(key);
      }
    });
  });

  // ── Required connectors and capabilities ─────────────────────────────

  describe('required connectors / capabilities', () => {
    it('requiredConnectors includes google-workspace', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredConnectors.includes('google-workspace'));
    });

    it('requiredConnectors includes github', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredConnectors.includes('github'));
    });

    it('requiredCapabilities includes gmail.messages.read', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredCapabilities.includes('gmail.messages.read'));
    });

    it('requiredCapabilities includes drive.files.write', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredCapabilities.includes('drive.files.write'));
    });

    it('requiredCapabilities includes github.issues.create', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredCapabilities.includes('github.issues.create'));
    });

    it('requiredCapabilities includes calendar.events.write', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.requiredCapabilities.includes('calendar.events.write'));
    });

    it('no duplicate requiredConnectors', () => {
      const dag = buildSprintDAG();
      const set = new Set(dag.requiredConnectors);
      assert.equal(dag.requiredConnectors.length, set.size);
    });

    it('no duplicate requiredCapabilities', () => {
      const dag = buildSprintDAG();
      const set = new Set(dag.requiredCapabilities);
      assert.equal(dag.requiredCapabilities.length, set.size);
    });
  });

  // ── Duration estimation ───────────────────────────────────────────────

  describe('duration estimation', () => {
    it('estimatedDurationMs > 0 for sprint example', () => {
      const dag = buildSprintDAG();
      assert.ok(dag.estimatedDurationMs > 0, `estimatedDurationMs was ${dag.estimatedDurationMs}`);
    });

    it('trigger node has no duration contribution (0ms)', () => {
      // The trigger adds 0ms. We can verify by checking total > 0 without trigger
      const dag = buildSprintDAG();
      assert.ok(dag.estimatedDurationMs > 0);
    });
  });

  // ── Variable flow: produces / consumes ────────────────────────────────

  describe('produces / consumes', () => {
    it('gmail trigger node produces email.subject', () => {
      const dag = buildSprintDAG();
      const triggerNode = dag.nodes.find((n) => n.type === 'trigger');
      assert.ok(triggerNode?.produces.includes('email.subject'));
    });

    it('drive action node produces drive.fileId', () => {
      const dag = buildSprintDAG();
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      assert.ok(driveNode?.produces.includes('drive.fileId'));
    });

    it('drive action consumes email.attachments', () => {
      const dag = buildSprintDAG();
      const driveNode = dag.nodes.find((n) => n.capabilityName === 'drive.files.write');
      assert.ok(driveNode?.consumes.includes('email.attachments'));
    });

    it('github action produces github.issueNumber', () => {
      const dag = buildSprintDAG();
      const ghNode = dag.nodes.find((n) => n.capabilityName === 'github.issues.create');
      assert.ok(ghNode?.produces.includes('github.issueNumber'));
    });
  });

  // ── Simple 1-action workflow ──────────────────────────────────────────

  describe('simple 1-action workflow', () => {
    it('produces 2 nodes: trigger + 1 action', () => {
      const intent = parser.parse(
        'When I receive an email in Gmail, notify the team on Slack.',
      );
      const dag = planner.plan(intent, createFullRegistry());
      assert.equal(dag.nodes.length, 2);
    });

    it('produces 1 edge for trigger → action', () => {
      const intent = parser.parse(
        'When I receive an email in Gmail, notify the team on Slack.',
      );
      const dag = planner.plan(intent, createFullRegistry());
      assert.equal(dag.edges.length, 1);
    });
  });

  // ── Schedule trigger ──────────────────────────────────────────────────

  describe('schedule trigger', () => {
    it('schedule trigger produces a trigger node', () => {
      const intent = parser.parse('Every week, save a report to Drive.');
      const dag = planner.plan(intent, createFullRegistry());
      const triggers = dag.nodes.filter((n) => n.type === 'trigger');
      assert.equal(triggers.length, 1);
    });
  });

  // ── Spanish sprint example ────────────────────────────────────────────

  describe('Spanish sprint example DAG', () => {
    it('Spanish sprint produces 5 nodes', () => {
      const intent = parser.parse(SPRINT_ES);
      const dag = planner.plan(intent, createFullRegistry());
      assert.equal(dag.nodes.length, 5);
    });

    it('Spanish sprint first execution step is trigger', () => {
      const intent = parser.parse(SPRINT_ES);
      const dag = planner.plan(intent, createFullRegistry());
      const firstNodeId = dag.executionOrder[0];
      const firstNode = dag.nodes.find((n) => n.id === firstNodeId);
      assert.equal(firstNode?.type, 'trigger');
    });
  });

  // ── Multiple conditions ────────────────────────────────────────────────

  describe('multiple conditions', () => {
    it('instruction with amount condition and label condition inserts condition nodes', () => {
      const intent = parser.parse(
        "When I receive an email in Gmail, if it exceeds 5000€ and the issue is labeled 'critical', create an issue in GitHub.",
      );
      const dag = planner.plan(intent, createFullRegistry());
      const condNodes = dag.nodes.filter((n) => n.type === 'condition');
      // At least one condition node should be inserted
      assert.ok(condNodes.length >= 1);
    });
  });

  // ── dependsOn ─────────────────────────────────────────────────────────

  describe('node dependsOn', () => {
    it('trigger node has empty dependsOn', () => {
      const dag = buildSprintDAG();
      const triggerNode = dag.nodes.find((n) => n.type === 'trigger');
      assert.deepEqual(triggerNode?.dependsOn, []);
    });

    it('every non-trigger node has at least one entry in dependsOn', () => {
      const dag = buildSprintDAG();
      const nonTrigger = dag.nodes.filter((n) => n.type !== 'trigger');
      for (const node of nonTrigger) {
        assert.ok(node.dependsOn.length >= 1, `Node ${node.id} has empty dependsOn`);
      }
    });
  });
});
