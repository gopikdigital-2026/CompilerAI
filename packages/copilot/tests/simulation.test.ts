/**
 * tests/simulation.test.ts
 *
 * Unit tests for WorkflowSimulator.
 * 30+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { NaturalLanguageParser } from '../src/parser/NaturalLanguageParser.js';
import { WorkflowPlanner } from '../src/planner/WorkflowPlanner.js';
import { WorkflowValidator } from '../src/validator/WorkflowValidator.js';
import { WorkflowGenerator } from '../src/workflow/WorkflowGenerator.js';
import { WorkflowSimulator } from '../src/simulation/WorkflowSimulator.js';
import type { GeneratedWorkflow } from '../src/workflow/models.js';
import {
  createFullRegistry,
  createEmptyRegistry,
  createRegistryWith,
  SPRINT_EN,
  SPRINT_ES,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: NaturalLanguageParser;
let planner: WorkflowPlanner;
let validator: WorkflowValidator;
let generator: WorkflowGenerator;
let simulator: WorkflowSimulator;

function buildWorkflow(instruction: string, registry = createFullRegistry()): GeneratedWorkflow {
  const intent = parser.parse(instruction);
  const dag = planner.plan(intent, registry);
  const validation = validator.validate(dag, registry);
  return generator.generate(dag, intent, validation);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('WorkflowSimulator', () => {
  beforeEach(() => {
    parser = new NaturalLanguageParser();
    planner = new WorkflowPlanner();
    validator = new WorkflowValidator();
    generator = new WorkflowGenerator();
    simulator = new WorkflowSimulator();
  });

  // ── dryRun flag ───────────────────────────────────────────────────────

  describe('dryRun property', () => {
    it('dryRun is always true', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.dryRun, true);
    });

    it('dryRun is true even with empty registry', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.equal(result.dryRun, true);
    });
  });

  // ── Sprint example with full registry ─────────────────────────────────

  describe('sprint example with full registry', () => {
    it('simulate() does not throw', () => {
      const wf = buildWorkflow(SPRINT_EN);
      assert.doesNotThrow(() => simulator.simulate(wf, createFullRegistry()));
    });

    it('success=true when all connectors present', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.success, true);
    });

    it('missingConnectors is empty with full registry', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.missingConnectors.length, 0);
    });

    it('preflightErrors is empty with full registry', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.preflightErrors.length, 0);
    });

    it('steps array is non-empty', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.ok(result.steps.length > 0);
    });

    it('steps array length equals DAG node count (5 for sprint)', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.steps.length, wf.dag.nodes.length);
    });

    it('all steps have estimatedDurationMs >= 0', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      for (const step of result.steps) {
        assert.ok(step.estimatedDurationMs >= 0, `Step ${step.nodeLabel} has negative duration`);
      }
    });

    it('totalEstimatedDurationMs equals sum of step durations', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      const sum = result.steps.reduce((acc, s) => acc + s.estimatedDurationMs, 0);
      assert.equal(result.totalEstimatedDurationMs, sum);
    });

    it('totalEstimatedDurationMs > 0', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.ok(result.totalEstimatedDurationMs > 0);
    });

    it('executionPath includes the trigger node', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      const triggerNode = wf.dag.nodes.find((n) => n.type === 'trigger');
      assert.ok(result.executionPath.includes(triggerNode!.id));
    });

    it('requiredPermissions populated for google-workspace (has OAuth scopes)', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.ok(result.requiredPermissions.length > 0);
    });

    it('workflowId matches the generated workflow id', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.workflowId, wf.id);
    });

    it('workflowName matches the generated workflow name', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.workflowName, wf.name);
    });
  });

  // ── Sprint example with empty registry ────────────────────────────────

  describe('sprint example with empty registry', () => {
    it('success=false when required connectors are missing', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.equal(result.success, false);
    });

    it('missingConnectors includes google-workspace', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.ok(result.missingConnectors.includes('google-workspace'));
    });

    it('missingConnectors includes github', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.ok(result.missingConnectors.includes('github'));
    });

    it('preflightErrors is non-empty when connectors missing', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.ok(result.preflightErrors.length > 0);
    });

    it('dryRun still true when connectors missing', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createEmptyRegistry());
      assert.equal(result.dryRun, true);
    });
  });

  // ── Spanish sprint ────────────────────────────────────────────────────

  describe('Spanish sprint example', () => {
    it('success=true for Spanish sprint with full registry', () => {
      const wf = buildWorkflow(SPRINT_ES);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.success, true);
    });

    it('dryRun=true for Spanish sprint', () => {
      const wf = buildWorkflow(SPRINT_ES);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.equal(result.dryRun, true);
    });
  });

  // ── Simple 1-action workflow ──────────────────────────────────────────

  describe('simple 1-action workflow', () => {
    it('2 steps for trigger + 1 action workflow', () => {
      const wf = buildWorkflow(
        'When I receive an email in Gmail, notify the team on Slack.',
        createRegistryWith(['google-workspace', 'slack']),
      );
      const result = simulator.simulate(wf, createRegistryWith(['google-workspace', 'slack']));
      assert.equal(result.steps.length, 2);
    });

    it('success=true for simple 1-action workflow with matching registry', () => {
      const wf = buildWorkflow(
        'When I receive an email in Gmail, notify the team on Slack.',
        createRegistryWith(['google-workspace', 'slack']),
      );
      const result = simulator.simulate(wf, createRegistryWith(['google-workspace', 'slack']));
      assert.equal(result.success, true);
    });
  });

  // ── Simulation result shape ───────────────────────────────────────────

  describe('simulation result shape', () => {
    it('result has all required fields', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      assert.ok('dryRun' in result);
      assert.ok('workflowId' in result);
      assert.ok('workflowName' in result);
      assert.ok('success' in result);
      assert.ok('steps' in result);
      assert.ok('totalEstimatedDurationMs' in result);
      assert.ok('preflightErrors' in result);
      assert.ok('preflightWarnings' in result);
      assert.ok('executionPath' in result);
      assert.ok('skippedNodes' in result);
      assert.ok('requiredPermissions' in result);
      assert.ok('missingConnectors' in result);
    });

    it('each step has required fields', () => {
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      for (const step of result.steps) {
        assert.ok('nodeId' in step);
        assert.ok('nodeLabel' in step);
        assert.ok('status' in step);
        assert.ok('estimatedDurationMs' in step);
        assert.ok('inputs' in step);
        assert.ok('outputs' in step);
        assert.ok('errors' in step);
        assert.ok('warnings' in step);
      }
    });

    it('step status is one of the valid values', () => {
      const VALID_STATUSES = ['success', 'failure', 'skipped', 'conditional_skip'];
      const wf = buildWorkflow(SPRINT_EN);
      const result = simulator.simulate(wf, createFullRegistry());
      for (const step of result.steps) {
        assert.ok(VALID_STATUSES.includes(step.status), `Invalid status: ${step.status}`);
      }
    });
  });
});
