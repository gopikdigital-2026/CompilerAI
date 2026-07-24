import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubWorkflowRun } from '../types/GitHubWorkflowRun';
import type { GitHubPaginationResult } from '../types/GitHubPaginationResult';
import { GitHubResponseMapper } from '../GitHubResponseMapper';
import { GitHubPagination } from '../GitHubPagination';

export interface ListWorkflowRunsInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly workflowId?: string;
  readonly actor?: string;
  readonly branch?: string;
  readonly event?: string;
  readonly status?: 'completed' | 'success' | 'failure' | 'cancelled' | 'in_progress' | 'queued' | 'waiting' | 'requested' | 'action_required' | 'neutral' | 'skipped' | 'timed_out';
  readonly created?: string;
  readonly page?: number;
  readonly perPage?: number;
}

export type ListWorkflowRunsOutput = GitHubPaginationResult<GitHubWorkflowRun>;

export function createListWorkflowRunsOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.listWorkflowRuns',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['actions.read'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['owner'] !== 'string' || (input['owner'] as string).length === 0) {
        errors.push('owner is required');
      }
      if (typeof input['repository'] !== 'string' || (input['repository'] as string).length === 0) {
        errors.push('repository is required');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListWorkflowRunsOutput> {
      const typedInput = input as unknown as ListWorkflowRunsInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);
      const page = typedInput.page ?? 1;
      const perPage = typedInput.perPage ?? 30;

      const basePath = typedInput.workflowId
        ? `repos/${typedInput.owner}/${typedInput.repository}/actions/workflows/${typedInput.workflowId}/runs`
        : `repos/${typedInput.owner}/${typedInput.repository}/actions/runs`;

      const response = await client.get<{ total_count: number; workflow_runs: readonly unknown[] }>(
        basePath,
        {
          actor: typedInput.actor,
          branch: typedInput.branch,
          event: typedInput.event,
          status: typedInput.status,
          created: typedInput.created,
          page,
          per_page: perPage,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const data = response.data as { workflow_runs: unknown[]; total_count?: number };
      const runs = data.workflow_runs.map((r: unknown) =>
        GitHubResponseMapper.mapWorkflowRun(r as never),
      );

      return GitHubPagination.buildResult(
        runs, page, perPage,
        response.headers['link'],
        data.total_count,
      );
    },
  };
}
