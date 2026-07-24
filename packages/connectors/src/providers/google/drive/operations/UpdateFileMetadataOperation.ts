import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import type { GoogleDriveFile } from '../types/GoogleDriveTypes';
import { GoogleDriveMapper } from '../mappers/GoogleDriveMapper';

export interface UpdateFileMetadataInput {
  readonly organizationId: string;
  readonly fileId: string;
  readonly name?: string;
  readonly parents?: readonly string[];
  readonly starred?: boolean;
  readonly trashed?: boolean;
}

export interface UpdateFileMetadataOutput {
  readonly file: GoogleDriveFile;
}

export function createUpdateFileMetadataOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.updateFileMetadata',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['drive.files.write'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (typeof input['fileId'] !== 'string' || (input['fileId'] as string).length === 0) {
        errors.push('fileId is required');
      }
      if (input['name'] !== undefined && (typeof input['name'] !== 'string' || (input['name'] as string).length === 0)) {
        errors.push('name must be a non-empty string');
      }
      if (input['parents'] !== undefined && !Array.isArray(input['parents'])) {
        errors.push('parents must be an array of strings');
      }
      if (input['starred'] !== undefined && typeof input['starred'] !== 'boolean') {
        errors.push('starred must be a boolean');
      }
      if (input['trashed'] !== undefined && typeof input['trashed'] !== 'boolean') {
        errors.push('trashed must be a boolean');
      }
      const hasUpdate = input['name'] !== undefined || input['parents'] !== undefined ||
        input['starred'] !== undefined || input['trashed'] !== undefined;
      if (!hasUpdate) {
        errors.push('at least one of name, parents, starred, or trashed must be provided');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<UpdateFileMetadataOutput> {
      const typedInput = input as unknown as UpdateFileMetadataInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const body: Record<string, unknown> = {};
      if (typedInput.name !== undefined) body['name'] = typedInput.name;
      if (typedInput.parents !== undefined) body['parents'] = [...typedInput.parents];
      if (typedInput.starred !== undefined) body['starred'] = typedInput.starred;
      if (typedInput.trashed !== undefined) body['trashed'] = typedInput.trashed;

      const response = await client.patch<unknown>(
        'drive',
        `files/${typedInput.fileId}`,
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const file = GoogleDriveMapper.mapFile(response.data as never);
      return { file };
    },
  };
}
