import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleGmailMapper } from '../mappers/GoogleGmailMapper';
import type { GoogleGmailLabel } from '../types/GoogleGmailTypes';

export interface ListLabelsInput {
  readonly organizationId: string;
}

export interface ListLabelsOutput {
  readonly labels: GoogleGmailLabel[];
}

export function createListLabelsOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.gmail.listLabels',
    requiredCapabilities: ['gmail.labels.read'],
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
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
    ): Promise<ListLabelsOutput> {
      const typedInput = input as unknown as ListLabelsInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'gmail',
        'users/me/labels',
        {},
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const labels = GoogleGmailMapper.mapLabelList(response.data as never);
      return { labels };
    },
  };
}
