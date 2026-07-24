export interface GitHubIssueLabel {
  readonly id: number;
  readonly name: string;
  readonly color: string;
  readonly description: string | null;
}

export interface GitHubIssueUser {
  readonly id: number;
  readonly login: string;
  readonly profileUrl: string;
}

export interface GitHubIssue {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly body: string | null;
  readonly state: 'open' | 'closed';
  readonly author: GitHubIssueUser | null;
  readonly assignees: readonly GitHubIssueUser[];
  readonly labels: readonly GitHubIssueLabel[];
  readonly milestone: GitHubIssueMilestone | null;
  readonly commentsCount: number;
  readonly htmlUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt: string | null;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GitHubIssueMilestone {
  readonly id: number;
  readonly number: number;
  readonly title: string;
  readonly state: 'open' | 'closed';
}

export interface GitHubIssueResponse {
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
  readonly assignees: readonly {
    readonly id: number;
    readonly login: string;
    readonly html_url: string;
  }[];
  readonly labels: readonly {
    readonly id: number;
    readonly name: string;
    readonly color: string;
    readonly description: string | null;
  }[];
  readonly milestone: {
    readonly id: number;
    readonly number: number;
    readonly title: string;
    readonly state: 'open' | 'closed';
  } | null;
  readonly comments: number;
  readonly html_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly closed_at: string | null;
}

export interface GitHubIssueCommentResponse {
  readonly id: number;
  readonly html_url: string;
  readonly created_at: string;
  readonly updated_at: string;
}
