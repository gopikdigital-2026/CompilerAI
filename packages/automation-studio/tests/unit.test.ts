import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationStudio, NodeRegistry, WorkflowValidationError } from '../src/index';
import { createStudio, createTestWorkflow, createTestWorkflowWithDecision } from './helpers';

describe('NodeRegistry', () => {
  let registry: NodeRegistry;

  beforeEach(() => {
    registry = new NodeRegistry();
  });

  it('should return all 10 node type definitions', () => {
    const defs = registry.getAllDefinitions();
    assert.equal(defs.length, 10);
  });

  it('should return definitions by category', () => {
    const actions = registry.getDefinitionsByCategory('action');
    assert.ok(actions.length >= 2);
    assert.ok(actions.every((d) => d.category === 'action'));
  });

  it('should validate node config for required fields', () => {
    const errors = registry.validateNodeConfig('ai_agent', {});
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => e.includes('Agent ID')));
  });

  it('should return no errors for valid config', () => {
    const errors = registry.validateNodeConfig('ai_agent', { agentId: 'a1', prompt: 'test' });
    assert.equal(errors.length, 0);
  });

  it('should validate connections', () => {
    const errors = registry.validateConnection('trigger', 'end', 'out', 'in');
    assert.equal(errors.length, 0);
  });

  it('should reject connection to trigger (no inputs)', () => {
    const errors = registry.validateConnection('ai_agent', 'trigger', 'out', 'in');
    assert.ok(errors.length > 0);
  });

  it('should return default config for a node type', () => {
    const config = registry.getDefaultConfig('delay');
    assert.ok(config['durationMs'] !== undefined);
  });

  it('should know all defined node types', () => {
    const types = ['trigger', 'ai_agent', 'decision', 'human_approval', 'tool', 'condition', 'loop', 'delay', 'notification', 'end'];
    for (const t of types) {
      assert.ok(registry.isKnownType(t), `Should know type: ${t}`);
    }
  });
});

describe('WorkflowValidator', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should validate a well-formed workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const result = studio.validator.validate(wf);
    assert.ok(result.valid, `Expected valid: ${result.errors.join('; ')}`);
  });

  it('should reject a workflow with no trigger', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'No Trigger',
      description: 'Missing trigger',
      category: 'custom',
      createdBy: 'test-user',
    });
    await studio.builder.addNode({
      workflowId: wf.id,
      type: 'end',
      label: 'End',
      positionX: 100,
      positionY: 100,
      config: {},
    });
    const updated = await studio.workflows.findById(wf.id);
    const result = studio.validator.validate(updated);
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes('trigger')));
  });

  it('should reject a workflow with multiple triggers', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Multi Trigger',
      description: 'Two triggers',
      category: 'custom',
      createdBy: 'test-user',
    });
    await studio.builder.addNode({
      workflowId: wf.id,
      type: 'trigger',
      label: 'T1',
      positionX: 100,
      positionY: 100,
      config: { eventType: 'manual' },
    });
    await studio.builder.addNode({
      workflowId: wf.id,
      type: 'trigger',
      label: 'T2',
      positionX: 200,
      positionY: 200,
      config: { eventType: 'manual' },
    });
    const updated = await studio.workflows.findById(wf.id);
    const result = studio.validator.validate(updated);
    assert.ok(!result.valid);
    assert.ok(result.errors.some((e) => e.includes('one trigger')));
  });

  it('should detect cycles', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Cycle',
      description: 'Cyclic workflow',
      category: 'custom',
      createdBy: 'test-user',
    });
    const n1 = await studio.builder.addNode({
      workflowId: wf.id, type: 'trigger', label: 'T', positionX: 100, positionY: 100, config: { eventType: 'manual' },
    });
    const n2 = await studio.builder.addNode({
      workflowId: wf.id, type: 'condition', label: 'C', positionX: 300, positionY: 100, config: { expression: 'x' },
    });
    await studio.builder.addConnection({ workflowId: wf.id, fromNodeId: n1.id, toNodeId: n2.id, fromPort: 'out', toPort: 'in' });
    await studio.builder.addConnection({ workflowId: wf.id, fromNodeId: n2.id, toNodeId: n1.id, fromPort: 'out', toPort: 'in' });
    const updated = await studio.workflows.findById(wf.id);
    const result = studio.validator.validate(updated);
    assert.ok(result.errors.some((e) => e.includes('cycle')));
  });

  it('should warn about unreachable nodes', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Unreachable',
      description: 'Has orphan node',
      category: 'custom',
      createdBy: 'test-user',
    });
    const trigger = await studio.builder.addNode({
      workflowId: wf.id, type: 'trigger', label: 'T', positionX: 100, positionY: 100, config: { eventType: 'manual' },
    });
    const end = await studio.builder.addNode({
      workflowId: wf.id, type: 'end', label: 'E', positionX: 300, positionY: 100, config: {},
    });
    await studio.builder.addNode({
      workflowId: wf.id, type: 'notification', label: 'Orphan', positionX: 500, positionY: 200,
      config: { channel: 'email', recipient: 'x@y.com', message: 'hi' },
    });
    await studio.builder.addConnection({ workflowId: wf.id, fromNodeId: trigger.id, toNodeId: end.id, fromPort: 'out', toPort: 'in' });
    const updated = await studio.workflows.findById(wf.id);
    const result = studio.validator.validate(updated);
    assert.ok(result.warnings.some((w) => w.includes('unreachable')));
  });

  it('should assertValid throws on invalid workflow', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: '',
      description: 'No name',
      category: 'custom',
      createdBy: 'test-user',
    });
    assert.throws(() => studio.validator.assertValid(wf), WorkflowValidationError);
  });

  it('should validate a workflow with decision branches', async () => {
    const wfId = await createTestWorkflowWithDecision(studio);
    const wf = await studio.workflows.findById(wfId);
    const result = studio.validator.validate(wf);
    assert.ok(result.valid, `Decision workflow should be valid: ${result.errors.join('; ')}`);
  });
});
