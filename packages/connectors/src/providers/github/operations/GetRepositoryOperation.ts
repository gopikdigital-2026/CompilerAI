import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubRepository } from '../types/GitHubRepository';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface GetRepositoryInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
}

export interface GetRepositoryOutput {
  readonly repository: GitHubRepository;
}

export function createGetRepositoryOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.getRepository',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['repositories.read'],
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
    ): Promise<GetRepositoryOutput> {
      const typedInput = input as unknown as GetRepositoryInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const response = await client.get<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}`,
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const repo = GitHubResponseMapper.mapRepository(response.data as never);
      return { repository: repo };
    },
  };
}
