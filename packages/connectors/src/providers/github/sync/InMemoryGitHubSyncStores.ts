import type { UUID } from '../../../types/index';
import type { GitHubRepository } from '../types/GitHubRepository';
import type { GitHubIssue } from '../types/GitHubIssue';
import type { GitHubPullRequest } from '../types/GitHubPullRequest';
import type { GitHubWorkflowRun } from '../types/GitHubWorkflowRun';
import type {
  IGitHubRepositorySyncStore,
  IGitHubIssueSyncStore,
  IGitHubPullRequestSyncStore,
  IGitHubWorkflowRunSyncStore,
  UpsertResult,
} from './GitHubSyncRepository';

type CompositeKey = string;

function repoKey(orgId: UUID, installationId: number, githubId: number): CompositeKey {
  return `${orgId}:${installationId}:${githubId}`;
}

function issueKey(orgId: UUID, installationId: number, githubId: number): CompositeKey {
  return `${orgId}:${installationId}:${githubId}`;
}

export class InMemoryRepositorySyncStore implements IGitHubRepositorySyncStore {
  private readonly store: Map<CompositeKey, GitHubRepository> = new Map();
  private readonly orgIndex: Map<string, GitHubRepository[]> = new Map();

  async upsert(organizationId: UUID, installationId: number, repo: GitHubRepository): Promise<UpsertResult> {
    const key = repoKey(organizationId, installationId, repo.id);
    const existing = this.store.get(key);
    this.store.set(key, repo);
    this.updateOrgIndex(organizationId, installationId, repo);
    return { action: existing ? 'updated' : 'created' };
  }

  async upsertBatch(organizationId: UUID, installationId: number, repos: readonly GitHubRepository[]): Promise<UpsertResult[]> {
    const results: UpsertResult[] = [];
    for (const repo of repos) {
      results.push(await this.upsert(organizationId, installationId, repo));
    }
    return results;
  }

  async findByOrg(organizationId: UUID, installationId: number): Promise<GitHubRepository[]> {
    const key = `${organizationId}:${installationId}`;
    return [...(this.orgIndex.get(key) ?? [])];
  }

  async findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubRepository | null> {
    return this.store.get(repoKey(organizationId, installationId, githubId)) ?? null;
  }

  async count(organizationId: UUID, installationId: number): Promise<number> {
    const key = `${organizationId}:${installationId}`;
    return this.orgIndex.get(key)?.length ?? 0;
  }

  private updateOrgIndex(orgId: UUID, installationId: number, repo: GitHubRepository): void {
    const key = `${orgId}:${installationId}`;
    const list = this.orgIndex.get(key) ?? [];
    const idx = list.findIndex((r) => r.id === repo.id);
    if (idx >= 0) list[idx] = repo;
    else list.push(repo);
    this.orgIndex.set(key, list);
  }
}

export class InMemoryIssueSyncStore implements IGitHubIssueSyncStore {
  private readonly store: Map<CompositeKey, GitHubIssue> = new Map();
  private readonly orgIndex: Map<string, GitHubIssue[]> = new Map();

  async upsert(organizationId: UUID, installationId: number, issue: GitHubIssue): Promise<UpsertResult> {
    const key = issueKey(organizationId, installationId, issue.id);
    const existing = this.store.get(key);
    if (existing && this.isUnchanged(existing, issue)) {
      return { action: 'skipped' };
    }
    this.store.set(key, issue);
    this.updateOrgIndex(organizationId, installationId, issue);
    return { action: existing ? 'updated' : 'created' };
  }

  async upsertBatch(organizationId: UUID, installationId: number, issues: readonly GitHubIssue[]): Promise<UpsertResult[]> {
    const results: UpsertResult[] = [];
    for (const issue of issues) {
      results.push(await this.upsert(organizationId, installationId, issue));
    }
    return results;
  }

  async findByRepo(organizationId: UUID, installationId: number, _owner: string, _repo: string): Promise<GitHubIssue[]> {
    const key = `${organizationId}:${installationId}`;
    return [...(this.orgIndex.get(key) ?? [])];
  }

  async findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubIssue | null> {
    return this.store.get(issueKey(organizationId, installationId, githubId)) ?? null;
  }

  async count(organizationId: UUID, installationId: number): Promise<number> {
    const key = `${organizationId}:${installationId}`;
    return this.orgIndex.get(key)?.length ?? 0;
  }

  private isUnchanged(existing: GitHubIssue, incoming: GitHubIssue): boolean {
    return existing.updatedAt === incoming.updatedAt && existing.state === incoming.state;
  }

