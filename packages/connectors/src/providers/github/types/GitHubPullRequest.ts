export interface GitHubPullRequestUser {
  readonly id: number;
  readonly login: string;
  readonly profileUrl: string;
}

export interface GitHubPullRequestBranch {
  readonly ref: string;
  readonly sha: string;
  readonly label: string;
  readonly repo: string;
}

export interface GitHubPullRequest {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly author: GitHubPullRequestUser | null;
  readonly head: GitHubPullRequestBranch;
  readonly base: GitHubPullRequestBranch;
  readonly mergeable: boolean | null;
  readonly merged: boolean;
  readonly mergedAt: string | null;
  readonly mergedBy: GitHubPullRequestUser | null;
  readonly draft: boolean;
  readonly commits: number;
  readonly changedFiles: number;
  readonly additions: number;
  readonly deletions: number;
  readonly htmlUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GitHubPullRequestResponse {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly user: {
    readonly id: number;
    readonly login: string;
    readonly html_url: string;
  } | null;
  readonly head: {
    readonly ref: string;
    readonly sha: string;
    readonly label: string;
    readonly repo: {
      readonly full_name: string;
    };
  };
  readonly base: {
    readonly ref: string;
    readonly sha: string;
    readonly label: string;
    readonly repo: {
      readonly full_name: string;
    };
  };
  readonly mergeable: boolean | null;
  readonly merged: boolean;
  readonly merged_at: string | null;
  readonly merged_by: {
    readonly id: number;
    readonly login: string;
    readonly html_url: string;
  } | null;
  readonly draft: boolean;
  readonly commits: number;
  readonly changed_files: number;
  readonly additions: number;
  readonly deletions: number;
  readonly html_url: string;
  readonly created_at: string;
  readonly updated_at: string;
}
