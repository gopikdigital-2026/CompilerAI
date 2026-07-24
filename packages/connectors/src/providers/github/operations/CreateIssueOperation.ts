import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';
import type { GitHubIssue } from '../types/GitHubIssue';
import { GitHubResponseMapper } from '../GitHubResponseMapper';

export interface CreateIssueInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly title: string;
  readonly body?: string;
  readonly assignees?: readonly string[];
  readonly labels?: readonly string[];
  readonly milestone?: number;
}

export interface CreateIssueOutput {
  readonly issue: GitHubIssue;
}

export function createCreateIssueOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.createIssue',
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
      if (typeof input['title'] !== 'string' || (input['title'] as string).length === 0) {
        errors.push('title is required and must be a non-empty string');
      }
      if (input['assignees'] !== undefined && !Array.isArray(input['assignees'])) {
        errors.push('assignees must be an array of strings');
      }
      if (input['labels'] !== undefined && !Array.isArray(input['labels'])) {
        errors.push('labels must be an array of strings');
      }
      if (input['milestone'] !== undefined && (typeof input['milestone'] !== 'number' || (input['milestone'] as number) < 1)) {
        errors.push('milestone must be a positive number');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<CreateIssueOutput> {
      const typedInput = input as unknown as CreateIssueInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const body: Record<string, unknown> = { title: typedInput.title };
      if (typedInput.body !== undefined) body['body'] = typedInput.body;
      if (typedInput.assignees !== undefined) body['assignees'] = [...typedInput.assignees];
      if (typedInput.labels !== undefined) body['labels'] = [...typedInput.labels];
      if (typedInput.milestone !== undefined) body['milestone'] = typedInput.milestone;

      const response = await client.post<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}/issues`,
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      const issue = GitHubResponseMapper.mapIssue(response.data as never);
      return { issue };
    },
  };
}
