import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleGmailMapper } from '../mappers/GoogleGmailMapper';
import type { GoogleGmailMessage } from '../types/GoogleGmailTypes';

export interface GetMessageInput {
  readonly organizationId: string;
  readonly messageId: string;
  readonly format?: 'metadata' | 'full';
}

export interface GetMessageOutput {
  readonly message: GoogleGmailMessage;
}

export function createGetMessageOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.gmail.getMessage',
    requiredCapabilities: ['gmail.messages.read'],
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['messageId'] !== 'string' || (input['messageId'] as string).length === 0) {
        errors.push('messageId is required');
      }
      if (
        input['format'] !== undefined &&
        input['format'] !== 'metadata' &&
        input['format'] !== 'full'
      ) {
        errors.push("format must be 'metadata' or 'full'");
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetMessageOutput> {
      const typedInput = input as unknown as GetMessageInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const format: 'metadata' | 'full' = typedInput.format ?? 'metadata';

      const response = await client.get<unknown>(
        'gmail',
        `users/me/messages/${typedInput.messageId}`,
        { format },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const message = GoogleGmailMapper.mapMessage(response.data as never, format);
      return { message };
    },
  };
}
