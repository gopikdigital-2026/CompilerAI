import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeploymentManager } from '../src/deployment/DeploymentManager.js';
import { NodeRegistry } from '../src/designer/NodeRegistry.js';
import { WorkflowValidator } from '../src/designer/WorkflowValidator.js';
import { NullRuntimeAdapter } from '../src/integrations/IntegrationAdapters.js';
import {
  createMinimalWorkflow,
  createAiWorkflow,
  buildWorkflow,
  makeNode,
  makeConnection,
  makeIdGenerator,
  fixedClock,
  MockRuntimeAdapter,
  createExportFormat,
} from './sprint28-helpers.js';

describe('DeploymentManager', () => {
  let registry: NodeRegistry;
  let validator: WorkflowValidator;
  let dm: DeploymentManager;

  beforeEach(() => {
    registry = new NodeRegistry();
    validator = new WorkflowValidator(registry);
    dm = new DeploymentManager(validator, new NullRuntimeAdapter(), makeIdGenerator(), fixedClock());
  });

  // --- publish ---

  it('publish returns success=true for valid workflow', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.ok(result.success);
  });

  it('publish returns success=false for invalid workflow', async () => {
    const wf = buildWorkflow([], []); // no nodes, no trigger
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.ok(!result.success);
    assert.ok(result.validationErrors.length > 0);
  });

  it('publish returns version number', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.ok(typeof result.version === 'number');
    assert.ok(result.version > wf.currentVersion);
  });

  it('publish returns deploymentId when runtime available', async () => {
    const dmWithRuntime = new DeploymentManager(
      validator,
      new MockRuntimeAdapter(true),
      makeIdGenerator(),
      fixedClock(),
    );
    const wf = createMinimalWorkflow();
    const result = await dmWithRuntime.publish(wf, 'user1', 'initial');
    assert.ok(result.deploymentId !== null);
    assert.ok(result.deploymentId!.length > 0);
  });

  it('publish returns deploymentId null when runtime not available', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.equal(result.deploymentId, null);
  });

  it('publish returns empty validationErrors for valid workflow', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.equal(result.validationErrors.length, 0);
  });

  it('publish returns message string', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.publish(wf, 'user1', 'initial');
    assert.ok(typeof result.message === 'string');
    assert.ok(result.message.length > 0);
  });

  // --- deactivate ---

  it('deactivate returns success for published workflow', async () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'published' },
    );
    const result = await dm.deactivate(wf, 'user1');
    assert.ok(result.success);
  });

  it('deactivate returns false for non-published workflow', async () => {
    const wf = createMinimalWorkflow(); // status: draft
    const result = await dm.deactivate(wf, 'user1');
    assert.ok(!result.success);
  });

  // --- activate ---

  it('activate returns success for published workflow', async () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'published' },
    );
    const result = await dm.activate(wf, 'user1');
    assert.ok(result.success);
  });

  it('activate returns false for draft workflow', async () => {
    const wf = createMinimalWorkflow(); // status: draft
    const result = await dm.activate(wf, 'user1');
    assert.ok(!result.success);
  });

  it('activate returns success for unpublished (previously published) workflow', async () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'unpublished' },
    );
    const result = await dm.activate(wf, 'user1');
    assert.ok(result.success);
  });

  // --- archive ---

  it('archive returns success', async () => {
    const wf = createMinimalWorkflow();
    const result = await dm.archive(wf, 'user1');
    assert.ok(result.success);
  });

  it('archive returns false for already-archived workflow', async () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'archived' },
    );
    const result = await dm.archive(wf, 'user1');
    assert.ok(!result.success);
  });

  // --- duplicate ---

  it('duplicate returns new workflow with different ID', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy of Minimal', 'user1');
    assert.notEqual(dup.id, wf.id);
  });

  it('duplicate returns new workflow with new name', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy of Minimal', 'user1');
    assert.equal(dup.name, 'Copy of Minimal');
  });

  it('duplicate returns draft status', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy', 'user1');
    assert.equal(dup.status, 'draft');
  });

  it('duplicate resets currentVersion to 1', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy', 'user1');
    assert.equal(dup.currentVersion, 1);
  });

  it('duplicate clears versions array', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy', 'user1');
    assert.equal(dup.versions.length, 0);
  });

  it('duplicate sets lastModifiedBy', async () => {
    const wf = createMinimalWorkflow();
    const dup = await dm.duplicate(wf, 'Copy', 'user1');
    assert.equal(dup.lastModifiedBy, 'user1');
  });

  it('duplicate clears publishedAt and publishedBy', async () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { publishedAt: '2026-01-01', publishedBy: 'user1' },
    );
    const dup = await dm.duplicate(wf, 'Copy', 'user2');
    assert.equal(dup.publishedAt, null);
    assert.equal(dup.publishedBy, null);
  });

  // --- exportWorkflow ---

  it('exportWorkflow returns ExportFormat with JSON', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    assert.equal(exported.format, 'json');
  });

  it('exportWorkflow includes nodes and connections', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    assert.ok(exported.workflow.nodes);
    assert.ok(exported.workflow.connections);
    assert.equal(exported.workflow.nodes.length, wf.nodes.length);
    assert.equal(exported.workflow.connections.length, wf.connections.length);
  });

  it('exportWorkflow includes version string', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    assert.ok(exported.version);
    assert.ok(exported.version.length > 0);
  });

  it('exportWorkflow includes exportedAt timestamp', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    assert.ok(exported.exportedAt);
  });

  it('exportWorkflow includes workflow name and description', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    assert.equal(exported.workflow.name, wf.name);
    assert.equal(exported.workflow.description, wf.description);
  });

  it('exportWorkflow maps connections with labels', () => {
    const wf = createMinimalWorkflow();
    const exported = dm.exportWorkflow(wf);
    // Connections use fromLabel/toLabel based on node labels.
    const conn = exported.workflow.connections[0]!;
    assert.ok(conn.fromLabel);
    assert.ok(conn.toLabel);
  });

  // --- importWorkflow ---

  it('importWorkflow creates new workflow from JSON', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'test-org', 'user1');
    assert.ok(imported.id);
    assert.equal(imported.name, data.workflow.name);
  });

  it('importWorkflow preserves node types', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'test-org', 'user1');
    assert.equal(imported.nodes[0]!.type, 'trigger');
    assert.equal(imported.nodes[1]!.type, 'tool');
    assert.equal(imported.nodes[2]!.type, 'end');
  });

  it('importWorkflow creates connections', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'test-org', 'user1');
    assert.equal(imported.connections.length, 2);
  });

  it('importWorkflow sets organizationId', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'my-org', 'user1');
    assert.equal(imported.organizationId, 'my-org');
  });

  it('importWorkflow sets status to draft', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'test-org', 'user1');
    assert.equal(imported.status, 'draft');
  });

  it('importWorkflow sets createdBy', async () => {
    const data = createExportFormat();
    const imported = await dm.importWorkflow(data, 'test-org', 'creator1');
    assert.equal(imported.createdBy, 'creator1');
  });

  it('importWorkflow throws on invalid format', async () => {
    const badData = { ...createExportFormat(), format: 'xml' as never };
    await assert.rejects(
      () => dm.importWorkflow(badData, 'test-org', 'user1'),
    );
  });

  it('importWorkflow throws on empty nodes', async () => {
    const data = createExportFormat();
    data.workflow.nodes = [];
    await assert.rejects(
      () => dm.importWorkflow(data, 'test-org', 'user1'),
    );
  });

  // --- getDeploymentInfo ---

  it('getDeploymentInfo returns status', () => {
    const wf = createMinimalWorkflow();
    const info = dm.getDeploymentInfo(wf);
    assert.ok(typeof info.status === 'string');
  });

  it('getDeploymentInfo returns version', () => {
    const wf = createMinimalWorkflow();
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.version, wf.currentVersion);
  });

  it('getDeploymentInfo returns activeExecutions=0', () => {
    const wf = createMinimalWorkflow();
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.activeExecutions, 0);
  });

  it('getDeploymentInfo returns workflowId and workflowName', () => {
    const wf = createMinimalWorkflow();
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.workflowId, wf.id);
    assert.equal(info.workflowName, wf.name);
  });

  it('getDeploymentInfo returns deploymentId null when not deployed', () => {
    const wf = createMinimalWorkflow();
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.deploymentId, null);
  });

  it('getDeploymentInfo maps published status to active', () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'published' },
    );
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.status, 'active');
  });

  it('getDeploymentInfo maps archived status to archived', () => {
    const wf = buildWorkflow(
      [
        makeNode({ id: 'n1', type: 'trigger', label: 'T', config: { eventType: 'manual' } }),
        makeNode({ id: 'n2', type: 'end', label: 'E', config: {} }),
      ],
      [makeConnection({ id: 'c1', fromNodeId: 'n1', toNodeId: 'n2' })],
      { status: 'archived' },
    );
    const info = dm.getDeploymentInfo(wf);
    assert.equal(info.status, 'archived');
  });
});
