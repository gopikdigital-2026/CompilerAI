import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AutomationStudio } from '../src/index';
import { createStudio, createTestWorkflow } from './helpers';

describe('Templates', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should have 7 predefined templates', () => {
    const templates = studio.templates.getTemplates();
    assert.equal(templates.length, 7);
  });

  it('should include customer service template', () => {
    const templates = studio.templates.getTemplates();
    const cs = templates.find((t) => t.id === 'tpl_customer_service');
    assert.ok(cs);
    assert.equal(cs!.category, 'customer_service');
  });

  it('should include all required categories', () => {
    const templates = studio.templates.getTemplates();
    const categories = templates.map((t) => t.category);
    const required = ['customer_service', 'email_classification', 'document_management', 'invoice_approval', 'hr', 'sales', 'it_support'];
    for (const cat of required) {
      assert.ok(categories.includes(cat as never), `Missing category: ${cat}`);
    }
  });

  it('should create a workflow from template', async () => {
    const wf = await studio.templates.createFromTemplate(
      'tpl_customer_service',
      'test-org',
      'test-user',
    );

    assert.equal(wf.name, 'Atención al Cliente');
    assert.equal(wf.status, 'draft');
    assert.ok(wf.nodes.length > 0);
    assert.ok(wf.connections.length > 0);
  });

  it('should create workflow with override name', async () => {
    const wf = await studio.templates.createFromTemplate(
      'tpl_invoice_approval',
      'test-org',
      'test-user',
      'Custom Invoice Flow',
    );

    assert.equal(wf.name, 'Custom Invoice Flow');
  });

  it('should search templates by name', () => {
    const results = studio.templates.searchTemplates('factura');
    assert.ok(results.length > 0);
    assert.ok(results.some((t) => t.category === 'invoice_approval'));
  });

  it('should search templates by tag', () => {
    const results = studio.templates.searchTemplates('support');
    assert.ok(results.length > 0);
  });
});

describe('Monitor', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should create a monitor for an execution', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-1', 'wf-1', 1);
    assert.equal(monitor.executionId, 'exec-1');
    assert.equal(monitor.status, 'running');
    assert.equal(monitor.activeNodes.length, 0);
  });

  it('should record node_started event', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-2', 'wf-2', 1);
    const updated = await studio.monitor.recordEvent(monitor.id, {
      executionId: 'exec-2',
      organizationId: 'test-org',
      type: 'node_started',
      level: 'info',
      nodeId: 'node-1',
      nodeType: 'ai_agent',
      nodeLabel: 'AI Process',
      message: 'Node started',
      data: {},
    });

    assert.ok(updated.activeNodes.includes('node-1'));
    assert.ok(updated.events.length > 0);
  });

  it('should record node_completed event', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-3', 'wf-3', 1);
    await studio.monitor.recordEvent(monitor.id, {
      executionId: 'exec-3', organizationId: 'test-org', type: 'node_started', level: 'info',
      nodeId: 'n1', nodeType: 'trigger', nodeLabel: 'T', message: 'started', data: {},
    });
    const updated = await studio.monitor.recordEvent(monitor.id, {
      executionId: 'exec-3', organizationId: 'test-org', type: 'node_completed', level: 'info',
      nodeId: 'n1', nodeType: 'trigger', nodeLabel: 'T', message: 'completed', data: {},
    });

    assert.ok(!updated.activeNodes.includes('n1'));
    assert.ok(updated.completedNodes.includes('n1'));
  });

  it('should record node_failed event', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-4', 'wf-4', 1);
    const updated = await studio.monitor.recordEvent(monitor.id, {
      executionId: 'exec-4', organizationId: 'test-org', type: 'node_failed', level: 'error',
      nodeId: 'n1', nodeType: 'tool', nodeLabel: 'Tool', message: 'failed', data: { error: 'timeout' },
    });

    assert.ok(updated.failedNodes.includes('n1'));
  });

  it('should handle pending approvals', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-5', 'wf-5', 1);
    const withApproval = await studio.monitor.addPendingApproval(monitor.id, {
      nodeId: 'approval-1', nodeLabel: 'Approve', requestedAt: '2026-01-01', requestedBy: 'user1',
    });

    assert.equal(withApproval.pendingApprovals.length, 1);
    assert.equal(withApproval.pendingApprovals[0]!.status, 'pending');

    const resolved = await studio.monitor.resolveApproval(monitor.id, 'approval-1', true, 'manager1', 'Looks good');
    assert.equal(resolved.pendingApprovals[0]!.status, 'approved');
    assert.equal(resolved.pendingApprovals[0]!.decidedBy, 'manager1');
  });

  it('should track checkpoints', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-6', 'wf-6', 1);
    const withCp = await studio.monitor.addCheckpoint(monitor.id, {
      nodeId: 'n1', sequenceNumber: 1, intermediateState: { data: 'checkpoint' },
    });

    assert.equal(withCp.checkpoints.length, 1);
    assert.ok(withCp.checkpoints[0]!.checkpointId);
  });

  it('should complete a monitor', async () => {
    const monitor = await studio.monitor.createMonitor('test-org', 'exec-7', 'wf-7', 1);
    const completed = await studio.monitor.completeMonitor(monitor.id, true);
    assert.equal(completed.status, 'completed');
    assert.ok(completed.completedAt);
  });

  it('should get monitors by organization', async () => {
    await studio.monitor.createMonitor('test-org', 'exec-8', 'wf-8', 1);
    await studio.monitor.createMonitor('test-org', 'exec-9', 'wf-9', 1);
    const monitors = await studio.monitor.getByOrganization('test-org');
    assert.ok(monitors.length >= 2);
  });
});

