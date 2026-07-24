# Google Workspace Connector — Testing

## Overview

The Google Workspace connector has a comprehensive test suite of **96 tests across 8 test files**. All tests run **offline** using mock fetch — no network access is required. The test strategy covers operations, authentication, rate limits, security, runtime integration, and registration.

## Test Structure

```
tests/google/
├── fixtures/                    # Test fixture data for all Google API responses
├── mocks/                       # Mock fetch and helper utilities
├── auth.test.ts                 # 8 tests — OAuth2 adapter, token caching, refresh, single-flight
├── drive.test.ts                # 10 tests — Drive operations (list, get, search, create, upload, update)
├── gmail.test.ts                # 9 tests — Gmail operations (list, get, labels, send, draft)
├── calendar.test.ts             # 10 tests — Calendar operations (list, get, events, create, update, free/busy)
├── rate-limits.test.ts          # 20 tests — Header extraction, error body extraction, reason detection, rate-limit errors
├── security.test.ts             # 22 tests — Host allowlist, path traversal, header injection, email validation, redaction, payload limits
├── registration.test.ts         # 9 tests — Operation registration, duplicate detection, capability mapping
└── runtime-integration.test.ts  # 8 tests — Full pipeline execution through ConnectorRuntime
```

## Test Count: 96 tests

| Suite | Tests | Coverage Area |
|-------|-------|---------------|
| Authentication | 8 | Token caching, refresh, single-flight, credential resolution, error handling |
| Drive Operations | 10 | listFiles, getFile, searchFiles, createFolder, uploadFile, updateFileMetadata |
| Gmail Operations | 9 | listMessages, getMessage, listLabels, sendMessage, createDraft |
| Calendar Operations | 10 | listCalendars, getCalendar, listEvents, getEvent, createEvent, updateEvent, queryFreeBusy |
| Rate Limits | 20 | Header extraction, isRateLimited, reason detection, error body extraction, toMetadata, 429/403 mapping |
| Security | 22 | Host allowlist, path traversal, header injection, email validation, token redaction, payload limits |
| Registration | 9 | registerGoogleConnector, duplicate detection, operation names, capability mapping |
| Runtime Integration | 8 | Full pipeline: retry, timeout, circuit breaker, telemetry, audit |
| **Total** | **96** | |

## Mock Strategy

### Mock Fetch

All tests use a mock `fetch` implementation (`FetchLike`) injected via `GoogleApiClient`'s constructor or `context.metadata['fetchImpl']`. The mock matches routes by method + URL pattern and returns canned responses:

```typescript
const mockFetch = createMockFetch([
  {
    method: 'GET',
    urlPattern: /\/drive\/v3\/files/,
    response: { status: 200, body: FIXTURE_DRIVE_FILE_LIST, headers: {} },
  },
  {
    method: 'GET',
    urlPattern: /\/gmail\/v1\/users\/me\/messages/,
    response: { status: 200, body: FIXTURE_GMAIL_MESSAGE_LIST, headers: {} },
  },
]);

const client = new GoogleApiClient({}, mockFetch);
```

### TestTokenRefreshProvider

Authentication tests use `TestTokenRefreshProvider` to avoid real OAuth2 token refresh calls:

```typescript
const refreshProvider = new TestTokenRefreshProvider({
  access_token: 'test-access-token',
  expires_in: 3600,
});
const authAdapter = new GoogleOAuth2Adapter(credentialResolver, refreshProvider);
```

The provider tracks `refreshCount`, allowing tests to assert how many refresh calls were made (e.g., for single-flight verification).

### FailingTokenRefreshProvider

Used to test error propagation when token refresh fails:

```typescript
const refreshProvider = new FailingTokenRefreshProvider();
// authAdapter.getAccessToken() → ConnectorAuthenticationError
```

## Test Fixtures

All test data is centralized in `tests/google/fixtures/`, providing realistic Google API response bodies:

