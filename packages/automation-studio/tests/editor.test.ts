import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationStudio } from '../src/index';
import { createStudio, createTestWorkflow } from './helpers';

describe('Editor / WorkflowBuilder', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should add a node to a workflow', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Editor Test',
      description: 'test',
      category: 'custom',
      createdBy: 'user1',
    });

    const node = await studio.builder.addNode({
      workflowId: wf.id,
      type: 'trigger',
      label: 'My Trigger',
      positionX: 100,
      positionY: 200,
      config: { eventType: 'webhook' },
    });

    assert.equal(node.type, 'trigger');
    assert.equal(node.label, 'My Trigger');
    assert.equal(node.positionX, 100);
    assert.equal(node.positionY, 200);
    assert.equal(node.workflowId, wf.id);
  });

  it('should add a connection between nodes', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const trigger = nodes.find((n) => n.type === 'trigger')!;
    const ai = nodes.find((n) => n.type === 'ai_agent')!;

    const conn = await studio.builder.addConnection({
      workflowId: wfId,
      fromNodeId: trigger.id,
      toNodeId: ai.id,
      fromPort: 'out',
      toPort: 'in',
      label: 'data flow',
    });

    assert.equal(conn.fromNodeId, trigger.id);
    assert.equal(conn.toNodeId, ai.id);
    assert.equal(conn.label, 'data flow');
  });

  it('should remove a node and its connections', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const aiNode = nodes.find((n) => n.type === 'ai_agent')!;

    await studio.builder.removeNode(wfId, aiNode.id);

    const updatedNodes = await studio.builder.getNodes(wfId);
    assert.ok(!updatedNodes.some((n) => n.id === aiNode.id));

    const updatedConns = await studio.builder.getConnections(wfId);
    assert.ok(!updatedConns.some((c) => c.fromNodeId === aiNode.id || c.toNodeId === aiNode.id));
  });

  it('should update node config and validate', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const aiNode = nodes.find((n) => n.type === 'ai_agent')!;

    const updated = await studio.builder.updateNode(wfId, aiNode.id, {
      config: { agentId: '', prompt: 'new prompt' },
    });

    assert.equal(updated.config['prompt'], 'new prompt');
    assert.equal(updated.status, 'invalid');
    assert.ok(updated.validationErrors.length > 0);
  });

  it('should update node config to valid state', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const aiNode = nodes.find((n) => n.type === 'ai_agent')!;

    const updated = await studio.builder.updateNode(wfId, aiNode.id, {
      config: { agentId: 'agent-2', prompt: 'updated prompt' },
    });

    assert.equal(updated.status, 'valid');
    assert.equal(updated.validationErrors.length, 0);
  });

  it('should move a node to a new position', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const trigger = nodes.find((n) => n.type === 'trigger')!;

    const moved = await studio.builder.moveNode(wfId, trigger.id, 500, 600);
    assert.equal(moved.positionX, 500);
    assert.equal(moved.positionY, 600);
  });

  it('should remove a connection', async () => {
    const wfId = await createTestWorkflow(studio);
    const conns = await studio.builder.getConnections(wfId);
    assert.ok(conns.length > 0);

    await studio.builder.removeConnection(wfId, conns[0]!.id);
    const updated = await studio.builder.getConnections(wfId);
    assert.equal(updated.length, conns.length - 1);
  });

  it('should get all nodes and connections', async () => {
    const wfId = await createTestWorkflow(studio);
    const nodes = await studio.builder.getNodes(wfId);
    const conns = await studio.builder.getConnections(wfId);
    assert.equal(nodes.length, 3);
    assert.equal(conns.length, 2);
  });
});
