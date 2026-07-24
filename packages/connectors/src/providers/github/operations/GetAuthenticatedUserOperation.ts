import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubUser } from '../types/GitHubUser';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface GetAuthenticatedUserInput {
  readonly organizationId: string;
  readonly userId?: string;
}

export interface GetAuthenticatedUserOutput {
  readonly user: GitHubUser;
}

export function createGetAuthenticatedUserOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.getAuthenticatedUser',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['identity.read'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetAuthenticatedUserOutput> {
      const typedInput = input as unknown as GetAuthenticatedUserInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const response = await client.get<unknown>('user', {}, {
        token,
        signal,
        fetchImpl: context.metadata['fetchImpl'] as never ?? undefined,
      });

      const user = GitHubResponseMapper.mapUser(response.data as never);
      return { user };
    },
  };
}
