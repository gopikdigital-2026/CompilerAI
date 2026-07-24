import type { GitHubUser, GitHubUserResponse } from './types/GitHubUser';
import type { GitHubRepository, GitHubRepositoryResponse } from './types/GitHubRepository';
import type { GitHubIssue, GitHubIssueResponse, GitHubIssueCommentResponse } from './types/GitHubIssue';
import type { GitHubPullRequest, GitHubPullRequestResponse } from './types/GitHubPullRequest';
import type { GitHubWorkflowRun, GitHubWorkflowRunResponse, GitHubWorkflowRunsListResponse } from './types/GitHubWorkflowRun';

export class GitHubResponseMapper {
  static mapUser(raw: GitHubUserResponse): GitHubUser {
    return {
      id: raw.id,
      login: raw.login,
      name: raw.name,
      email: raw.email,
      avatarUrl: raw.avatar_url,
      profileUrl: raw.html_url,
      accountType: raw.type,
    };
  }

  static mapRepository(raw: GitHubRepositoryResponse): GitHubRepository {
    return {
      id: raw.id,
      name: raw.name,
      fullName: raw.full_name,
      description: raw.description,
      private: raw.private,
      archived: raw.archived,
      defaultBranch: raw.default_branch,
      language: raw.language,
      stars: raw.stargazers_count,
      forks: raw.forks_count,
      openIssues: raw.open_issues_count,
      owner: {
        id: raw.owner.id,
        login: raw.owner.login,
        type: raw.owner.type,
        profileUrl: raw.owner.html_url,
      },
      url: raw.url,
      htmlUrl: raw.html_url,
      cloneUrl: raw.clone_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      pushedAt: raw.pushed_at,
    };
  }

  static mapIssue(raw: GitHubIssueResponse): GitHubIssue {
    return {
      id: raw.id,
      number: raw.number,
      title: raw.title,
      body: raw.body,
      state: raw.state,
      author: raw.user ? {
        id: raw.user.id,
        login: raw.user.login,
        profileUrl: raw.user.html_url,
      } : null,
      assignees: raw.assignees.map((a) => ({
        id: a.id,
        login: a.login,
        profileUrl: a.html_url,
      })),
      labels: raw.labels.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        description: l.description,
      })),
      milestone: raw.milestone ? {
        id: raw.milestone.id,
        number: raw.milestone.number,
        title: raw.milestone.title,
        state: raw.milestone.state,
      } : null,
      commentsCount: raw.comments,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      closedAt: raw.closed_at,
    };
  }

  static mapIssueComment(raw: GitHubIssueCommentResponse): { id: number; htmlUrl: string; createdAt: string; updatedAt: string } {
    return {
      id: raw.id,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  static mapPullRequest(raw: GitHubPullRequestResponse): GitHubPullRequest {
    return {
      id: raw.id,
      number: raw.number,
      title: raw.title,
      body: raw.body,
      state: raw.state,
      author: raw.user ? {
        id: raw.user.id,
        login: raw.user.login,
        profileUrl: raw.user.html_url,
      } : null,
      head: {
        ref: raw.head.ref,
        sha: raw.head.sha,
        label: raw.head.label,
        repo: raw.head.repo.full_name,
      },
      base: {
        ref: raw.base.ref,
        sha: raw.base.sha,
        label: raw.base.label,
        repo: raw.base.repo.full_name,
      },
      mergeable: raw.mergeable,
      merged: raw.merged,
      mergedAt: raw.merged_at,
      mergedBy: raw.merged_by ? {
        id: raw.merged_by.id,
        login: raw.merged_by.login,
        profileUrl: raw.merged_by.html_url,
      } : null,
      draft: raw.draft,
      commits: raw.commits,
      changedFiles: raw.changed_files,
      additions: raw.additions,
      deletions: raw.deletions,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  static mapWorkflowRun(raw: GitHubWorkflowRunResponse): GitHubWorkflowRun {
    return {
      id: raw.id,
      name: raw.name,
      headBranch: raw.head_branch,
      headSha: raw.head_sha,
      status: raw.status,
      conclusion: raw.conclusion,
      event: raw.event,
      displayTitle: raw.display_title,
      runNumber: raw.run_number,
      runAttempt: raw.run_attempt,
      actor: raw.actor ? {
        id: raw.actor.id,
        login: raw.actor.login,
        profileUrl: raw.actor.html_url,
      } : null,
      htmlUrl: raw.html_url,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      runStartedAt: raw.run_started_at,
    };
  }

  static mapWorkflowRunsList(raw: GitHubWorkflowRunsListResponse): {
    totalCount: number;
    runs: readonly GitHubWorkflowRun[];
  } {
    return {
      totalCount: raw.total_count,
      runs: raw.workflow_runs.map((r) => GitHubResponseMapper.mapWorkflowRun(r)),
    };
  }
}
