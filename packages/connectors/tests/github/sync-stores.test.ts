import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryRepositorySyncStore,
  InMemoryIssueSyncStore,
  InMemoryPullRequestSyncStore,
  InMemoryWorkflowRunSyncStore,
  InMemoryGitHubSyncCheckpointStore,
} from '../../src/index';
import type { GitHubRepository } from '../../src/providers/github/types/GitHubRepository';
import type { GitHubIssue } from '../../src/providers/github/types/GitHubIssue';
import type { GitHubPullRequest } from '../../src/providers/github/types/GitHubPullRequest';
import type { GitHubWorkflowRun } from '../../src/providers/github/types/GitHubWorkflowRun';

const ORG = 'org-1';
const INST = 123;

function makeRepo(id: number, updatedAt: string): GitHubRepository {
  return {
    id, name: `repo-${id}`, fullName: `owner/repo-${id}`,
    description: null, privateRepo: false, fork: false,
    defaultBranch: 'main', starsCount: 0, forksCount: 0,
    watchersCount: 0, openIssuesCount: 0, language: null,
    license: null, createdAt: '2024-01-01T00:00:00Z',
    updatedAt,
    owner: { id: 1, login: 'owner', profileUrl: 'https://github.com/owner' },
    htmlUrl: `https://github.com/owner/repo-${id}`,
  } as GitHubRepository;
}

function makeIssue(id: number, updatedAt: string, state: 'open' | 'closed' = 'open'): GitHubIssue {
  return {
    id, number: id, title: `Issue ${id}`, body: null,
    state, author: null, assignees: [], labels: [],
    milestone: null, commentsCount: 0,
    htmlUrl: `https://github.com/owner/repo/issues/${id}`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt,
    closedAt: null,
  } as GitHubIssue;
}

function makePR(id: number, updatedAt: string, state: 'open' | 'closed' = 'open'): GitHubPullRequest {
  return {
    id, number: id, title: `PR ${id}`, body: null,
    state, draft: false, merged: false, mergeable: null,
    author: null, assignees: [], reviewers: [],
    labels: [], headRef: 'feature', baseRef: 'main',
    additions: 0, deletions: 0, changedFiles: 0,
    commits: 0,
    htmlUrl: `https://github.com/owner/repo/pull/${id}`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt,
    closedAt: null,
  } as GitHubPullRequest;
}

function makeWorkflowRun(id: number, updatedAt: string, status: 'queued' | 'in_progress' | 'completed' = 'completed'): GitHubWorkflowRun {
  return {
    id, name: `Run ${id}`, headBranch: 'main', headSha: 'abc123',
    status, conclusion: status === 'completed' ? 'success' : null,
    htmlUrl: `https://github.com/owner/repo/actions/runs/${id}`,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt,
  } as GitHubWorkflowRun;
}

describe('Sync Stores — idempotent upsert', () => {
  it('should create on first upsert', async () => {
    const store = new InMemoryRepositorySyncStore();
    const result = await store.upsert(ORG, INST, makeRepo(1, '2024-01-01T00:00:00Z'));
    assert.equal(result.action, 'created');
    assert.equal(await store.count(ORG, INST), 1);
  });

  it('should update on second upsert with changed data', async () => {
    const store = new InMemoryRepositorySyncStore();
    await store.upsert(ORG, INST, makeRepo(1, '2024-01-01T00:00:00Z'));
    const result = await store.upsert(ORG, INST, makeRepo(1, '2024-02-01T00:00:00Z'));
    assert.equal(result.action, 'updated');
    assert.equal(await store.count(ORG, INST), 1);
  });

  it('should isolate by organization and installation', async () => {
    const store = new InMemoryRepositorySyncStore();
    await store.upsert(ORG, INST, makeRepo(1, '2024-01-01T00:00:00Z'));
    await store.upsert('org-2', INST, makeRepo(1, '2024-01-01T00:00:00Z'));
    assert.equal(await store.count(ORG, INST), 1);
    assert.equal(await store.count('org-2', INST), 1);
  });

  it('should find by github ID', async () => {
    const store = new InMemoryRepositorySyncStore();
    await store.upsert(ORG, INST, makeRepo(42, '2024-01-01T00:00:00Z'));
    const found = await store.findByGithubId(ORG, INST, 42);
    assert.ok(found);
    assert.equal(found.id, 42);
  });

  it('should batch upsert', async () => {
    const store = new InMemoryRepositorySyncStore();
    const repos = [makeRepo(1, '2024-01-01'), makeRepo(2, '2024-01-01'), makeRepo(3, '2024-01-01')];
    const results = await store.upsertBatch(ORG, INST, repos);
    assert.equal(results.length, 3);
    assert.equal(await store.count(ORG, INST), 3);
  });
});

describe('Issue Sync Store — skip unchanged', () => {
  it('should skip when updatedAt and state are unchanged', async () => {
    const store = new InMemoryIssueSyncStore();
    const issue = makeIssue(1, '2024-01-01T00:00:00Z', 'open');
    await store.upsert(ORG, INST, issue);
    const result = await store.upsert(ORG, INST, issue);
    assert.equal(result.action, 'skipped');
  });

  it('should update when state changes', async () => {
    const store = new InMemoryIssueSyncStore();
    await store.upsert(ORG, INST, makeIssue(1, '2024-01-01T00:00:00Z', 'open'));
    const result = await store.upsert(ORG, INST, makeIssue(1, '2024-01-01T00:00:00Z', 'closed'));
    assert.equal(result.action, 'updated');
  });
});

describe('PR Sync Store — idempotent', () => {
  it('should skip unchanged PRs', async () => {
    const store = new InMemoryPullRequestSyncStore();
    const pr = makePR(1, '2024-01-01T00:00:00Z');
    await store.upsert(ORG, INST, pr);
    const result = await store.upsert(ORG, INST, pr);
    assert.equal(result.action, 'skipped');
  });
});

describe('Workflow Run Sync Store — idempotent', () => {
  it('should skip unchanged workflow runs', async () => {
    const store = new InMemoryWorkflowRunSyncStore();
    const run = makeWorkflowRun(1, '2024-01-01T00:00:00Z');
    await store.upsert(ORG, INST, run);
    const result = await store.upsert(ORG, INST, run);
    assert.equal(result.action, 'skipped');
  });
});

describe('Checkpoint Store', () => {
  it('should save and load checkpoints', async () => {
    const store = new InMemoryGitHubSyncCheckpointStore();
    const checkpoint = {
      resourceType: 'issues' as const,
      cursor: 'abc123',
      lastUpdatedAt: '2024-01-01T00:00:00Z',
      page: 3,
      processedItems: 150,
    };
    await store.save(ORG, INST, 'owner/repo', 'issues', checkpoint);
    const loaded = await store.load(ORG, INST, 'owner/repo', 'issues');
    assert.deepEqual(loaded, checkpoint);
  });

  it('should return null when no checkpoint exists', async () => {
    const store = new InMemoryGitHubSyncCheckpointStore();
    const loaded = await store.load(ORG, INST, 'owner/repo', 'issues');
    assert.equal(loaded, null);
  });

  it('should clear checkpoints', async () => {
    const store = new InMemoryGitHubSyncCheckpointStore();
    await store.save(ORG, INST, 'owner/repo', 'issues', {
      resourceType: 'issues', cursor: 'x', lastUpdatedAt: null, page: 1, processedItems: 0,
    });
    await store.clear(ORG, INST, 'owner/repo', 'issues');
    assert.equal(await store.load(ORG, INST, 'owner/repo', 'issues'), null);
  });
});
