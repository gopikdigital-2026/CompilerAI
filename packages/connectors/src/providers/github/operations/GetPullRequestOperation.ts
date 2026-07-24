import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubPullRequest } from '../types/GitHubPullRequest';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface GetPullRequestInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly pullNumber: number;
}

export interface GetPullRequestOutput {
  readonly pullRequest: GitHubPullRequest;
}

export function createGetPullRequestOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.getPullRequest',
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
      if (typeof input['pullNumber'] !== 'number' || (input['pullNumber'] as number) < 1) {
        errors.push('pullNumber must be a positive number');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetPullRequestOutput> {
      const typedInput = input as unknown as GetPullRequestInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const response = await client.get<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}/pulls/${typedInput.pullNumber}`,
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const pr = GitHubResponseMapper.mapPullRequest(response.data as never);
      return { pullRequest: pr };
    },
  };
}
