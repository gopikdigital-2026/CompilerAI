import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import { GoogleGmailMapper } from '../mappers/GoogleGmailMapper';

export interface SendMessageInput {
  readonly organizationId: string;
  readonly to: string[];
  readonly cc?: string[];
  readonly bcc?: string[];
  readonly subject: string;
  readonly bodyText?: string;
  readonly bodyHtml?: string;
  readonly replyToMessageId?: string;
}

export interface SendMessageOutput {
  readonly messageId: string;
  readonly threadId: string;
}

export function createSendMessageOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.gmail.sendMessage',
    requiredCapabilities: ['gmail.messages.send'],
    timeoutMs: 30_000,
    retryable: false,
    idempotent: false,
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (!Array.isArray(input['to']) || (input['to'] as unknown[]).length === 0) {
        errors.push('to is required and must be a non-empty array of email addresses');
      } else {
        for (const addr of input['to'] as unknown[]) {
          if (typeof addr !== 'string' || !GoogleGmailMapper.validateEmailAddress(addr)) {
            errors.push(`invalid email address in to: ${String(addr)}`);
          }
        }
      }
      if (input['cc'] !== undefined) {
        if (!Array.isArray(input['cc'])) {
          errors.push('cc must be an array of email addresses');
        } else {
          for (const addr of input['cc'] as unknown[]) {
            if (typeof addr !== 'string' || !GoogleGmailMapper.validateEmailAddress(addr)) {
              errors.push(`invalid email address in cc: ${String(addr)}`);
            }
          }
        }
      }
      if (input['bcc'] !== undefined) {
        if (!Array.isArray(input['bcc'])) {
          errors.push('bcc must be an array of email addresses');
        } else {
          for (const addr of input['bcc'] as unknown[]) {
            if (typeof addr !== 'string' || !GoogleGmailMapper.validateEmailAddress(addr)) {
              errors.push(`invalid email address in bcc: ${String(addr)}`);
            }
          }
        }
      }
      if (typeof input['subject'] !== 'string' || (input['subject'] as string).length === 0) {
        errors.push('subject is required and must be a non-empty string');
      } else if (GoogleGmailMapper.checkHeaderInjection(input['subject'] as string)) {
        errors.push('subject contains invalid newline characters (header injection detected)');
      }
      if (input['bodyText'] !== undefined && typeof input['bodyText'] !== 'string') {
        errors.push('bodyText must be a string');
      }
      if (input['bodyHtml'] !== undefined && typeof input['bodyHtml'] !== 'string') {
        errors.push('bodyHtml must be a string');
      }
      if (input['replyToMessageId'] !== undefined && typeof input['replyToMessageId'] !== 'string') {
        errors.push('replyToMessageId must be a string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<SendMessageOutput> {
      const typedInput = input as unknown as SendMessageInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const rfc2822 = GoogleGmailMapper.buildRfc2822Message({
        to: typedInput.to,
        cc: typedInput.cc,
        bcc: typedInput.bcc,
        subject: typedInput.subject,
        bodyText: typedInput.bodyText,
        bodyHtml: typedInput.bodyHtml,
        replyToMessageId: typedInput.replyToMessageId,
      });
      const raw = GoogleGmailMapper.encodeBase64Url(rfc2822);

      const response = await client.post<unknown>(
        'gmail',
        'users/me/messages/send',
        { raw },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const data = response.data as { id: string; threadId: string };
      return { messageId: data.id, threadId: data.threadId };
    },
  };
}
