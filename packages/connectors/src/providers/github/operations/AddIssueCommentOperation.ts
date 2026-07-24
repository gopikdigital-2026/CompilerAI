import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface AddIssueCommentInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly issueNumber: number;
  readonly body: string;
}

export interface AddIssueCommentOutput {
  readonly commentId: number;
  readonly htmlUrl: string;
  readonly createdAt: string;
}

export function createAddIssueCommentOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.addIssueComment',
    timeoutMs: 15_000,
    retryable: false,
    idempotent: false,
    requiredCapabilities: ['issues.write'],
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
      if (typeof input['body'] !== 'string' || (input['body'] as string).length === 0) {
        errors.push('body is required and must be a non-empty string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<AddIssueCommentOutput> {
      const typedInput = input as unknown as AddIssueCommentInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const response = await client.post<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}/issues/${typedInput.issueNumber}/comments`,
        { body: typedInput.body },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const comment = GitHubResponseMapper.mapIssueComment(response.data as never);
      return {
        commentId: comment.id,
        htmlUrl: comment.htmlUrl,
        createdAt: comment.createdAt,
      };
    },
  };
}
