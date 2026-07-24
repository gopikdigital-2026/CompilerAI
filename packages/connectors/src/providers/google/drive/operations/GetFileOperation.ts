import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import type { GoogleDriveFile } from '../types/GoogleDriveTypes';
import { GoogleDriveMapper } from '../mappers/GoogleDriveMapper';

export interface GetFileInput {
  readonly organizationId: string;
  readonly fileId: string;
}

export interface GetFileOutput {
  readonly file: GoogleDriveFile;
}

export function createGetFileOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.getFile',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['drive.files.read'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['fileId'] !== 'string' || (input['fileId'] as string).length === 0) {
        errors.push('fileId is required');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<GetFileOutput> {
      const typedInput = input as unknown as GetFileInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const fields = 'id,name,mimeType,size,createdTime,modifiedTime,owners,parents,webViewLink,trashed';

      const response = await client.get<unknown>(
        'drive',
        `files/${typedInput.fileId}`,
        { fields },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const file = GoogleDriveMapper.mapFile(response.data as never);
      return { file };
    },
  };
}