describe('Collaboration', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should add a comment to a workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const comment = await studio.collaboration.addComment({
      organizationId: 'test-org',
      workflowId: wfId,
      nodeId: null,
      authorId: 'user1',
      authorName: 'Alice',
      body: 'This workflow needs improvement',
    });

    assert.equal(comment.body, 'This workflow needs improvement');
    assert.equal(comment.resolved, false);
  });

  it('should resolve a comment', async () => {
    const wfId = await createTestWorkflow(studio);
    const comment = await studio.collaboration.addComment({
      organizationId: 'test-org', workflowId: wfId, authorId: 'u1', authorName: 'A', body: 'test',
    });

    const resolved = await studio.collaboration.resolveComment(comment.id);
    assert.equal(resolved.resolved, true);
  });

  it('should get comments for a workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.collaboration.addComment({
      organizationId: 'test-org', workflowId: wfId, authorId: 'u1', authorName: 'A', body: 'c1',
    });
    await studio.collaboration.addComment({
      organizationId: 'test-org', workflowId: wfId, authorId: 'u2', authorName: 'B', body: 'c2',
    });

    const comments = await studio.collaboration.getComments(wfId);
    assert.equal(comments.length, 2);
  });

  it('should request a review', async () => {
    const wfId = await createTestWorkflow(studio);
    const review = await studio.collaboration.requestReview({
      organizationId: 'test-org',
      workflowId: wfId,
      workflowVersion: 1,
      reviewerId: 'reviewer1',
      reviewerName: 'Bob',
      summary: 'Please review this workflow',
    });

    assert.equal(review.status, 'pending');
    assert.equal(review.reviewerName, 'Bob');
  });

  it('should complete a review with approval', async () => {
    const wfId = await createTestWorkflow(studio);
    const review = await studio.collaboration.requestReview({
      organizationId: 'test-org', workflowId: wfId, workflowVersion: 1,
      reviewerId: 'r1', reviewerName: 'R', summary: 'review',
    });

    const completed = await studio.collaboration.completeReview(review.id, 'approved', ['Looks good']);
    assert.equal(completed.status, 'approved');
    assert.ok(completed.completedAt);
    assert.deepEqual(completed.comments, ['Looks good']);
  });

  it('should record and retrieve change history', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.collaboration.recordChange(
      'test-org', wfId, 'workflow_updated', 'u1', 'Alice', 'Updated workflow name',
    );

    const history = await studio.collaboration.getChangeHistory(wfId);
    assert.equal(history.length, 1);
    assert.equal(history[0]!.action, 'workflow_updated');
  });
});

describe('Component Library', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should return empty components when no adapters configured', () => {
    const components = studio.components.getAvailableComponents('test-org');
    assert.equal(components.length, 0);
  });

  it('should get component library with empty bindings', () => {
    const lib = studio.components.getComponentLibrary('test-org', 'wf-1');
    assert.ok(lib.components !== undefined);
    assert.deepEqual(lib.bindings, []);
  });

  it('should return null for unknown component', () => {
    const comp = studio.components.getComponent('unknown');
    assert.equal(comp, null);
  });
});

describe('Security', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should allow all actions with NullIdentityAdapter', async () => {
    const ctx = { userId: 'u1', organizationId: 'org1', roleNames: ['OrganizationAdmin'] };
    const allowed = await studio.security.checkPermission(ctx, 'workflow:create');
    assert.ok(allowed);
  });

  it('should validate before publish', async () => {
    const wfId = await createTestWorkflow(studio);
    const wf = await studio.workflows.findById(wfId);
    const result = studio.security.validateBeforePublish(wf);
    assert.ok(result.valid);
  });

  it('should fail validation for empty workflow', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org', name: 'Empty', description: '', category: 'custom', createdBy: 'u1',
    });
    const result = studio.security.validateBeforePublish(wf);
    assert.ok(!result.valid);
  });

  it('should audit changes', async () => {
    const ctx = { userId: 'u1', organizationId: 'org1', roleNames: ['OrganizationAdmin'] };
    const entry = await studio.security.auditChange(ctx, 'wf-1', 'workflow_updated', 'Updated name');
    assert.equal(entry.action, 'workflow_updated');
    assert.equal(entry.description, 'Updated name');
  });

  it('should expose permission map', () => {
    const map = studio.security.getPermissionMap();
    assert.ok(map['workflow:create']);
    assert.ok(map['workflow:publish']);
    assert.ok(map['workflow:rollback']);
  });
});

describe('Integration: Full workflow lifecycle', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should create from template, simulate, publish, then unpublish', async () => {
    const wf = await studio.templates.createFromTemplate('tpl_it_support', 'test-org', 'test-user');

    const sim = await studio.simulation.runSimulation(wf, {
      organizationId: 'test-org', workflowId: wf.id, triggeredBy: 'test-user',
    });
    assert.equal(sim.status, 'completed');

    const pub = await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wf.id, publishedBy: 'test-user', changelog: 'v1',
    });
    assert.equal(pub.status, 'active');

    const unpub = await studio.publishing.unpublish(wf.id, 'test-user');
    assert.equal(unpub.status, 'inactive');
  });

  it('should create, export, import, and simulate the imported copy', async () => {
    const wfId = await createTestWorkflow(studio);
    const exported = await studio.publishing.export(wfId);
    const imported = await studio.publishing.import({
      organizationId: 'test-org', createdBy: 'test-user', data: exported,
    });

    const sim = await studio.simulation.runSimulation(imported, {
      organizationId: 'test-org', workflowId: imported.id, triggeredBy: 'test-user',
    });
    assert.equal(sim.status, 'completed');
    assert.ok(sim.result!.nodeResults.length > 0);
  });
});
