import type { UUID } from '../../../types/index';
import type { GitHubRepository } from '../types/GitHubRepository';
import type { GitHubIssue } from '../types/GitHubIssue';
import type { GitHubPullRequest } from '../types/GitHubPullRequest';
import type { GitHubWorkflowRun } from '../types/GitHubWorkflowRun';

export interface UpsertResult {
  readonly action: 'created' | 'updated' | 'skipped';
}

export interface IGitHubRepositorySyncStore {
  upsert(organizationId: UUID, installationId: number, repo: GitHubRepository): Promise<UpsertResult>;
  upsertBatch(organizationId: UUID, installationId: number, repos: readonly GitHubRepository[]): Promise<UpsertResult[]>;
  findByOrg(organizationId: UUID, installationId: number): Promise<GitHubRepository[]>;
  findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubRepository | null>;
  count(organizationId: UUID, installationId: number): Promise<number>;
}

export interface IGitHubIssueSyncStore {
  upsert(organizationId: UUID, installationId: number, issue: GitHubIssue): Promise<UpsertResult>;
  upsertBatch(organizationId: UUID, installationId: number, issues: readonly GitHubIssue[]): Promise<UpsertResult[]>;
  findByRepo(organizationId: UUID, installationId: number, owner: string, repo: string): Promise<GitHubIssue[]>;
  findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubIssue | null>;
  count(organizationId: UUID, installationId: number): Promise<number>;
}

export interface IGitHubPullRequestSyncStore {
  upsert(organizationId: UUID, installationId: number, pr: GitHubPullRequest): Promise<UpsertResult>;
  upsertBatch(organizationId: UUID, installationId: number, prs: readonly GitHubPullRequest[]): Promise<UpsertResult[]>;
  findByRepo(organizationId: UUID, installationId: number, owner: string, repo: string): Promise<GitHubPullRequest[]>;
  findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubPullRequest | null>;
  count(organizationId: UUID, installationId: number): Promise<number>;
}

export interface IGitHubWorkflowRunSyncStore {
  upsert(organizationId: UUID, installationId: number, run: GitHubWorkflowRun): Promise<UpsertResult>;
  upsertBatch(organizationId: UUID, installationId: number, runs: readonly GitHubWorkflowRun[]): Promise<UpsertResult[]>;
  findByRepo(organizationId: UUID, installationId: number, owner: string, repo: string): Promise<GitHubWorkflowRun[]>;
  findByGithubId(organizationId: UUID, installationId: number, githubId: number): Promise<GitHubWorkflowRun | null>;
  count(organizationId: UUID, installationId: number): Promise<number>;
}

export type GitHubSyncStore = IGitHubRepositorySyncStore | IGitHubIssueSyncStore | IGitHubPullRequestSyncStore | IGitHubWorkflowRunSyncStore;
