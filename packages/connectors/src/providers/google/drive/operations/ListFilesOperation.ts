import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import type { GoogleDriveFile } from '../types/GoogleDriveTypes';
import { GoogleDriveMapper } from '../mappers/GoogleDriveMapper';

export interface ListFilesInput {
  readonly organizationId: string;
  readonly query?: string;
  readonly mimeType?: string;
  readonly folderId?: string;
  readonly pageSize?: number;
  readonly pageToken?: string;
  readonly orderBy?: string;
  readonly includeTrashed?: boolean;
}

export interface ListFilesOutput {
  readonly items: readonly GoogleDriveFile[];
  readonly nextPageToken?: string;
  readonly incompleteSearch: boolean;
}

export function createListFilesOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.listFiles',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['drive.files.read'],
    validateInput(input: Record<string, unknown>): string[] {
      const errors: string[] = [];
      if (typeof input['organizationId'] !== 'string' || (input['organizationId'] as string).length === 0) {
        errors.push('organizationId is required');
      }
      if (input['pageSize'] !== undefined && (typeof input['pageSize'] !== 'number' || (input['pageSize'] as number) < 1 || (input['pageSize'] as number) > 1000)) {
        errors.push('pageSize must be a number between 1 and 1000');
      }
      if (input['pageToken'] !== undefined && typeof input['pageToken'] !== 'string') {
        errors.push('pageToken must be a string');
      }
      if (input['orderBy'] !== undefined && typeof input['orderBy'] !== 'string') {
        errors.push('orderBy must be a string');
      }
      if (input['mimeType'] !== undefined && typeof input['mimeType'] !== 'string') {
        errors.push('mimeType must be a string');
      }
      if (input['folderId'] !== undefined && typeof input['folderId'] !== 'string') {
        errors.push('folderId must be a string');
      }
      if (input['query'] !== undefined && typeof input['query'] !== 'string') {
        errors.push('query must be a string');
      }
      if (input['includeTrashed'] !== undefined && typeof input['includeTrashed'] !== 'boolean') {
        errors.push('includeTrashed must be a boolean');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<ListFilesOutput> {
      const typedInput = input as unknown as ListFilesInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const qParts: string[] = [];
      if (typedInput.mimeType) {
        qParts.push(`mimeType='${typedInput.mimeType}'`);
      }
      if (typedInput.folderId) {
        qParts.push(`'${typedInput.folderId}' in parents`);
      }
      if (typedInput.includeTrashed !== true) {
        qParts.push('trashed=false');
      }
      if (typedInput.query) {
        qParts.push(typedInput.query);
      }
      const q = qParts.length > 0 ? qParts.join(' and ') : undefined;

      const fields = 'files(id,name,mimeType,size,createdTime,modifiedTime,owners(displayName,emailAddress,permissionId),parents,webViewLink,trashed),nextPageToken,incompleteSearch';

      const response = await client.get<unknown>(
        'drive',
        'files',
        {
          pageSize: typedInput.pageSize ?? 100,
          pageToken: typedInput.pageToken,
          orderBy: typedInput.orderBy,
          q,
          fields,
        },
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const mapped = GoogleDriveMapper.mapFileList(response.data as never);
      return {
        items: mapped.files,
        nextPageToken: mapped.nextPageToken,
        incompleteSearch: mapped.incompleteSearch,
      };
    },
  };
}
