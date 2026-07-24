/**
 * tests/integration.test.ts
 *
 * End-to-end tests for the full CopilotEngine pipeline.
 * 30+ assertions. Runs fully offline.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { CopilotEngine } from '../src/CopilotEngine.js';
import { CopilotTelemetry } from '../src/telemetry/CopilotTelemetry.js';
import {
  createFullRegistry,
  SPRINT_EN,
  SPRINT_ES,
} from './helpers.js';

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('CopilotEngine (integration)', () => {
  let engine: CopilotEngine;
  let telemetry: CopilotTelemetry;

  beforeEach(() => {
    telemetry = new CopilotTelemetry();
    engine = new CopilotEngine({
      registry: createFullRegistry(),
      telemetry,
    });
  });

  // ── process() with EN sprint ──────────────────────────────────────────

  describe('process(sprintEN)', () => {
    it('does not throw', () => {
      assert.doesNotThrow(() => engine.process(SPRINT_EN));
    });

    it('returns a CopilotResult with all required keys', () => {
      const result = engine.process(SPRINT_EN);
      assert.ok('workflow' in result);
      assert.ok('simulation' in result);
      assert.ok('validation' in result);
      assert.ok('summary' in result);
    });

    it('workflow.status is "valid" (full registry, no errors)', () => {
      const result = engine.process(SPRINT_EN);
      assert.equal(result.workflow.status, 'valid');
    });

    it('simulation.dryRun is true', () => {
      const result = engine.process(SPRINT_EN);
      assert.equal(result.simulation.dryRun, true);
    });

    it('validation has no errors', () => {
      const result = engine.process(SPRINT_EN);
      assert.equal(result.validation.errors.length, 0);
    });

    it('validation.valid is true', () => {
      const result = engine.process(SPRINT_EN);
      assert.equal(result.validation.valid, true);
    });

    it('summary is a non-empty string', () => {
      const result = engine.process(SPRINT_EN);
      assert.ok(typeof result.summary === 'string' && result.summary.length > 0);
    });

    it('workflow.metadata.sourceInstruction equals the input string', () => {
      const result = engine.process(SPRINT_EN);
      assert.equal(result.workflow.metadata.sourceInstruction, SPRINT_EN);
    });

    it('workflow has a valid id (non-empty string)', () => {
      const result = engine.process(SPRINT_EN);
      assert.ok(typeof result.workflow.id === 'string' && result.workflow.id.length > 0);
    });

    it('workflow id starts with generated_wf_', () => {
      const result = engine.process(SPRINT_EN);
      assert.match(result.workflow.id, /^generated_wf_/);
    });
  });

  // ── process() with ES sprint ──────────────────────────────────────────

  describe('process(sprintES)', () => {
    it('does not throw for Spanish sprint', () => {
      assert.doesNotThrow(() => engine.process(SPRINT_ES));
    });

    it('workflow.status is "valid" for Spanish sprint', () => {
      const result = engine.process(SPRINT_ES);
      assert.equal(result.workflow.status, 'valid');
    });

    it('simulation.dryRun is true for Spanish sprint', () => {
      const result = engine.process(SPRINT_ES);
      assert.equal(result.simulation.dryRun, true);
    });

    it('validation has no errors for Spanish sprint', () => {
      const result = engine.process(SPRINT_ES);
      assert.equal(result.validation.errors.length, 0);
    });

    it('workflow has 5 DAG nodes for Spanish sprint', () => {
      const result = engine.process(SPRINT_ES);
      assert.equal(result.workflow.dag.nodes.length, 5);
    });
  });

  // ── Individual pipeline steps ─────────────────────────────────────────

  describe('individual pipeline steps', () => {
    it('parse() returns ParsedIntent with correct connector ids', () => {
      const intent = engine.parse(SPRINT_EN);
      assert.ok(intent.connectorIds.includes('google-workspace'));
      assert.ok(intent.connectorIds.includes('github'));
    });

    it('plan() returns WorkflowDAG with 5 nodes', () => {
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      assert.equal(dag.nodes.length, 5);
    });

    it('validate() returns ValidationResult with valid=true', () => {
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      const validation = engine.validate(dag);
      assert.equal(validation.valid, true);
    });

    it('generate() returns GeneratedWorkflow with correct metadata', () => {
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      const validation = engine.validate(dag);
      const workflow = engine.generate(dag, intent, validation);
      assert.equal(workflow.metadata.sourceInstruction, SPRINT_EN);
      assert.ok(workflow.metadata.requiredConnectors.includes('google-workspace'));
    });

    it('simulate() returns SimulationResult with dryRun=true', () => {
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      const validation = engine.validate(dag);
      const workflow = engine.generate(dag, intent, validation);
      const sim = engine.simulate(workflow);
      assert.equal(sim.dryRun, true);
    });
  });

  // ── Template methods ──────────────────────────────────────────────────

  describe('template methods', () => {
    it('getTemplates() returns 24 items', () => {
      const templates = engine.getTemplates();
      assert.equal(templates.length, 24);
    });

    it('getTemplatesByDomain("devops") returns 3 templates', () => {
      const templates = engine.getTemplatesByDomain('devops');
      assert.equal(templates.length, 3);
    });

    it('getTemplatesByDomain("finance") returns 3 templates', () => {
      const templates = engine.getTemplatesByDomain('finance');
      assert.equal(templates.length, 3);
    });

    it('processTemplate("fin-001") returns a CopilotResult', () => {
      const result = engine.processTemplate('fin-001');
      assert.ok('workflow' in result);
      assert.ok('simulation' in result);
      assert.ok('validation' in result);
    });

    it('processTemplate("fin-001") simulation.dryRun is true', () => {
      const result = engine.processTemplate('fin-001');
      assert.equal(result.simulation.dryRun, true);
    });

    it('processTemplate with unknown id throws', () => {
      assert.throws(
        () => engine.processTemplate('nonexistent-id-xyz'),
        /not found/i,
      );
    });
  });

  // ── Telemetry events ──────────────────────────────────────────────────

  describe('telemetry events', () => {
    it('telemetry events are emitted after process()', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      assert.ok(telemetry.getEvents().length > 0);
    });

    it('workflow.generated or workflow.failed_validation event is emitted', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      const events = telemetry.getEvents();
      const hasExpected = events.some(
        (e) =>
          e.type === 'workflow.generated' ||
          e.type === 'workflow.failed_validation',
      );
      assert.ok(hasExpected, 'Expected workflow.generated or workflow.failed_validation event');
    });

    it('workflow.validated event is emitted', () => {
      telemetry.clear();
      // validate() emits an event directly
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      engine.validate(dag);
      const events = telemetry.getEvents();
      const hasValidated = events.some(
        (e) => e.type === 'workflow.validated' || e.type === 'workflow.failed_validation',
      );
      assert.ok(hasValidated, 'Expected a validation event');
    });

    it('workflow.simulated event is emitted', () => {
      telemetry.clear();
      const intent = engine.parse(SPRINT_EN);
      const dag = engine.plan(intent);
      const validation = engine.validate(dag);
      const workflow = engine.generate(dag, intent, validation);
      engine.simulate(workflow);
      const events = telemetry.getEvents();
      assert.ok(events.some((e) => e.type === 'workflow.simulated'));
    });

    it('all telemetry events have a workflowId', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      for (const event of telemetry.getEvents()) {
        assert.ok(
          typeof event.workflowId === 'string' && event.workflowId.length > 0,
          `Event ${event.type} missing workflowId`,
        );
      }
    });

    it('telemetry events have a timestamp string', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      for (const event of telemetry.getEvents()) {
        assert.ok(typeof event.timestamp === 'string' && event.timestamp.length > 0);
      }
    });

    it('telemetry events contain no "instruction" field in metadata (no PII)', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      for (const event of telemetry.getEvents()) {
        assert.ok(
          !('instruction' in event.metadata),
          `Event ${event.type} leaks instruction in metadata`,
        );
      }
    });

    it('metadata.stepCount is a number when present', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      for (const event of telemetry.getEvents()) {
        if ('stepCount' in event.metadata) {
          assert.ok(
            typeof event.metadata.stepCount === 'number',
            `stepCount should be a number, got ${typeof event.metadata.stepCount}`,
          );
        }
      }
    });

    it('metadata.connectorCount is a number when present', () => {
      telemetry.clear();
      engine.process(SPRINT_EN);
      for (const event of telemetry.getEvents()) {
        if ('connectorCount' in event.metadata) {
          assert.ok(
            typeof event.metadata.connectorCount === 'number',
            `connectorCount should be a number`,
          );
        }
      }
    });
  });

  // ── Unknown / minimal instruction ─────────────────────────────────────

  describe('edge cases', () => {
    it('process() with unknown/minimal instruction returns result without throwing', () => {
      assert.doesNotThrow(() => engine.process('Do something.'));
    });

    it('result from minimal instruction has a summary', () => {
      const result = engine.process('Do something.');
      assert.ok(typeof result.summary === 'string');
    });

    it('getCatalog() returns a ConnectorCatalog instance', () => {
      const catalog = engine.getCatalog();
      assert.ok(catalog !== null && catalog !== undefined);
      assert.ok(typeof catalog.isConnectorAvailable === 'function');
    });
  });
});
