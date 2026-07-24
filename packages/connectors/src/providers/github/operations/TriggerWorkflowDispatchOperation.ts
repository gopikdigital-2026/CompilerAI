import type { ConnectorOperation, ConnectorExecutionContext } from '../../../runtime/ConnectorExecutionResult';
import type { GitHubApiClient } from '../GitHubApiClient';
import type { GitHubTokenAuthAdapter } from '../auth/GitHubTokenAuthAdapter';

export interface TriggerWorkflowDispatchInput {
  readonly organizationId: string;
  readonly owner: string;
  readonly repository: string;
  readonly workflowId: string;
  readonly ref: string;
  readonly inputs?: Readonly<Record<string, string>>;
}

export interface TriggerWorkflowDispatchOutput {
  readonly accepted: boolean;
}

export function createTriggerWorkflowDispatchOperation(
  client: GitHubApiClient,
  authAdapter: GitHubTokenAuthAdapter,
): ConnectorOperation {
  return {
    name: 'github.triggerWorkflowDispatch',
    timeoutMs: 15_000,
    retryable: false,
    idempotent: false,
    requiredCapabilities: ['actions.trigger'],
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
      if (typeof input['workflowId'] !== 'string' || (input['workflowId'] as string).length === 0) {
        errors.push('workflowId is required');
      }
      if (typeof input['ref'] !== 'string' || (input['ref'] as string).length === 0) {
        errors.push('ref is required');
      }
      if (input['inputs'] !== undefined && typeof input['inputs'] !== 'object') {
        errors.push('inputs must be an object with string values');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<TriggerWorkflowDispatchOutput> {
      const typedInput = input as unknown as TriggerWorkflowDispatchInput;
      const token = await authAdapter.getToken(typedInput.organizationId, context.userId);

      const body: Record<string, unknown> = { ref: typedInput.ref };
      if (typedInput.inputs) {
        body['inputs'] = { ...typedInput.inputs };
      }

      await client.post<unknown>(
        `repos/${typedInput.owner}/${typedInput.repository}/actions/workflows/${typedInput.workflowId}/dispatches`,
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as never ?? undefined },
      );

      return { accepted: true };
    },
  };
}
