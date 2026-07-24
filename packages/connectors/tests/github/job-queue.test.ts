import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryGitHubSyncJobRepository,
  createSyncJob,
  createSyncJobDedupKey,
} from '../../src/index';

const ORG = 'org-1';
const INST = 123;

describe('Sync Job Queue — enqueue and dequeue', () => {
  it('should enqueue and dequeue jobs by priority', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    const lowJob = createSyncJob(ORG, INST, 'owner/repo', 'issues', { priority: 1 });
    const highJob = createSyncJob(ORG, INST, 'owner/repo', 'pull_requests', { priority: 10 });

    queue.enqueue(lowJob);
    queue.enqueue(highJob);

    const dequeued = queue.dequeue();
    assert.ok(dequeued);
    assert.equal(dequeued.priority, 10, 'Higher priority should dequeue first');
  });

  it('should not enqueue duplicate active jobs', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    const job = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    queue.enqueue(job);

    const duplicate = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    queue.enqueue(duplicate);

    assert.equal(queue.count(), 1, 'Duplicate should not be enqueued');
  });

  it('should allow re-enqueue after completion', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    const job = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    queue.enqueue(job);

    const dequeued = queue.dequeue()!;
    queue.update({ ...dequeued, state: 'completed' });

    const newJob = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    queue.enqueue(newJob);
    assert.equal(queue.count(), 2);
  });

  it('should find by dedup key', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    const job = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    queue.enqueue(job);

    const dedupKey = createSyncJobDedupKey(ORG, INST, 'owner/repo', 'issues');
    const found = queue.findByDedupKey(dedupKey);
    assert.ok(found);
    assert.equal(found.id, job.id);
  });

  it('should track dead letter jobs', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    const job = createSyncJob(ORG, INST, 'owner/repo', 'issues', { maxAttempts: 1 });
    queue.enqueue(job);
    const dequeued = queue.dequeue()!;
    queue.update({ ...dequeued, state: 'dead_letter', lastError: 'Failed' });

    const deadLetter = queue.getDeadLetterJobs();
    assert.equal(deadLetter.length, 1);
    assert.equal(deadLetter[0].state, 'dead_letter');
  });

  it('should clear all', () => {
    const queue = new InMemoryGitHubSyncJobRepository();
    queue.enqueue(createSyncJob(ORG, INST, 'owner/repo', 'issues'));
    queue.clear();
    assert.equal(queue.count(), 0);
  });
});

describe('createSyncJob — defaults', () => {
  it('should set sensible defaults', () => {
    const job = createSyncJob(ORG, INST, 'owner/repo', 'issues');
    assert.equal(job.state, 'queued');
    assert.equal(job.mode, 'incremental');
    assert.equal(job.maxAttempts, 3);
    assert.equal(job.maxPages, 10);
    assert.equal(job.priority, 0);
    assert.ok(job.dedupKey.includes(ORG));
    assert.ok(job.dedupKey.includes('owner/repo'));
    assert.ok(job.dedupKey.includes('issues'));
  });
});
