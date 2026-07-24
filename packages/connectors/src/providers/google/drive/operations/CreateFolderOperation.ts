import type { ConnectorOperation, ConnectorExecutionContext } from '../../../../runtime/ConnectorExecutionResult';
import type { GoogleApiClient, FetchLike } from '../../GoogleApiClient';
import type { GoogleOAuth2Adapter } from '../../auth/GoogleOAuth2Adapter';

export interface CreateFolderInput {
  readonly organizationId: string;
  readonly name: string;
  readonly parentFolderId?: string;
}

export interface CreateFolderOutput {
  readonly folderId: string;
}

export function createCreateFolderOperation(
  client: GoogleApiClient,
  authAdapter: GoogleOAuth2Adapter,
): ConnectorOperation {
  return {
    name: 'google.drive.createFolder',
    timeoutMs: 15_000,
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
      if (input['parentFolderId'] !== undefined && (typeof input['parentFolderId'] !== 'string' || (input['parentFolderId'] as string).length === 0)) {
        errors.push('parentFolderId must be a non-empty string');
      }
      return errors;
    },
    async execute(
      input: Record<string, unknown>,
      context: ConnectorExecutionContext,
      signal: AbortSignal,
    ): Promise<CreateFolderOutput> {
      const typedInput = input as unknown as CreateFolderInput;
      const token = await authAdapter.getAccessToken(
        typedInput.organizationId,
        context.userId,
        context.metadata['fetchImpl'] as FetchLike | undefined,
      );

      const body = {
        name: typedInput.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: typedInput.parentFolderId ? [typedInput.parentFolderId] : undefined,
      };

      const response = await client.post<unknown>(
        'drive',
        'files',
        body,
        { token, signal, fetchImpl: context.metadata['fetchImpl'] as FetchLike | undefined },
      );

      const created = response.data as { readonly id: string };
      return { folderId: created.id };
    },
  };
}
