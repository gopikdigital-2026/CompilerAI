import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationStudio, ImportExportError } from '../src/index';
import { createStudio, createTestWorkflow } from './helpers';

describe('Import / Export', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should export a workflow to JSON format', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);

    assert.equal(exported.format, 'json');
    assert.ok(exported.exportedAt);
    assert.equal(exported.workflow.name, 'Test Workflow');
    assert.equal(exported.workflow.nodes.length, 3);
    assert.equal(exported.workflow.connections.length, 2);
  });

  it('should export nodes with correct types', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);
    const types = exported.workflow.nodes.map((n) => n.type);
    assert.ok(types.includes('trigger'));
    assert.ok(types.includes('ai_agent'));
    assert.ok(types.includes('end'));
  });

  it('should export connections with labels', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);
    const conn = exported.workflow.connections[0]!;
    assert.ok(conn.fromLabel);
    assert.ok(conn.toLabel);
    assert.equal(conn.fromPort, 'out');
    assert.equal(conn.toPort, 'in');
  });

  it('should import a valid workflow export', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);

    const imported = await studio.publishing.import({
      organizationId: 'import-org',
      createdBy: 'importer',
      data: exported,
      nameOverride: 'Imported Workflow',
    });

    assert.equal(imported.name, 'Imported Workflow');
    assert.equal(imported.organizationId, 'import-org');
    assert.equal(imported.status, 'draft');
    assert.equal(imported.nodes.length, 3);
    assert.equal(imported.connections.length, 2);
  });

  it('should import and preserve node configs', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);
    const imported = await studio.publishing.import({
      organizationId: 'import-org',
      createdBy: 'importer',
      data: exported,
    });

    const trigger = imported.nodes.find((n) => n.type === 'trigger');
    assert.ok(trigger);
    assert.equal(trigger!.config['eventType'], 'manual');
  });

  it('should reject invalid import format', async () => {
    await assert.rejects(
      studio.publishing.import({
        organizationId: 'org',
        createdBy: 'user',
        data: { format: 'xml', version: '1', exportedAt: '', workflow: { name: '', description: '', category: '', tags: [], nodes: [], connections: [] } },
      }),
      ImportExportError,
    );
  });

  it('should reject import with no nodes', async () => {
    await assert.rejects(
      studio.publishing.import({
        organizationId: 'org',
        createdBy: 'user',
        data: {
          format: 'json', version: '1.0.0', exportedAt: '',
          workflow: { name: 'Empty', description: '', category: 'custom', tags: [], nodes: [], connections: [] },
        },
      }),
      ImportExportError,
    );
  });

  it('should round-trip export then import correctly', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);
    const imported = await studio.publishing.import({
      organizationId: 'rt-org',
      createdBy: 'rt-user',
      data: exported,
    });

    const reExported = await studio.publishing.export(imported.id);
    assert.equal(reExported.workflow.nodes.length, exported.workflow.nodes.length);
    assert.equal(reExported.workflow.connections.length, exported.workflow.connections.length);
  });
});
