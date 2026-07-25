import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StudioApi } from '../src/api/StudioApi.js';
import type { CopilotWorkflowImport } from '../src/api/StudioApi.js';
import { InMemoryStudioTelemetry } from '../src/telemetry/StudioTelemetry.js';
import {
  makeIdGenerator,
  fixedClock,
  createMinimalWorkflow,
  createCopilotImport,
  MockConnectorSource,
} from './sprint28-helpers.js';

describe('StudioApi', () => {
  let api: StudioApi;

  beforeEach(() => {
    api = new StudioApi({
      idGenerator: makeIdGenerator(),
      clock: fixedClock(),
    });
  });

  // --- Component presence ---

  it('StudioApi has viewport component', () => {
    assert.ok(api.viewport);
  });

  it('StudioApi has selection component', () => {
    assert.ok(api.selection);
  });

  it('StudioApi has miniMap component', () => {
    assert.ok(api.miniMap);
  });

  it('StudioApi has autoLayout component', () => {
    assert.ok(api.autoLayout);
  });

  it('StudioApi has nodeLibrary component', () => {
    assert.ok(api.nodeLibrary);
  });

  it('StudioApi has inspector component', () => {
    assert.ok(api.inspector);
  });

  it('StudioApi has versionManager component', () => {
    assert.ok(api.versionManager);
  });

  it('StudioApi has deployment component', () => {
    assert.ok(api.deployment);
  });

  it('StudioApi has visualSimulation component', () => {
    assert.ok(api.visualSimulation);
  });

  it('StudioApi has telemetry component', () => {
    assert.ok(api.telemetry);
  });

  it('StudioApi has performance component', () => {
    assert.ok(api.performance);
  });

  it('StudioApi has validationFeedback component', () => {
    assert.ok(api.validationFeedback);
  });

  // --- importFromCopilot ---

  it('importFromCopilot creates a Workflow from Copilot DAG', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.ok(wf.id);
    assert.equal(wf.name, copilot.name);
    assert.equal(wf.description, copilot.description);
  });

  it('importFromCopilot maps trigger to trigger node', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    const triggerNode = wf.nodes.find((n) => n.id === 's_trigger');
    assert.ok(triggerNode);
    assert.equal(triggerNode!.type, 'trigger');
  });

  it('importFromCopilot maps actions to nodes', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.equal(wf.nodes.length, 5);
    // Check each step is mapped.
    for (const step of copilot.steps) {
      assert.ok(wf.nodes.some((n) => n.id === step.id), `Should have node ${step.id}`);
    }
  });

  it('importFromCopilot creates connections from edges', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.ok(wf.connections.length >= 4);
  });

  it('importFromCopilot auto-layouts nodes', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    // After layout, nodes should have non-zero positions (except possibly the first at 0,0).
    const positioned = wf.nodes.filter((n) => n.positionX !== 0 || n.positionY !== 0);
    assert.ok(positioned.length > 0, 'At least some nodes should be positioned by layout');
  });

  it('importFromCopilot sets organizationId', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'my-org-123', 'user1');
    assert.equal(wf.organizationId, 'my-org-123');
    for (const node of wf.nodes) {
      assert.equal(node.organizationId, 'my-org-123');
    }
  });

  it('importFromCopilot sets status to draft', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.equal(wf.status, 'draft');
  });

  it('importFromCopilot sets createdBy and lastModifiedBy', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'creator1');
    assert.equal(wf.createdBy, 'creator1');
    assert.equal(wf.lastModifiedBy, 'creator1');
  });

  it('importFromCopilot adds copilot tag', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.ok(wf.tags.includes('copilot'));
  });

  it('importFromCopilot stores copilot workflow ID in metadata', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    assert.equal(wf.metadata['source'], 'copilot');
    assert.equal(wf.metadata['copilotWorkflowId'], copilot.id);
  });

  it('importFromCopilot emits copilot.workflow_imported telemetry event', async () => {
    const telemetry = new InMemoryStudioTelemetry();
    const apiWithTelemetry = new StudioApi({
      idGenerator: makeIdGenerator(),
      clock: fixedClock(),
      telemetry,
    });
    const copilot = createCopilotImport();
    await apiWithTelemetry.importFromCopilot(copilot, 'test-org', 'user1');
    const events = telemetry.getEventsByType('copilot.workflow_imported');
    assert.equal(events.length, 1);
  });

  it('importFromCopilot preserves step parameters in node config', async () => {
    const copilot = createCopilotImport();
    const wf = await api.importFromCopilot(copilot, 'test-org', 'user1');
    const driveNode = wf.nodes.find((n) => n.id === 's_drive');
    assert.ok(driveNode);
    assert.equal(driveNode!.config['fileName'], 'test.txt');
  });

  // --- exportToCopilot ---

  it('exportToCopilot returns nodes and edges', () => {
    const wf = createMinimalWorkflow();
    const exported = api.exportToCopilot(wf);
    assert.ok(exported.nodes);
    assert.ok(exported.edges);
    assert.equal(exported.nodes.length, wf.nodes.length);
    assert.equal(exported.edges.length, wf.connections.length);
  });

  it('exportToCopilot maps workflow nodes to copilot format', () => {
    const wf = createMinimalWorkflow();
    const exported = api.exportToCopilot(wf);
    for (const node of exported.nodes) {
      assert.ok(typeof node.id === 'string');
      assert.ok(typeof node.type === 'string');
      assert.ok(typeof node.label === 'string');
    }
  });

  it('exportToCopilot maps connections to edges', () => {
    const wf = createMinimalWorkflow();
    const exported = api.exportToCopilot(wf);
    const edge = exported.edges[0]!;
    assert.ok(edge.from);
    assert.ok(edge.to);
  });

  it('exportToCopilot includes name and description', () => {
    const wf = createMinimalWorkflow();
    const exported = api.exportToCopilot(wf);
    assert.equal(exported.name, wf.name);
    assert.equal(exported.description, wf.description);
  });

  // --- Null / optional dependencies ---

  it('StudioApi with null telemetry does not throw', () => {
    assert.doesNotThrow(() => {
      new StudioApi({
        idGenerator: makeIdGenerator(),
        clock: fixedClock(),
        telemetry: null,
      });
    });
  });

  it('StudioApi with null telemetry still works for importFromCopilot', async () => {
    const apiNoTelemetry = new StudioApi({
      idGenerator: makeIdGenerator(),
      clock: fixedClock(),
      telemetry: null,
    });
    const copilot = createCopilotImport();
    const wf = await apiNoTelemetry.importFromCopilot(copilot, 'test-org', 'user1');
    assert.ok(wf);
  });

  it('StudioApi with connectorSource populates nodeLibrary', () => {
    const apiWithSource = new StudioApi({
      idGenerator: makeIdGenerator(),
      clock: fixedClock(),
      connectorSource: new MockConnectorSource(),
    });
    const connectors = apiWithSource.nodeLibrary.getAvailableConnectors();
    assert.ok(connectors.some((c) => c.connectorId === 'slack'));
  });

  it('StudioApi with no connectorSource still has nodeLibrary', () => {
    const connectors = api.nodeLibrary.getAvailableConnectors();
    assert.ok(connectors.length > 0);
  });

  it('StudioApi default telemetry is InMemoryStudioTelemetry', () => {
    // Verify telemetry accepts events (InMemoryStudioTelemetry behavior).
    api.telemetry.emit({
      type: 'workflow.created',
      timestamp: fixedClock()(),
      organizationId: 'org',
      workflowId: 'wf',
      userId: 'user',
      metadata: {},
    });
    assert.equal(api.telemetry.getEvents().length, 1);
  });

  it('StudioApi with null runtimeAdapter uses NullRuntimeAdapter (deploymentId null)', async () => {
    const apiNoRuntime = new StudioApi({
      idGenerator: makeIdGenerator(),
      clock: fixedClock(),
      runtimeAdapter: null,
    });
    const wf = createMinimalWorkflow();
    const result = await apiNoRuntime.deployment.publish(wf, 'user1', 'v1');
    assert.equal(result.deploymentId, null);
  });
});