| Fixture | Description |
|---------|-------------|
| Drive file list | `GoogleDriveFileListResponse` with multiple files |
| Drive single file | `GoogleDriveFileResponse` |
| Drive folder creation response | `{ id: "folder-id" }` |
| Gmail message list | `GoogleGmailMessageListResponse` |
| Gmail full message | `GoogleGmailMessageResponse` with payload, headers, parts |
| Gmail metadata message | `GoogleGmailMessageResponse` with headers only |
| Gmail label list | `GoogleGmailLabelListResponse` with system + user labels |
| Gmail send response | `{ id, threadId }` |
| Gmail draft response | `{ id, message: { id } }` |
| Calendar list | `GoogleCalendarListResponse` |
| Calendar single | `GoogleCalendarInfoResponse` |
| Calendar event list | `GoogleCalendarEventListResponse` |
| Calendar single event | `GoogleCalendarEventResponse` |
| Calendar free/busy response | `GoogleFreeBusyRequestResponse` |
| Rate limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After` |
| Error bodies | Rate limit, auth, permissions, not found, backend error |

## Coverage by Area

### Authentication (8 tests)

- Token cache hit returns cached token without refresh
- Token cache miss triggers refresh
- Token within 60s threshold triggers proactive refresh
- Single-flight: concurrent requests share one refresh promise
- Refresh failure throws `ConnectorAuthenticationError`
- Missing credentials throws `ConnectorAuthenticationError`
- Missing required fields throws `ConnectorAuthenticationError`
- `invalidateCache()` clears cached token and in-flight refresh

### Drive Operations (10 tests)

- `listFiles` returns mapped `GoogleDriveFile[]`
- `listFiles` builds correct `q` query from filters
- `listFiles` passes `nextPageToken` through
- `getFile` returns single mapped file
- `searchFiles` builds query from name/content/mimeType/folder/date
- `createFolder` sends POST with folder mimeType
- `createFolder` is not retryable
- `uploadFile` sends multipart upload
- `uploadFile` rejects content exceeding 5MB
- `updateFileMetadata` sends PATCH with provided fields

### Gmail Operations (9 tests)

- `listMessages` returns message ID/thread ID pairs
- `listMessages` passes query and label filters
- `getMessage` with `format: 'metadata'` returns headers only
- `getMessage` with `format: 'full'` returns decoded body + attachments
- `listLabels` returns mapped labels
- `sendMessage` builds RFC 2822 and encodes base64url
- `sendMessage` validates email addresses
- `sendMessage` rejects header injection in subject
- `createDraft` creates draft with message

### Calendar Operations (10 tests)

- `listCalendars` returns mapped `GoogleCalendarInfo[]`
- `getCalendar` returns single mapped calendar
- `listEvents` returns mapped events with pagination
- `getEvent` returns single mapped event
- `createEvent` sends POST with event body
- `createEvent` validates start/end time objects
- `createEvent` validates attendee emails
- `updateEvent` sends PATCH
- `updateEvent` requires at least one updatable field
- `queryFreeBusy` sends POST and returns mapped `GoogleFreeBusyResult`

### Rate Limits (20 tests)

- `extractFromHeaders` returns null when no rate-limit headers
- `extractFromHeaders` parses `X-RateLimit-Limit` and `X-RateLimit-Remaining`
- `extractFromHeaders` parses `Retry-After` as seconds → milliseconds
- `isRateLimited` returns true when `remaining === 0`
- `isRateLimited` returns true when `retryAfterMs > 0`
- `isRateLimited` returns false for null info
- `isGoogleRateLimitReason` for all 4 rate-limit reasons
- `isGoogleRateLimitReason` returns false for non-rate-limit reasons
- `extractFromErrorBody` extracts from `error.errors[0].reason`
- `extractFromErrorBody` falls back to `error.reason`
- `toMetadata` produces flat metadata object
- 429 maps to `ConnectorRateLimitError`
- 403 with rate-limit reason maps to `ConnectorRateLimitError`
- 403 with `insufficientPermissions` maps to `AUTHORIZATION_ERROR`
- 403 with quota in message maps to `ConnectorRateLimitError`
- 401 maps to `ConnectorAuthenticationError`
- 404 maps to `VALIDATION_ERROR`
- 409 maps to `PROVIDER_ERROR` (retryable)
- 500 with `backendError` is retryable
- Error messages are sanitized (token/secret/key redacted)

### Security (22 tests)

- Host allowlist rejects non-Google hosts at construction
- Host allowlist rejects non-Google hosts at build time
- Path traversal (`..`) is rejected in decoded form
- Path traversal (`%2e`) is rejected in encoded form
- Path segment count limit enforced (max 20)
- Path segment length limit enforced (max 500)
- Query parameter count limit enforced (max 50)
- Path segments are URL-encoded
- Query params are URL-encoded
- Header injection in subject is rejected (`\r\n`)
- Header injection in subject is rejected (`\n`)
- `encodeHeaderParam` throws on newlines at runtime
- Email validation accepts valid addresses
- Email validation rejects invalid addresses
- Error messages redact `token`
- Error messages redact `secret`
- Error messages redact `key`
- Error messages redact `password`
- Error messages redact `bearer`
- Payload size limit enforced (10MB)
- Upload content limit enforced (5MB)
- Empty token rejected before network call

### Registration (9 tests)

- `registerGoogleConnector` registers all 18 operations
- `GOOGLE_OPERATION_NAMES` contains all 18 names
- Duplicate registration throws error
- `hasOperation` returns true after registration
- `hasOperation` returns false before registration
- Capabilities include all 9 capability names
- Auth requirements list correct required fields
- Auth requirements list correct scopes
- `refreshSupported` is true

### Runtime Integration (8 tests)

- Full pipeline execution for a read operation (listFiles)
- Full pipeline execution for a write operation (createEvent)
- Timeout is enforced via AbortSignal
- Retry occurs on transient error (network error, retryable op)
- Retry does not occur for non-retryable ops (sendMessage)
- Circuit breaker opens on sustained 5xx
- Rate limiter respects `Retry-After`
- Audit log records execution event

## Running Tests

```bash
npm test
```

All tests use Node.js's built-in test runner (`node:test`) with `tsx` for TypeScript transpilation. No network access is required — all HTTP calls are intercepted by mock fetch.
