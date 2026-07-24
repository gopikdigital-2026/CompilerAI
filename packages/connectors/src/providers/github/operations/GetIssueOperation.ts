import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubIssue } from '../types/GitHubIssue';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface GetIssueInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly issueNumber: number;
}

export interface GetIssueOutput {
  readonly issue: GitHubIssue;
}

export function createGetIssueOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.getIssue',
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
      if (typeof input['issueNumber'] !== 'number' || (input['issueNumber'] as number) < 1) {
        errors.push('issueNumber must be a positive number');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetIssueOutput> {
      const typedInput = input as unknown as GetIssueInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const response = await client.get<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}/issues/${typedInput.issueNumber}`,
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const issue = GitHubResponseMapper.mapIssue(response.data as never);
      return { issue };
    },
  };
}
