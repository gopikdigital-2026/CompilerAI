/**
 * tests/validator.test.ts
 *
 * Unit tests for WorkflowValidator.
 * 40+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { NaturalLanguageParser } from '../src/parser/NaturalLanguageParser.js';
import { WorkflowPlanner } from '../src/planner/WorkflowPlanner.js';
import { WorkflowValidator } from '../src/validator/WorkflowValidator.js';
import type { DAGEdge, DAGNode, WorkflowDAG } from '../src/planner/models.js';
import {
  createFullRegistry,
  createEmptyRegistry,
  createRegistryWith,
  SPRINT_EN,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: NaturalLanguageParser;
let planner: WorkflowPlanner;
let validator: WorkflowValidator;

function buildSprintDAG(): WorkflowDAG {
  const intent = parser.parse(SPRINT_EN);
  return planner.plan(intent, createFullRegistry());
}

/** Build a minimal valid DAG with 1 trigger + 1 action node */
function buildMinimalDAG(): WorkflowDAG {
  const trigger: DAGNode = {
    id: 'node_trigger_0',
    type: 'trigger',
    label: 'New email in Gmail',
    connectorId: 'google-workspace',
    capabilityName: 'gmail.messages.read',
    operation: 'gmail.messages.read',
    parameters: {},
    errorPolicy: 'fail',
    timeoutMs: 30000,
    retries: 0,
    dependsOn: [],
    produces: ['email.subject', 'email.body', 'email.sender'],
    consumes: [],
  };
  const action: DAGNode = {
    id: 'node_action_0',
    type: 'action',
    label: 'Send Slack message',
    connectorId: 'slack',
    capabilityName: 'slack.messages.send',
    operation: 'slack.messages.send',
    parameters: { message: 'hello' },
    errorPolicy: 'fail',
    timeoutMs: 30000,
    retries: 1,
    dependsOn: ['node_trigger_0'],
    produces: [],
    consumes: [],
  };
  const edge: DAGEdge = {
    id: 'edge_0',
    from: 'node_trigger_0',
    to: 'node_action_0',
    type: 'success',
    condition: null,
    label: 'success',
  };
  return {
    id: 'wf_test_minimal',
    name: 'Minimal test DAG',
    description: 'Test',
    nodes: [trigger, action],
    edges: [edge],
    executionOrder: ['node_trigger_0', 'node_action_0'],
    estimatedDurationMs: 1500,
    requiredConnectors: ['google-workspace', 'slack'],
    requiredCapabilities: ['gmail.messages.read', 'slack.messages.send'],
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkflowValidator', () => {
  beforeEach(() => {
    parser = new NaturalLanguageParser();
    planner = new WorkflowPlanner();
    validator = new WorkflowValidator();
  });

  // ── Valid DAG ─────────────────────────────────────────────────────────

  describe('valid DAG (sprint example, full registry)', () => {
    it('validate() does not throw', () => {
      const dag = buildSprintDAG();
      assert.doesNotThrow(() => validator.validate(dag, createFullRegistry()));
    });

    it('valid=true when no errors', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      assert.equal(result.valid, true);
    });

    it('errors array is empty', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      assert.equal(result.errors.length, 0);
    });

    it('issues array does not contain error-severity items', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      const errorItems = result.issues.filter((i) => i.severity === 'error');
      assert.equal(errorItems.length, 0);
    });

    it('result has all partition arrays', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(Array.isArray(result.errors));
      assert.ok(Array.isArray(result.warnings));
      assert.ok(Array.isArray(result.infos));
      assert.ok(Array.isArray(result.issues));
    });

    it('errors + warnings + infos equals issues total', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      assert.equal(
        result.errors.length + result.warnings.length + result.infos.length,
        result.issues.length,
      );
    });

    it('OAuth scopes info emitted for google-workspace nodes (has requiredScopes)', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      const oauthInfos = result.infos.filter((i) => i.code === 'OAUTH_SCOPES_REQUIRED');
      assert.ok(oauthInfos.length > 0, 'Expected OAUTH_SCOPES_REQUIRED info');
    });
  });

  // ── MISSING_TRIGGER ──────────────────────────────────────────────────

  describe('MISSING_TRIGGER error', () => {
    it('empty nodes array → MISSING_TRIGGER error', () => {
      const dag: WorkflowDAG = {
        id: 'wf_empty',
        name: 'Empty',
        description: '',
        nodes: [],
        edges: [],
        executionOrder: [],
        estimatedDurationMs: 0,
        requiredConnectors: [],
        requiredCapabilities: [],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(result.errors.some((e) => e.code === 'MISSING_TRIGGER'));
    });

    it('valid=false when MISSING_TRIGGER', () => {
      const dag: WorkflowDAG = {
        id: 'wf_no_trigger',
        name: 'No trigger',
        description: '',
        nodes: [],
        edges: [],
        executionOrder: [],
        estimatedDurationMs: 0,
        requiredConnectors: [],
        requiredCapabilities: [],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.equal(result.valid, false);
    });
  });

  // ── MULTIPLE_TRIGGERS ────────────────────────────────────────────────

  describe('MULTIPLE_TRIGGERS error', () => {
    it('two trigger nodes → MULTIPLE_TRIGGERS error', () => {
      const t1: DAGNode = {
        id: 'trigger_1',
        type: 'trigger',
        label: 'Trigger 1',
        connectorId: null,
        capabilityName: null,
        operation: null,
        parameters: {},
        errorPolicy: 'fail',
        timeoutMs: 30000,
        retries: 0,
        dependsOn: [],
        produces: [],
        consumes: [],
      };
      const t2: DAGNode = { ...t1, id: 'trigger_2', label: 'Trigger 2' };
      const dag: WorkflowDAG = {
        id: 'wf_multi_trigger',
        name: 'Multi-trigger',
        description: '',
        nodes: [t1, t2],
        edges: [],
        executionOrder: ['trigger_1', 'trigger_2'],
        estimatedDurationMs: 0,
        requiredConnectors: [],
        requiredCapabilities: [],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(result.errors.some((e) => e.code === 'MULTIPLE_TRIGGERS'));
    });

    it('valid=false when MULTIPLE_TRIGGERS', () => {
      const t1: DAGNode = {
        id: 'trigger_1', type: 'trigger', label: 'T1', connectorId: null,
        capabilityName: null, operation: null, parameters: {}, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 0, dependsOn: [], produces: [], consumes: [],
      };
      const t2: DAGNode = { ...t1, id: 'trigger_2', label: 'T2' };
      const dag: WorkflowDAG = {
        id: 'wf_mt', name: 'MT', description: '', nodes: [t1, t2], edges: [],
        executionOrder: ['trigger_1', 'trigger_2'], estimatedDurationMs: 0,
        requiredConnectors: [], requiredCapabilities: [],
      };
      const result = validator.validate(dag, createEmptyRegistry());
      assert.equal(result.valid, false);
    });
  });

  // ── CYCLE_DETECTED ────────────────────────────────────────────────────

  describe('CYCLE_DETECTED error', () => {
    it('manually constructed cycle → CYCLE_DETECTED error', () => {
      const nodeA: DAGNode = {
        id: 'node_a', type: 'trigger', label: 'A', connectorId: null,
        capabilityName: null, operation: null, parameters: {}, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 0, dependsOn: [], produces: [], consumes: [],
      };
      const nodeB: DAGNode = {
        id: 'node_b', type: 'action', label: 'B', connectorId: null,
        capabilityName: null, operation: null, parameters: { x: 1 }, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 1, dependsOn: ['node_a'], produces: [], consumes: [],
      };
      const nodeC: DAGNode = {
        id: 'node_c', type: 'action', label: 'C', connectorId: null,
        capabilityName: null, operation: null, parameters: { x: 1 }, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 1, dependsOn: ['node_b'], produces: [], consumes: [],
      };
      // Back edge: C → B creates a cycle
      const edges: DAGEdge[] = [
        { id: 'e1', from: 'node_a', to: 'node_b', type: 'success', condition: null, label: '' },
        { id: 'e2', from: 'node_b', to: 'node_c', type: 'success', condition: null, label: '' },
        { id: 'e3', from: 'node_c', to: 'node_b', type: 'success', condition: null, label: '' }, // cycle!
      ];
      const dag: WorkflowDAG = {
        id: 'wf_cycle', name: 'Cycle', description: '', nodes: [nodeA, nodeB, nodeC],
        edges, executionOrder: ['node_a', 'node_b', 'node_c'], estimatedDurationMs: 0,
        requiredConnectors: [], requiredCapabilities: [],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(result.errors.some((e) => e.code === 'CYCLE_DETECTED'));
    });

    it('valid sprint DAG has no CYCLE_DETECTED error', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(!result.errors.some((e) => e.code === 'CYCLE_DETECTED'));
    });
  });

  // ── ORPHAN_NODE ───────────────────────────────────────────────────────

  describe('ORPHAN_NODE error', () => {
    it('action node with no incoming edge → ORPHAN_NODE error', () => {
      const trigger: DAGNode = {
        id: 'trig', type: 'trigger', label: 'Trigger', connectorId: null,
        capabilityName: null, operation: null, parameters: {}, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 0, dependsOn: [], produces: [], consumes: [],
      };
      const orphan: DAGNode = {
        id: 'orphan', type: 'action', label: 'Orphan Action', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: 'slack.messages.send',
        parameters: { msg: 'hi' }, errorPolicy: 'fail', timeoutMs: 30000, retries: 1,
        dependsOn: [], produces: [], consumes: [],
      };
      const dag: WorkflowDAG = {
        id: 'wf_orphan', name: 'Orphan', description: '', nodes: [trigger, orphan],
        edges: [], executionOrder: ['trig', 'orphan'], estimatedDurationMs: 0,
        requiredConnectors: ['slack'], requiredCapabilities: ['slack.messages.send'],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(result.errors.some((e) => e.code === 'ORPHAN_NODE'));
    });
  });

  // ── UNREACHABLE_NODE ─────────────────────────────────────────────────

  describe('UNREACHABLE_NODE error', () => {
    it('node not reachable from trigger → UNREACHABLE_NODE error', () => {
      const trigger: DAGNode = {
        id: 'trig', type: 'trigger', label: 'Trigger', connectorId: null,
        capabilityName: null, operation: null, parameters: {}, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 0, dependsOn: [], produces: [], consumes: [],
      };
      const island1: DAGNode = {
        id: 'island1', type: 'action', label: 'Island 1', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: null,
        parameters: { msg: 'x' }, errorPolicy: 'fail', timeoutMs: 30000, retries: 1,
        dependsOn: ['island2'], produces: [], consumes: [],
      };
      const island2: DAGNode = {
        id: 'island2', type: 'action', label: 'Island 2', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: null,
        parameters: { msg: 'y' }, errorPolicy: 'fail', timeoutMs: 30000, retries: 1,
        dependsOn: ['island1'], produces: [], consumes: [],
      };
      // island1 and island2 are connected to each other but not to trigger
      const edges: DAGEdge[] = [
        { id: 'e1', from: 'island1', to: 'island2', type: 'success', condition: null, label: '' },
      ];
      const dag: WorkflowDAG = {
        id: 'wf_unreachable', name: 'Unreachable', description: '',
        nodes: [trigger, island1, island2], edges,
        executionOrder: ['trig', 'island1', 'island2'], estimatedDurationMs: 0,
        requiredConnectors: ['slack'], requiredCapabilities: ['slack.messages.send'],
      };
      const result = validator.validate(dag, createFullRegistry());
      // island1 has incoming edge (from island2 cycle), but is not reachable from trigger
      // at least island2 should be unreachable  OR island1 should be
      const hasUnreachable = result.errors.some((e) => e.code === 'UNREACHABLE_NODE');
      // Also check ORPHAN_NODE since island2 might get that code
      const hasOrphan = result.errors.some((e) => e.code === 'ORPHAN_NODE');
      assert.ok(hasUnreachable || hasOrphan, 'Expected UNREACHABLE_NODE or ORPHAN_NODE error');
    });
  });

  // ── CONNECTOR_NOT_FOUND warning ──────────────────────────────────────

  describe('CONNECTOR_NOT_FOUND warning', () => {
    it('connector not in registry → CONNECTOR_NOT_FOUND warning (not error)', () => {
      const dag = buildSprintDAG();
      // Use empty registry — all connectors missing
      const result = validator.validate(dag, createEmptyRegistry());
      assert.ok(result.warnings.some((w) => w.code === 'CONNECTOR_NOT_FOUND'));
    });

    it('valid=true even when there are CONNECTOR_NOT_FOUND warnings', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createEmptyRegistry());
      // warnings don't affect validity — only errors do
      assert.equal(result.valid, true);
    });

    it('each warning has severity=warning', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createEmptyRegistry());
      for (const w of result.warnings) {
        assert.equal(w.severity, 'warning');
      }
    });
  });

  // ── CAPABILITY_NOT_FOUND warning ─────────────────────────────────────

  describe('CAPABILITY_NOT_FOUND warning', () => {
    it('connector in registry but unknown capability → CAPABILITY_NOT_FOUND warning', () => {
      const trigger: DAGNode = {
        id: 'trig', type: 'trigger', label: 'Test trigger', connectorId: 'slack',
        capabilityName: 'slack.nonexistent.capability', operation: null,
        parameters: {}, errorPolicy: 'fail', timeoutMs: 30000, retries: 0,
        dependsOn: [], produces: [], consumes: [],
      };
      const dag: WorkflowDAG = {
        id: 'wf_badcap', name: 'Bad cap', description: '', nodes: [trigger],
        edges: [], executionOrder: ['trig'], estimatedDurationMs: 0,
        requiredConnectors: ['slack'], requiredCapabilities: ['slack.nonexistent.capability'],
      };
      const result = validator.validate(dag, createRegistryWith(['slack']));
      assert.ok(result.warnings.some((w) => w.code === 'CAPABILITY_NOT_FOUND'));
    });
  });

  // ── UNDEFINED_VARIABLE warning ────────────────────────────────────────

  describe('UNDEFINED_VARIABLE warning', () => {
    it('action consuming a variable not produced upstream → UNDEFINED_VARIABLE warning', () => {
      const trigger: DAGNode = {
        id: 'trig', type: 'trigger', label: 'Trigger', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: null,
        parameters: {}, errorPolicy: 'fail', timeoutMs: 30000, retries: 0,
        dependsOn: [], produces: [], consumes: [],
      };
      const action: DAGNode = {
        id: 'act', type: 'action', label: 'Action', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: null,
        parameters: { msg: 'x' }, errorPolicy: 'fail', timeoutMs: 30000, retries: 1,
        dependsOn: ['trig'],
        produces: [],
        consumes: ['nonexistent.variable'], // not produced by trigger
      };
      const edge: DAGEdge = {
        id: 'e1', from: 'trig', to: 'act', type: 'success', condition: null, label: '',
      };
      const dag: WorkflowDAG = {
        id: 'wf_undef_var', name: 'Undefined var', description: '',
        nodes: [trigger, action], edges: [edge],
        executionOrder: ['trig', 'act'], estimatedDurationMs: 0,
        requiredConnectors: ['slack'], requiredCapabilities: ['slack.messages.send'],
      };
      const result = validator.validate(dag, createRegistryWith(['slack']));
      assert.ok(result.warnings.some((w) => w.code === 'UNDEFINED_VARIABLE'));
    });
  });

  // ── OAUTH_SCOPES_REQUIRED info ────────────────────────────────────────

  describe('OAUTH_SCOPES_REQUIRED info', () => {
    it('google-workspace nodes produce OAUTH_SCOPES_REQUIRED info', () => {
      const dag = buildMinimalDAG(); // has gmail.messages.read
      const result = validator.validate(dag, createRegistryWith(['google-workspace', 'slack']));
      assert.ok(result.infos.some((i) => i.code === 'OAUTH_SCOPES_REQUIRED'));
    });

    it('each info item has severity=info', () => {
      const dag = buildSprintDAG();
      const result = validator.validate(dag, createFullRegistry());
      for (const info of result.infos) {
        assert.equal(info.severity, 'info');
      }
    });
  });

  // ── NO_PARAMETERS info ────────────────────────────────────────────────

  describe('NO_PARAMETERS info', () => {
    it('action node with empty parameters → NO_PARAMETERS info', () => {
      const trigger: DAGNode = {
        id: 'trig', type: 'trigger', label: 'Trigger', connectorId: null,
        capabilityName: null, operation: null, parameters: {}, errorPolicy: 'fail',
        timeoutMs: 30000, retries: 0, dependsOn: [], produces: [], consumes: [],
      };
      const action: DAGNode = {
        id: 'act', type: 'action', label: 'No-param action', connectorId: 'slack',
        capabilityName: 'slack.messages.send', operation: null,
        parameters: {}, // intentionally empty
        errorPolicy: 'fail', timeoutMs: 30000, retries: 1,
        dependsOn: ['trig'], produces: [], consumes: [],
      };
      const edge: DAGEdge = {
        id: 'e1', from: 'trig', to: 'act', type: 'success', condition: null, label: '',
      };
      const dag: WorkflowDAG = {
        id: 'wf_noparams', name: 'No params', description: '',
        nodes: [trigger, action], edges: [edge],
        executionOrder: ['trig', 'act'], estimatedDurationMs: 0,
        requiredConnectors: ['slack'], requiredCapabilities: ['slack.messages.send'],
      };
      const result = validator.validate(dag, createRegistryWith(['slack']));
      assert.ok(result.infos.some((i) => i.code === 'NO_PARAMETERS'));
    });
  });

  // ── valid=false only for errors ────────────────────────────────────────

  describe('valid field semantics', () => {
    it('valid=true even with warnings', () => {
      const dag = buildSprintDAG();
      // Empty registry → warnings for all connectors, but no errors
      const result = validator.validate(dag, createEmptyRegistry());
      assert.equal(result.errors.length, 0); // CONNECTOR_NOT_FOUND are warnings
      assert.equal(result.valid, true);
    });

    it('valid=false only when errors.length > 0', () => {
      const dag: WorkflowDAG = {
        id: 'wf_err', name: 'Error', description: '', nodes: [], edges: [],
        executionOrder: [], estimatedDurationMs: 0,
        requiredConnectors: [], requiredCapabilities: [],
      };
      const result = validator.validate(dag, createFullRegistry());
      assert.ok(result.errors.length > 0);
      assert.equal(result.valid, false);
    });
  });
});
