import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';

export interface ListMessagesInput {
  readonly organizationId: string;
  readonly query?: string;
  readonly labelIds?: string[];
  readonly pageToken?: string;
  readonly maxResults?: number;
  readonly includeSpamTrash?: boolean;
}

export interface ListMessagesOutput {
  readonly messages: { readonly id: string; readonly threadId: string }[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}

export function createListMessagesOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.gmail.listMessages',
    requiredCapabilities: ['gmail.messages.read'],
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (input['query'] !== undefined && typeof input['query'] !== 'string') {
        errors.push('query must be a string');
      }
      if (input['labelIds'] !== undefined && !Array.isArray(input['labelIds'])) {
        errors.push('labelIds must be an array of strings');
      }
      if (input['pageToken'] !== undefined && typeof input['pageToken'] !== 'string') {
        errors.push('pageToken must be a string');
      }
      if (
        input['maxResults'] !== undefined &&
        (typeof input['maxResults'] !== 'number' ||
          (input['maxResults'] as number) < 1 ||
          (input['maxResults'] as number) > 500)
      ) {
        errors.push('maxResults must be a number between 1 and 500');
      }
      if (input['includeSpamTrash'] !== undefined && typeof input['includeSpamTrash'] !== 'boolean') {
        errors.push('includeSpamTrash must be a boolean');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListMessagesOutput> {
      const typedInput = input as unknown as ListMessagesInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const response = await client.get<unknown>(
        'gmail',
        'users/me/messages',
        {
          q: typedInput.query,
          labelIds: typedInput.labelIds ? typedInput.labelIds.join(',') : undefined,
          pageToken: typedInput.pageToken,
          maxResults: typedInput.maxResults ?? 100,
          includeSpamTrash: typedInput.includeSpamTrash,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const data = response.data as {
        messages?: { id: string; threadId: string }[];
        nextPageToken?: string;
        resultSizeEstimate?: number;
      } | null;

      return {
        messages: data?.messages ? data.messages.map((m) => ({ id: m.id, threadId: m.threadId })) : [],
        nextPageToken: data?.nextPageToken,
        resultSizeEstimate: data?.resultSizeEstimate,
      };
    },
  };
}
