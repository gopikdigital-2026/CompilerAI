import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';

const MAX_UPLOAD_BYTES = 5_000_000;

export interface UploadFileInput {
  readonly organizationId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly content: string;
  readonly parentFolderId?: string;
}

export interface UploadFileOutput {
  readonly fileId: string;
}

export function createUploadFileOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.uploadFile',
    timeoutMs: 30_000,
    retryable: false,
    idempotent: false,
    requiredCapabilities: ['drive.files.write'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['name'] !== 'string' || (input['name'] as string).length === 0) {
        errors.push('name is required and must be a non-empty string');
      }
      if (typeof input['mimeType'] !== 'string' || (input['mimeType'] as string).length === 0) {
        errors.push('mimeType is required and must be a non-empty string');
      }
      if (typeof input['content'] !== 'string') {
        errors.push('content is required and must be a string');
      } else if (input['content'].length > MAX_UPLOAD_BYTES) {
        errors.push(`content exceeds maximum upload size of ${MAX_UPLOAD_BYTES} bytes`);
      }
      if (input['parentFolderId'] !== undefined && (typeof input['parentFolderId'] !== 'string' || (input['parentFolderId'] as string).length === 0)) {
        errors.push('parentFolderId must be a non-empty string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<UploadFileOutput> {
      const typedInput = input as unknown as UploadFileInput;
      if (typedInput.content.length > MAX_UPLOAD_BYTES) {
        throw new Error(`content exceeds maximum upload size of ${MAX_UPLOAD_BYTES} bytes`);
      }

      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const metadata = {
        name: typedInput.name,
        parents: typedInput.parentFolderId ? [typedInput.parentFolderId] : undefined,
      };

      const response = await client.postMultipart<unknown>(
        'drive',
        'files',
        metadata,
        { mimeType: typedInput.mimeType, data: typedInput.content },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const uploaded = response.data as { readonly id: string };
      return { fileId: uploaded.id };
    },
  };
}
