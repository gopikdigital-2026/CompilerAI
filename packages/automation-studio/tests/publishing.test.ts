import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  AutomationStudio,
  WorkflowValidationError,
  WorkflowAlreadyPublishedError,
  WorkflowNotPublishedError,
  PublicationNotFoundError,
} from '../src/index';
import { createStudio, createTestWorkflow } from './helpers';

describe('Publishing', () => {
  let studio: AutomationStudio;

  beforeEach(async () => {
    studio = await createStudio();
  });

  it('should publish a valid workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const pub = await studio.publishing.publish({
      organizationId: 'test-org',
      workflowId: wfId,
      publishedBy: 'test-user',
      changelog: 'Initial publish',
    });

    assert.equal(pub.status, 'active');
    assert.equal(pub.publishedBy, 'test-user');
    assert.ok(pub.publishedAt);

    const wf = await studio.workflows.findById(wfId);
    assert.equal(wf.status, 'published');
    assert.ok(wf.currentVersion > 1);
    assert.equal(wf.versions.length, 1);
  });

  it('should not publish an invalid workflow', async () => {
    const wf = await studio.workflows.create({
      organizationId: 'test-org',
      name: 'Invalid',
      description: 'No nodes',
      category: 'custom',
      createdBy: 'test-user',
    });

    await assert.rejects(
      studio.publishing.publish({
        organizationId: 'test-org',
        workflowId: wf.id,
        publishedBy: 'test-user',
        changelog: 'test',
      }),
      WorkflowValidationError,
    );
  });

  it('should not publish an already-published workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v1',
    });

    await assert.rejects(
      studio.publishing.publish({
        organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v2',
      }),
      WorkflowAlreadyPublishedError,
    );
  });

  it('should unpublish a published workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v1',
    });

    const pub = await studio.publishing.unpublish(wfId, 'u1');
    assert.equal(pub.status, 'inactive');
    assert.ok(pub.unpublishedAt);

    const wf = await studio.workflows.findById(wfId);
    assert.equal(wf.status, 'unpublished');
  });

  it('should not unpublish a non-published workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    await assert.rejects(
      studio.publishing.unpublish(wfId, 'u1'),
      WorkflowNotPublishedError,
    );
  });

  it('should clone a workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    const clone = await studio.publishing.clone(wfId, 'Cloned Workflow', 'user2');

    assert.notEqual(clone.id, wfId);
    assert.equal(clone.name, 'Cloned Workflow');
    assert.equal(clone.status, 'draft');
    assert.equal(clone.nodes.length, 3);
  });

  it('should get publications for a workflow', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v1',
    });

    const pubs = await studio.publishing.getPublications(wfId);
    assert.equal(pubs.length, 1);
  });

  it('should get active publication', async () => {
    const wfId = await createTestWorkflow(studio);
    await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v1',
    });

    const active = await studio.publishing.getActivePublication(wfId);
    assert.ok(active);
    assert.equal(active!.status, 'active');
  });

  it('should rollback to a previous version', async () => {
    const wfId = await createTestWorkflow(studio);
    const pub = await studio.publishing.publish({
      organizationId: 'test-org', workflowId: wfId, publishedBy: 'u1', changelog: 'v1',
    });

    const rolled = await studio.publishing.rollback(wfId, pub.workflowVersion, 'u1');
    assert.equal(rolled.status, 'draft');
    assert.ok(rolled.metadata['rolledBackTo']);
  });

  it('should fail rollback to non-existent version', async () => {
    const wfId = await createTestWorkflow(studio);
    await assert.rejects(
      studio.publishing.rollback(wfId, 999, 'u1'),
      PublicationNotFoundError,
    );
  });
});
