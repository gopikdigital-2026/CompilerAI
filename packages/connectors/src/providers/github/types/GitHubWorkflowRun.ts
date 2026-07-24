export interface GitHubWorkflowRunUser {
  readonly id: number;
  readonly login: string;
  readonly profileUrl: string;
}

export interface GitHubWorkflowRun {
  readonly id: number;
  readonly name: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly status: 'queued' | 'in_progress' | 'completed' | 'requested' | 'waiting' | 'pending';
  readonly conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  readonly event: string;
  readonly displayTitle: string;
  readonly runNumber: number;
  readonly runAttempt: number;
  readonly actor: GitHubWorkflowRunUser | null;
  readonly htmlUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly runStartedAt: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GitHubWorkflowRunResponse {
  readonly id: number;
  readonly name: string;
  readonly head_branch: string;
  readonly head_sha: string;
  readonly status: 'queued' | 'in_progress' | 'completed' | 'requested' | 'waiting' | 'pending';
  readonly conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  readonly event: string;
  readonly display_title: string;
  readonly run_number: number;
  readonly run_attempt: number;
  readonly actor: {
    readonly id: number;
    readonly login: string;
    readonly html_url: string;
  } | null;
  readonly html_url: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly run_started_at: string;
}

export interface GitHubWorkflowRunsListResponse {
  readonly total_count: number;
  readonly workflow_runs: readonly GitHubWorkflowRunResponse[];
}
