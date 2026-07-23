import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationStudio, SimulationNotFoundError } from '../src/index';
import { createStudio, createTestWorkflow, createTestWorkflowWithDecision } from './helpers';

describe('Simulation', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should run simulation on valid workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    assert.equal(sim.status, 'completed');
    assert.ok(sim.result);
    assert.equal(sim.result!.status, 'completed');
    assert.ok(sim.result!.nodeResults.length > 0);
  });

  it('should track the path through nodes', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    assert.ok(sim.result!.path.nodeIds.length >= 3);
    assert.ok(sim.result!.path.edges.length >= 2);
  });

  it('should record decisions from decision nodes', async () => {
    const wfId = await createTestWorkflowWithDecision(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    assert.ok(sim.result!.decisions.length > 0);
    const decision = sim.result!.decisions[0]!;
    assert.ok(decision.branch === 'true' || decision.branch === 'false');
  });

  it('should track tools used', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Tool Workflow',
      description: 'Uses a tool',
      category: 'custom',
      createdBy: 'test-user',
    });

    const trigger = await studio.builder.addNode({
      workflowId: wf.id, type: 'trigger', label: 'Start', positionX: 100, positionY: 100, config: { eventType: 'manual' },
    });
    const tool = await studio.builder.addNode({
      workflowId: wf.id, type: 'tool', label: 'My Tool', positionX: 300, positionY: 100,
      config: { toolId: 'ocr-tool', config: {} },
    });
    const end = await studio.builder.addNode({
      workflowId: wf.id, type: 'end', label: 'End', positionX: 500, positionY: 100, config: {},
    });
    await studio.builder.addConnection({ workflowId: wf.id, fromNodeId: trigger.id, toNodeId: tool.id, fromPort: 'out', toPort: 'in' });
    await studio.builder.addConnection({ workflowId: wf.id, fromNodeId: tool.id, toNodeId: end.id, fromPort: 'out', toPort: 'in' });

    const updatedWf = await studio.workflows.findById(wf.id);
    const sim = await studio.simulation.runSimulation(updatedWf, {
      organizationId: 'test-org',
      workflowId: wf.id,
      triggeredBy: 'test-user',
    });

    assert.ok(sim.result!.toolsUsed.length > 0);
    assert.equal(sim.result!.toolsUsed[0]!.toolName, 'ocr-tool');
  });

  it('should calculate estimated cost', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    assert.ok(sim.result!.estimatedCost >= 0);
  });

  it('should calculate average confidence', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    assert.ok(sim.result!.averageConfidence > 0);
    assert.ok(sim.result!.averageConfidence <= 1);
  });

  it('should fail simulation on invalid workflow', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Empty',
      description: 'No nodes',
      category: 'custom',
      createdBy: 'test-user',
    });

    await assert.rejects(
      studio.simulation.runSimulation(wf, {
        organizationId: 'test-org',
        workflowId: wf.id,
        triggeredBy: 'test-user',
      }),
    );
  });

  it('should find simulation by ID', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org',
      workflowId: wfId,
      triggeredBy: 'test-user',
    });

    const found = await studio.simulation.findById(sim.id);
    assert.equal(found.id, sim.id);
  });

  it('should throw SimulationNotFoundError for unknown ID', async () => {
    await assert.rejects(
      studio.simulation.findById('unknown-sim'),
      SimulationNotFoundError,
    );
  });

  it('should find simulations by workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org', workflowId: wfId, triggeredBy: 'user1',
    });

    const sims = await studio.simulation.findByWorkflow(wfId);
    assert.ok(sims.length > 0);
  });
});
