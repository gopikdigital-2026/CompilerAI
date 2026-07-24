// Re-export mock helpers
export { createMockFetch, createGoogleRateLimitHeaders, createErrorConfig } from '../mocks/MockFetch';
export type { MockResponseConfig, MockRoute } from '../mocks/MockFetch';

// --- Auth / token fixtures ---

export const VALID_ACCESS_TOKEN = 'ya29.test-token-not-real';
export const REFRESH_TOKEN = 'test-refresh-token';
export const CLIENT_ID = 'test-client-id';
export const CLIENT_SECRET = 'test-client-secret';

export const TOKEN_REFRESH_RESPONSE = {
  access_token: VALID_ACCESS_TOKEN,
  expires_in: 3600,
  token_type: 'Bearer',
  refresh_token: REFRESH_TOKEN,
};

// --- Google Drive fixtures ---

export const FIXTURE_DRIVE_FILE = {
  id: 'file-1',
  name: 'Test Document.txt',
  mimeType: 'text/plain',
  size: '1024',
  createdTime: '2026-01-01T10:00:00.000Z',
  modifiedTime: '2026-01-02T12:00:00.000Z',
  owners: [
    {
      displayName: 'Jane Doe',
      emailAddress: 'jane@example.com',
      permissionId: 'perm-1',
    },
  ],
  parents: ['folder-root'],
  webViewLink: 'https://docs.google.com/document/d/file-1/edit',
  trashed: false,
};

export const FIXTURE_DRIVE_FILE_LIST = {
  files: [FIXTURE_DRIVE_FILE],
  nextPageToken: 'page2',
  incompleteSearch: false,
};

export const FIXTURE_DRIVE_FOLDER_RESPONSE = {
  id: 'folder-123',
  name: 'New Folder',
  mimeType: 'application/vnd.google-apps.folder',
};

export const FIXTURE_DRIVE_UPLOAD_RESPONSE = {
  id: 'file-upload-1',
  name: 'test.txt',
};

// --- Gmail fixtures ---

export const FIXTURE_GMAIL_MESSAGE_LIST = {
  messages: [{ id: 'msg-1', threadId: 'thread-1' }],
  nextPageToken: 'page2',
  resultSizeEstimate: 1,
};

// base64url-encoded "Hello World" body
const GMAIL_BODY_BASE64URL = Buffer.from('Hello World', 'utf8').toString('base64url');

export const FIXTURE_GMAIL_MESSAGE = {
  id: 'msg-1',
  threadId: 'thread-1',
  labelIds: ['INBOX', 'UNREAD'],
  snippet: 'Hello World',
  payload: {
    headers: [
      { name: 'From', value: 'sender@example.com' },
      { name: 'To', value: 'recipient@example.com' },
      { name: 'Subject', value: 'Test Subject' },
      { name: 'Date', value: 'Thu, 1 Jan 2026 10:00:00 +0000' },
    ],
    mimeType: 'text/plain',
    body: {
      data: GMAIL_BODY_BASE64URL,
      size: 11,
    },
  },
  sizeEstimate: 500,
};

export const FIXTURE_GMAIL_LABEL_LIST = {
  labels: [
    {
      id: 'INBOX',
      name: 'INBOX',
      type: 'system',
      messageListVisibility: 'labelShow',
      messageUnreadCount: 5,
    },
  ],
};

export const FIXTURE_GMAIL_SEND_RESPONSE = {
  id: 'msg-sent-1',
  threadId: 'thread-sent-1',
  labelIds: ['SENT'],
};

export const FIXTURE_GMAIL_DRAFT_RESPONSE = {
  id: 'draft-1',
  message: { id: 'msg-draft-1', threadId: 'thread-draft-1' },
};

// --- Calendar fixtures ---

export const FIXTURE_CALENDAR_LIST = {
  items: [
    {
      id: 'cal-1',
      summary: 'My Calendar',
      timeZone: 'America/New_York',
      accessRole: 'owner',
      primary: true,
    },
  ],
  nextPageToken: undefined,
};

export const FIXTURE_CALENDAR_INFO = {
  id: 'cal-1',
  summary: 'My Calendar',
  timeZone: 'America/New_York',
  accessRole: 'owner',
  primary: true,
};

export const FIXTURE_CALENDAR_EVENT = {
  id: 'evt-1',
  summary: 'Team Meeting',
  description: 'Weekly team sync',
  location: 'Conference Room A',
  start: { dateTime: '2026-01-15T10:00:00Z', timeZone: 'America/New_York' },
  end: { dateTime: '2026-01-15T11:00:00Z', timeZone: 'America/New_York' },
  attendees: [
    { email: 'alice@example.com', displayName: 'Alice', responseStatus: 'accepted' },
    { email: 'bob@example.com', displayName: 'Bob', responseStatus: 'needsAction' },
  ],
  status: 'confirmed',
  htmlLink: 'https://www.google.com/calendar/event?eid=evt-1',
  creator: { email: 'alice@example.com' },
  organizer: { email: 'alice@example.com' },
  created: '2026-01-01T09:00:00.000Z',
  updated: '2026-01-01T09:00:00.000Z',
  reminders: { useDefault: true },
};

export const FIXTURE_CALENDAR_EVENT_LIST = {
  items: [FIXTURE_CALENDAR_EVENT],
  nextPageToken: undefined,
};

export const FIXTURE_CALENDAR_CREATE_EVENT_RESPONSE = {
  ...FIXTURE_CALENDAR_EVENT,
};

export const FIXTURE_FREEBUSY_RESPONSE = {
  timeMin: '2026-01-01T00:00:00Z',
  timeMax: '2026-01-02T00:00:00Z',
  calendars: {
    'cal-1': {
      busy: [{ start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z' }],
    },
  },
};

// --- Error fixtures ---

export const FIXTURE_ERROR_400 = {
  error: {
    code: 400,
    message: 'Invalid request',
    errors: [{ message: 'Invalid request', reason: 'invalid' }],
  },
};

export const FIXTURE_ERROR_401 = {
  error: {
    code: 401,
    message: 'Invalid credentials',
    errors: [{ message: 'Invalid credentials', reason: 'authError' }],
  },
};

export const FIXTURE_ERROR_403 = {
  error: {
    code: 403,
    message: 'Insufficient permissions',
    errors: [{ message: 'Insufficient permissions', reason: 'insufficientPermissions' }],
  },
};

export const FIXTURE_ERROR_404 = {
  error: {
    code: 404,
    message: 'File not found',
    errors: [{ message: 'File not found', reason: 'notFound' }],
  },
};

export const FIXTURE_ERROR_429 = {
  error: {
    code: 429,
    message: 'Rate limit exceeded',
    errors: [{ message: 'Rate limit exceeded', reason: 'rateLimitExceeded' }],
  },
};

export const FIXTURE_ERROR_500 = {
  error: {
    code: 500,
    message: 'Backend error',
    errors: [{ message: 'Backend error', reason: 'backendError' }],
  },
};
