import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubRepository } from '../types/GitHubRepository';
import type { GitHubPaginationResult } from '../types/GitHubPaginationResult';
import { GitHubResponseMapper } from '../GitHubResponseMapper';
import { GitHubPagination } from '../GitHubPagination';

export interface ListRepositoriesInput {
  readonly organizationId: string;
  readonly visibility?: 'all' | 'public' | 'private';
  readonly affiliation?: string;
  readonly sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  readonly direction?: 'asc' | 'desc';
  readonly page?: number;
  readonly perPage?: number;
}

export type ListRepositoriesOutput = GitHubPaginationResult<GitHubRepository>;

export function createListRepositoriesOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.listRepositories',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['repositories.read'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (input['page'] !== undefined && (typeof input['page'] !== 'number' || (input['page'] as number) < 1)) {
        errors.push('page must be a positive number');
      }
      if (input['perPage'] !== undefined && (typeof input['perPage'] !== 'number' || (input['perPage'] as number) < 1 || (input['perPage'] as number) > 100)) {
        errors.push('perPage must be between 1 and 100');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListRepositoriesOutput> {
      const typedInput = input as unknown as ListRepositoriesInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);
      const page = typedInput.page ?? 1;
      const perPage = typedInput.perPage ?? 30;

      const response = await client.get<unknown[]>('user/repos', {
        visibility: typedInput.visibility,
        affiliation: typedInput.affiliation,
        sort: typedInput.sort,
        direction: typedInput.direction,
        page,
        per_page: perPage,
      }, {
        token,
        signal,
        fetchImpl: context.metadata['fetchImpl'] as never ?? undefined,
      });

      const repos = (response.data as readonly unknown[]).map((r) =>
        GitHubResponseMapper.mapRepository(r as never),
      );

      return GitHubPagination.buildResult(
        repos, page, perPage,
        response.headers['link'],
      );
    },
  };
}
