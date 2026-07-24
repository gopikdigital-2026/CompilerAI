import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';
import type { GoogleDriveFile } from '../types/GoogleDriveTypes';
import { GoogleDriveMapper } from '../mappers/GoogleDriveMapper';

export interface SearchFilesInput {
  readonly organizationId: string;
  readonly name?: string;
  readonly contentSearch?: string;
  readonly mimeType?: string;
  readonly folderId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly pageSize?: number;
  readonly pageToken?: string;
}

export interface SearchFilesOutput {
  readonly items: readonly GoogleDriveFile[];
  readonly nextPageToken?: string;
  readonly incompleteSearch: boolean;
}

function escapeQueryValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export function createSearchFilesOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.searchFiles',
    timeoutMs: 15_000,
    retryable: true,
    idempotent: true,
    requiredCapabilities: ['drive.search'],
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
      if (input['name'] !== undefined && typeof input['name'] !== 'string') {
        errors.push('name must be a string');
      }
      if (input['contentSearch'] !== undefined && typeof input['contentSearch'] !== 'string') {
        errors.push('contentSearch must be a string');
      }
      if (input['mimeType'] !== undefined && typeof input['mimeType'] !== 'string') {
        errors.push('mimeType must be a string');
      }
      if (input['folderId'] !== undefined && typeof input['folderId'] !== 'string') {
        errors.push('folderId must be a string');
      }
      if (input['dateFrom'] !== undefined && typeof input['dateFrom'] !== 'string') {
        errors.push('dateFrom must be a string');
      }
      if (input['dateTo'] !== undefined && typeof input['dateTo'] !== 'string') {
        errors.push('dateTo must be a string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<SearchFilesOutput> {
      const typedInput = input as unknown as SearchFilesInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const qParts: string[] = [];
      if (typedInput.name) {
        qParts.push(`name contains '${escapeQueryValue(typedInput.name)}'`);
      }
      if (typedInput.contentSearch) {
        qParts.push(`fullText contains '${escapeQueryValue(typedInput.contentSearch)}'`);
      }
      if (typedInput.mimeType) {
        qParts.push(`mimeType='${escapeQueryValue(typedInput.mimeType)}'`);
      }
      if (typedInput.folderId) {
        qParts.push(`'${escapeQueryValue(typedInput.folderId)}' in parents`);
      }
      if (typedInput.dateFrom) {
        qParts.push(`modifiedTime >= '${escapeQueryValue(typedInput.dateFrom)}'`);
      }
      if (typedInput.dateTo) {
        qParts.push(`modifiedTime <= '${escapeQueryValue(typedInput.dateTo)}'`);
      }
      const q = qParts.length > 0 ? qParts.join(' and ') : undefined;

      const fields = 'files(id,name,mimeType,size,createdTime,modifiedTime,owners(displayName,emailAddress,permissionId),parents,webViewLink,trashed),nextPageToken,incompleteSearch';

      const response = await client.get<unknown>(
        'drive',
        'files',
        {
          q,
          pageSize: typedInput.pageSize ?? 100,
          pageToken: typedInput.pageToken,
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