  private updateOrgIndex(orgId: UUID, installationId: number, issue: GitHubIssue): void {
    const key = `${orgId}:${installationId}`;
    const list = this.orgIndex.get(key) ?? [];
    const idx = list.findIndex((i) => i.id === issue.id);
    if (idx >= 0) list[idx] = issue;
    else list.push(issue);
    this.orgIndex.set(key, list);
  }
}

export class InMemoryPullRequestSyncStore implements IGitHubPullRequestSyncStore {
  private readonly store: Map<CompositeKey, GitHubPullRequest> = new Map();
  private readonly orgIndex: Map<string, GitHubPullRequest[]> = new Map();

  async upsert(organizationId: UUID, installationId: number, pr: GitHubPullRequest): Promise<UpsertResult> {
    const key = issueKey(organizationId, installationId, pr.id);
    const existing = this.store.get(key);
    if (existing && this.isUnchanged(existing, pr)) {
      return { action: 'skipped' };
    }
    this.store.set(key, pr);
    this.updateOrgIndex(organizationId, installationId, pr);
    return { action: existing ? 'updated' : 'created' };
  }

  async upsertBatch(organizationId: UUID, installationId: number, prs: readonly GitHubPullRequest[]): Promise<UpsertResult[]> {
    const results: UpsertResult[] = [];
    for (const pr of prs) {
      results.push(await this.upsert(organizationId, installationId, pr));
    }
    return results;
  }

  async findByRepo(organizationId: UUID, installationId: number, _owner: string, _repo: string): Promise<GitHubPullRequest[]> {
    const key = `${organizationId}:${installationId}`;
    return [...(this.orgIndex.get(key) ?? [])];
  }

  async findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubPullRequest | null> {
    return this.store.get(issueKey(organizationId, installationId, githubId)) ?? null;
  }

  async count(organizationId: UUID, installationId: number): Promise<number> {
    const key = `${organizationId}:${installationId}`;
    return this.orgIndex.get(key)?.length ?? 0;
  }

  private isUnchanged(existing: GitHubPullRequest, incoming: GitHubPullRequest): boolean {
    return existing.updatedAt === incoming.updatedAt && existing.state === incoming.state;
  }

  private updateOrgIndex(orgId: UUID, installationId: number, pr: GitHubPullRequest): void {
    const key = `${orgId}:${installationId}`;
    const list = this.orgIndex.get(key) ?? [];
    const idx = list.findIndex((p) => p.id === pr.id);
    if (idx >= 0) list[idx] = pr;
    else list.push(pr);
    this.orgIndex.set(key, list);
  }
}

export class InMemoryWorkflowRunSyncStore implements IGitHubWorkflowRunSyncStore {
  private readonly store: Map<CompositeKey, GitHubWorkflowRun> = new Map();
  private readonly orgIndex: Map<string, GitHubWorkflowRun[]> = new Map();

  async upsert(organizationId: UUID, installationId: number, run: GitHubWorkflowRun): Promise<UpsertResult> {
    const key = issueKey(organizationId, installationId, run.id);
    const existing = this.store.get(key);
    if (existing && this.isUnchanged(existing, run)) {
      return { action: 'skipped' };
    }
    this.store.set(key, run);
    this.updateOrgIndex(organizationId, installationId, run);
    return { action: existing ? 'updated' : 'created' };
  }

  async upsertBatch(organizationId: UUID, installationId: number, runs: readonly GitHubWorkflowRun[]): Promise<UpsertResult[]> {
    const results: UpsertResult[] = [];
    for (const run of runs) {
      results.push(await this.upsert(organizationId, installationId, run));
    }
    return results;
  }

  async findByRepo(organizationId: UUID, installationId: number, _owner: string, _repo: string): Promise<GitHubWorkflowRun[]> {
    const key = `${organizationId}:${installationId}`;
    return [...(this.orgIndex.get(key) ?? [])];
  }

  async findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubWorkflowRun | null> {
    return this.store.get(issueKey(organizationId, installationId, githubId)) ?? null;
  }

  async count(organizationId: UUID, installationId: number): Promise<number> {
    const key = `${organizationId}:${installationId}`;
    return this.orgIndex.get(key)?.length ?? 0;
  }

  private isUnchanged(existing: GitHubWorkflowRun, incoming: GitHubWorkflowRun): boolean {
    return existing.updatedAt === incoming.updatedAt && existing.status === incoming.status;
  }

  private updateOrgIndex(orgId: UUID, installationId: number, run: GitHubWorkflowRun): void {
    const key = `${orgId}:${installationId}`;
    const list = this.orgIndex.get(key) ?? [];
    const idx = list.findIndex((r) => r.id === run.id);
    if (idx >= 0) list[idx] = run;
    else list.push(run);
    this.orgIndex.set(key, list);
  }
}
