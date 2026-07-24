import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubPullRequest } from '../types/GitHubPullRequest';
import type { GitHubPaginationResult } from '../types/GitHubPaginationResult';
import { GitHubResponseMapper } from '../GitHubResponseMapper';
import { GitHubPagination } from '../GitHubPagination';

export interface ListPullRequestsInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly state?: 'open' | 'closed' | 'all';
  readonly head?: string;
  readonly base?: string;
  readonly sort?: 'created' | 'updated' | 'popularity' | 'long-running';
  readonly direction?: 'asc' | 'desc';
  readonly page?: number;
  readonly perPage?: number;
}

export type ListPullRequestsOutput = GitHubPaginationResult<GitHubPullRequest>;

export function createListPullRequestsOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.listPullRequests',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['pull_requests.read'],
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
    ): Promise<ListPullRequestsOutput> {
      const typedInput = input as unknown as ListPullRequestsInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);
      const page = typedInput.page ?? 1;
      const perPage = typedInput.perPage ?? 30;

      const response = await client.get<unknown[]>(
        `repos/${typedInput.owner}/${typedInput.repository}/pulls`,
        {
          state: typedInput.state ?? 'open',
          head: typedInput.head,
          base: typedInput.base,
          sort: typedInput.sort,
          direction: typedInput.direction,
          page,
          per_page: perPage,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const prs = (response.data as readonly unknown[]).map((pr) =>
        GitHubResponseMapper.mapPullRequest(pr as never),
      );

      return GitHubPagination.buildResult(
        prs, page, perPage,
        response.headers['link'],
      );
    },
  };
}
