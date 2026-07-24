export interface GitHubRepositoryOwner {
  readonly id: number;
  readonly login: string;
  readonly type: 'User' | 'Organization';
  readonly profileUrl: string;
}

export interface GitHubRepository {
  readonly id: number;
  readonly name: string;
  readonly fullName: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly archived: boolean;
  readonly defaultBranch: string;
  readonly language: string | null;
  readonly stars: number;
  readonly forks: number;
  readonly openIssues: number;
  readonly owner: GitHubRepositoryOwner;
  readonly url: string;
  readonly htmlUrl: string;
  readonly cloneUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pushedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GitHubRepositoryResponse {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly private: boolean;
  readonly archived: boolean;
  readonly default_branch: string;
  readonly language: string | null;
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly owner: {
    readonly id: number;
    readonly login: string;
    readonly type: 'User' | 'Organization';
    readonly html_url: string;
  };
  readonly url: string;
  readonly html_url: string;
  readonly clone_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string;
}
