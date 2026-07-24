import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubIssue } from '../types/GitHubIssue';
import type { GitHubPaginationResult } from '../types/GitHubPaginationResult';
import { GitHubResponseMapper } from '../GitHubResponseMapper';
import { GitHubPagination } from '../GitHubPagination';

export interface ListIssuesInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly state?: 'open' | 'closed' | 'all';
  readonly labels?: string;
  readonly assignee?: string;
  readonly creator?: string;
  readonly mentioned?: string;
  readonly sort?: 'created' | 'updated' | 'comments';
  readonly direction?: 'asc' | 'desc';
  readonly since?: string;
  readonly page?: number;
  readonly perPage?: number;
}

export type ListIssuesOutput = GitHubPaginationResult<GitHubIssue>;

export function createListIssuesOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.listIssues',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['issues.read'],
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
    ): Promise<ListIssuesOutput> {
      const typedInput = input as unknown as ListIssuesInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);
      const page = typedInput.page ?? 1;
      const perPage = typedInput.perPage ?? 30;

      const response = await client.get<unknown[]>(
        `repos/${typedInput.owner}/${typedInput.repository}/issues`,
        {
          state: typedInput.state ?? 'open',
          labels: typedInput.labels,
          assignee: typedInput.assignee,
          creator: typedInput.creator,
          mentioned: typedInput.mentioned,
          sort: typedInput.sort,
          direction: typedInput.direction,
          since: typedInput.since,
          page,
          per_page: perPage,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const issues = (response.data as readonly unknown[])
        .filter((item) => !(item as Record<string, unknown>)['pull_request'])
        .map((item) => GitHubResponseMapper.mapIssue(item as never));

      return GitHubPagination.buildResult(
        issues, page, perPage,
        response.headers['link'],
      );
    },
  };
}
