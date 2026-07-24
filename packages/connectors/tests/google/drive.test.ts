import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  ConnectorRuntime,
  registerGoogleConnector,
  GOOGLE_CONNECTOR_ID,
  ConnectorRuntimeError,
} from '../../src/index';
import { TestTokenRefreshProvider } from '../../src/providers/google/auth/GoogleTokenRefreshProvider';
import { createMockFetch } from './mocks/MockFetch';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  TOKEN_REFRESH_RESPONSE,
  FIXTURE_DRIVE_FILE,
  FIXTURE_DRIVE_FILE_LIST,
  FIXTURE_DRIVE_FOLDER_RESPONSE,
  FIXTURE_DRIVE_UPLOAD_RESPONSE,
  FIXTURE_ERROR_400,
} from './fixtures';

const CREDENTIALS = {
  accessToken: VALID_ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

function setup(mockFetch: ReturnType<typeof createMockFetch>) {
  const store = new InMemoryCredentialStore();
  const encryption = new DevelopmentCredentialEncryptionProvider('test-key');
  const resolver = new CredentialResolver(store, encryption);
  resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', CREDENTIALS);

  const runtime = new ConnectorRuntime();
  const refreshProvider = new TestTokenRefreshProvider(TOKEN_REFRESH_RESPONSE);

  const { authAdapter } = registerGoogleConnector({
    runtime,
    credentialResolver: resolver,
    refreshProvider,
    transport: mockFetch,
  });

  return { store, encryption, resolver, runtime, authAdapter, mockFetch };
}

function context(mockFetch: ReturnType<typeof createMockFetch>) {
  return {
    organizationId: 'org-1',
    userId: null,
    requestId: 'r-1',
    correlationId: 'c-1',
    traceId: 't-1',
    metadata: { fetchImpl: mockFetch },
  };
}

describe('Google Drive Operations', () => {
  let mockFetch: ReturnType<typeof createMockFetch>;

  beforeEach(() => {
    mockFetch = createMockFetch([
      // Drive list files (GET files)
      {
        method: 'GET',
        urlPattern: /drive\/v3\/files(\?|$)/,
        response: { status: 200, body: FIXTURE_DRIVE_FILE_LIST, headers: {} },
      },
      // Drive get file (GET files/{id})
      {
        method: 'GET',
        urlPattern: /drive\/v3\/files\/file-1/,
        response: { status: 200, body: FIXTURE_DRIVE_FILE, headers: {} },
      },
      // Drive upload (POST files with uploadType=multipart) — must come before createFolder
      {
        method: 'POST',
        urlPattern: /drive\/v3\/files\?.*uploadType=multipart/,
        response: { status: 200, body: FIXTURE_DRIVE_UPLOAD_RESPONSE, headers: {} },
      },
      // Drive create folder (POST files without uploadType)
      {
        method: 'POST',
        urlPattern: /drive\/v3\/files(\?|$)/,
        response: { status: 200, body: FIXTURE_DRIVE_FOLDER_RESPONSE, headers: {} },
      },
      // Drive update file metadata (PATCH files/{id})
      {
        method: 'PATCH',
        urlPattern: /drive\/v3\/files\/file-1/,
        response: { status: 200, body: FIXTURE_DRIVE_FILE, headers: {} },
      },
    ]);
  });

  it('should list files and return items with nextPageToken', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.listFiles',
      input: { organizationId: 'org-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'listFiles should succeed');
    assert.ok(result.data);
    const data = result.data as { items: unknown[]; nextPageToken: string; incompleteSearch: boolean };
    assert.equal(data.items.length, 1);
    assert.equal(data.nextPageToken, 'page2');
    assert.equal(data.incompleteSearch, false);
  });

  it('should get a file by id', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.getFile',
      input: { organizationId: 'org-1', fileId: 'file-1' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'getFile should succeed');
    assert.ok(result.data);
    const data = result.data as { file: { id: string; name: string } };
    assert.equal(data.file.id, 'file-1');
    assert.equal(data.file.name, 'Test Document.txt');
  });

  it('should search files and return items', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.searchFiles',
      input: { organizationId: 'org-1', name: 'Test' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'searchFiles should succeed');
    assert.ok(result.data);
    const data = result.data as { items: unknown[]; nextPageToken: string };
    assert.equal(data.items.length, 1);
  });

  it('should create a folder and return folderId', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.createFolder',
      input: { organizationId: 'org-1', name: 'New Folder' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'createFolder should succeed');
    assert.ok(result.data);
    const data = result.data as { folderId: string };
    assert.equal(data.folderId, 'folder-123');
  });

  it('should upload a file and return fileId', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.uploadFile',
      input: {
        organizationId: 'org-1',
        name: 'test.txt',
        mimeType: 'text/plain',
        content: 'Hello World',
      },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'uploadFile should succeed');
    assert.ok(result.data);
    const data = result.data as { fileId: string };
    assert.equal(data.fileId, 'file-upload-1');
  });

  it('should update file metadata and return file', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.updateFileMetadata',
      input: { organizationId: 'org-1', fileId: 'file-1', name: 'Updated Name.txt' },
      context: context(mockFetch),
    });

    assert.ok(result.success, 'updateFileMetadata should succeed');
    assert.ok(result.data);
    const data = result.data as { file: { id: string } };
    assert.equal(data.file.id, 'file-1');
  });

  it('should reject listFiles with invalid pageSize', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.listFiles',
      input: { organizationId: 'org-1', pageSize: 0 },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error instanceof ConnectorRuntimeError);
  });

  it('should reject createFolder without name', async () => {
    const { runtime } = setup(mockFetch);
    const result = await runtime.execute({
      connectorId: GOOGLE_CONNECTOR_ID,
      operation: 'google.drive.createFolder',
      input: { organizationId: 'org-1' },
      context: context(mockFetch),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
  });

  it('should have retryable=false for createFolder operation', () => {
    const { runtime } = setup(mockFetch);
    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    const createFolder = ops.find((o) => o.name === 'google.drive.createFolder');
    assert.ok(createFolder, 'createFolder operation should be registered');
    assert.equal(createFolder!.retryable, false);
  });

  it('should have retryable=false for uploadFile operation', () => {
    const { runtime } = setup(mockFetch);
    const ops = runtime.listOperations(GOOGLE_CONNECTOR_ID);
    const uploadFile = ops.find((o) => o.name === 'google.drive.uploadFile');
    assert.ok(uploadFile, 'uploadFile operation should be registered');
    assert.equal(uploadFile!.retryable, false);
  });
});
