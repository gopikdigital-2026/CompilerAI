# Google Workspace Connector — Operations

## Overview

The Google Workspace connector implements **18 operations**, each conforming to the `ConnectorOperation` contract from the connector runtime. Operations are registered with `ConnectorRuntime` via `registerGoogleConnector()` and executed through the `ConnectorExecutionPipeline`.

Operations are organized by service: **Drive** (6), **Gmail** (5), and **Calendar** (7).

## Operation Catalog

| # | Operation | Service | Method | Path | Retryable | Idempotent | Timeout |
|---|-----------|---------|--------|------|-----------|------------|---------|
| 1 | `google.drive.listFiles` | Drive | GET | `/files` | Yes | Yes | 15s |
| 2 | `google.drive.getFile` | Drive | GET | `/files/{fileId}` | Yes | Yes | 15s |
| 3 | `google.drive.searchFiles` | Drive | GET | `/files` (with `q`) | Yes | Yes | 15s |
| 4 | `google.drive.createFolder` | Drive | POST | `/files` | No | No | 15s |
| 5 | `google.drive.uploadFile` | Drive | POST | `/files` (multipart) | No | No | 30s |
| 6 | `google.drive.updateFileMetadata` | Drive | PATCH | `/files/{fileId}` | Yes | Yes | 15s |
| 7 | `google.gmail.listMessages` | Gmail | GET | `/users/me/messages` | Yes | Yes | 15s |
| 8 | `google.gmail.getMessage` | Gmail | GET | `/users/me/messages/{id}` | Yes | Yes | 15s |
| 9 | `google.gmail.listLabels` | Gmail | GET | `/users/me/labels` | Yes | Yes | 15s |
| 10 | `google.gmail.sendMessage` | Gmail | POST | `/users/me/messages/send` | No | No | 30s |
| 11 | `google.gmail.createDraft` | Gmail | POST | `/users/me/drafts` | No | No | 30s |
| 12 | `google.calendar.listCalendars` | Calendar | GET | `/users/me/calendarList` | Yes | Yes | 15s |
| 13 | `google.calendar.getCalendar` | Calendar | GET | `/users/me/calendarList/{id}` | Yes | Yes | 15s |
| 14 | `google.calendar.listEvents` | Calendar | GET | `/calendars/{id}/events` | Yes | Yes | 15s |
| 15 | `google.calendar.getEvent` | Calendar | GET | `/calendars/{id}/events/{id}` | Yes | Yes | 15s |
| 16 | `google.calendar.createEvent` | Calendar | POST | `/calendars/{id}/events` | No | No | 30s |
| 17 | `google.calendar.updateEvent` | Calendar | PATCH | `/calendars/{id}/events/{id}` | Yes | Yes | 30s |
| 18 | `google.calendar.queryFreeBusy` | Calendar | POST | `/freeBusy` | Yes | Yes | 15s |

## Capabilities

Each operation declares `requiredCapabilities` that map to connector capabilities:

| Capability | Operations |
|-----------|------------|
| `drive.files.read` | `listFiles`, `getFile` |
| `drive.search` | `searchFiles` |
| `drive.files.write` | `createFolder`, `uploadFile`, `updateFileMetadata` |
| `gmail.messages.read` | `listMessages`, `getMessage` |
| `gmail.labels.read` | `listLabels` |
| `gmail.messages.send` | `sendMessage`, `createDraft` |
| `calendar.calendars.read` | `listCalendars`, `getCalendar` |
| `calendar.events.read` | `listEvents`, `getEvent`, `queryFreeBusy` |
| `calendar.events.write` | `createEvent`, `updateEvent` |

---

## Drive Operations

### 1. google.drive.listFiles

Lists files in Google Drive with optional filtering.

| Property | Value |
|----------|-------|
| Capabilities | `drive.files.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `query` | string | No | — |
| `mimeType` | string | No | — |
| `folderId` | string | No | — |
| `pageSize` | number | No | 1–1000 |
| `pageToken` | string | No | — |
| `orderBy` | string | No | — |
| `includeTrashed` | boolean | No | — |

**Output:**

```typescript
interface ListFilesOutput {
  readonly items: readonly GoogleDriveFile[];
  readonly nextPageToken?: string;
  readonly incompleteSearch: boolean;
}
```

The operation builds a Drive `q` query from `mimeType`, `folderId`, `includeTrashed`, and `query` and requests a specific `fields` projection.

---

### 2. google.drive.getFile

Retrieves a single file by ID.

| Property | Value |
|----------|-------|
| Capabilities | `drive.files.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `fileId` | string | Yes | Non-empty |

**Output:**

```typescript
interface GetFileOutput {
  readonly file: GoogleDriveFile;
}
```

---

### 3. google.drive.searchFiles

Searches Drive files by name, content, MIME type, folder, or date range.

| Property | Value |
|----------|-------|
| Capabilities | `drive.search` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `name` | string | No | — |
| `contentSearch` | string | No | — |
| `mimeType` | string | No | — |
| `folderId` | string | No | — |
| `dateFrom` | string | No | — |
| `dateTo` | string | No | — |
| `pageSize` | number | No | 1–1000 |
| `pageToken` | string | No | — |

**Output:**

```typescript
interface SearchFilesOutput {
  readonly items: readonly GoogleDriveFile[];
  readonly nextPageToken?: string;
  readonly incompleteSearch: boolean;
}
```

Query values are escaped (single quotes escaped with `\'`) before being inserted into the Drive `q` parameter.

---

### 4. google.drive.createFolder

Creates a new folder in Google Drive.

| Property | Value |
|----------|-------|
| Capabilities | `drive.files.write` |
| Retryable | **No** |
| Idempotent | **No** |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `name` | string | Yes | Non-empty |
| `parentFolderId` | string | No | Non-empty if present |

**Output:**

```typescript
interface CreateFolderOutput {
  readonly folderId: string;
}
```

Sends a POST with `mimeType: 'application/vnd.google-apps.folder'`.

---

### 5. google.drive.uploadFile

Uploads a file using multipart upload.

| Property | Value |
|----------|-------|
| Capabilities | `drive.files.write` |
| Retryable | **No** |
| Idempotent | **No** |
| Timeout | 30,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `name` | string | Yes | Non-empty |
| `mimeType` | string | Yes | Non-empty |
| `content` | string | Yes | Max 5,000,000 bytes |
| `parentFolderId` | string | No | Non-empty if present |

**Output:**

```typescript
interface UploadFileOutput {
  readonly fileId: string;
}
```

Uses `GoogleApiClient.postMultipart()` with `uploadType=multipart`. The multipart body is validated against `maxPayloadBytes` (10 MB default).

---

### 6. google.drive.updateFileMetadata

Updates file metadata (name, parents, starred, trashed) via PATCH.

| Property | Value |
|----------|-------|
| Capabilities | `drive.files.write` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `fileId` | string | Yes | Non-empty |
| `name` | string | No | Non-empty if present |
| `parents` | string[] | No | Array of strings |
| `starred` | boolean | No | — |
| `trashed` | boolean | No | — |

At least one of `name`, `parents`, `starred`, or `trashed` must be provided.

**Output:**

```typescript
interface UpdateFileMetadataOutput {
  readonly file: GoogleDriveFile;
}
```

---

## Gmail Operations

### 7. google.gmail.listMessages

Lists message IDs and thread IDs.

| Property | Value |
|----------|-------|
| Capabilities | `gmail.messages.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `query` | string | No | — |
| `labelIds` | string[] | No | Array of strings |
| `pageToken` | string | No | — |
| `maxResults` | number | No | 1–500 |
| `includeSpamTrash` | boolean | No | — |

**Output:**

```typescript
interface ListMessagesOutput {
  readonly messages: { readonly id: string; readonly threadId: string }[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}
```

---

### 8. google.gmail.getMessage

Retrieves a full message by ID.

| Property | Value |
|----------|-------|
| Capabilities | `gmail.messages.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `messageId` | string | Yes | Non-empty |
| `format` | `'metadata' \| 'full'` | No | Default: `metadata` |

**Output:**

```typescript
interface GetMessageOutput {
  readonly message: GoogleGmailMessage;
}
```

With `format: 'full'`, the mapper extracts `bodyText`, `bodyHtml`, and `attachments` from the message payload.

---

### 9. google.gmail.listLabels

Lists all labels for the authenticated user.

| Property | Value |
|----------|-------|
| Capabilities | `gmail.labels.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |

**Output:**

```typescript
interface ListLabelsOutput {
  readonly labels: GoogleGmailLabel[];
}
```

---

### 10. google.gmail.sendMessage

Sends an email message.

| Property | Value |
|----------|-------|
| Capabilities | `gmail.messages.send` |
| Retryable | **No** |
| Idempotent | **No** |
| Timeout | 30,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `to` | string[] | Yes | Non-empty array; each address validated |
| `cc` | string[] | No | Each address validated |
| `bcc` | string[] | No | Each address validated |
| `subject` | string | Yes | Non-empty; **no newlines** (header injection check) |
| `bodyText` | string | No | — |
| `bodyHtml` | string | No | — |
| `replyToMessageId` | string | No | — |

**Output:**

```typescript
interface SendMessageOutput {
  readonly messageId: string;
  readonly threadId: string;
}
```

Builds an RFC 2822 message, encodes it as base64url, and POSTs to `/users/me/messages/send`.

---

### 11. google.gmail.createDraft

Creates a draft email.

| Property | Value |
|----------|-------|
| Capabilities | `gmail.messages.send` |
| Retryable | **No** |
| Idempotent | **No** |
| Timeout | 30,000 ms |

**Input:** Same as `sendMessage` (to, cc, bcc, subject, bodyText, bodyHtml, replyToMessageId).

**Output:**

```typescript
interface CreateDraftOutput {
  readonly draftId: string;
  readonly messageId: string;
}
```

POSTs to `/users/me/drafts` with `{ message: { raw } }`.

---

## Calendar Operations

### 12. google.calendar.listCalendars

Lists calendars from the user's calendar list.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.calendars.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `pageToken` | string | No | — |
| `maxResults` | number | No | 1–250 |

**Output:**

```typescript
interface ListCalendarsOutput {
  readonly calendars: GoogleCalendarInfo[];
  readonly nextPageToken?: string;
}
```

---

### 13. google.calendar.getCalendar

Retrieves a single calendar by ID from the calendar list.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.calendars.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `calendarId` | string | Yes | Non-empty |

**Output:**

```typescript
interface GetCalendarOutput {
  readonly calendar: GoogleCalendarInfo;
}
```

---

### 14. google.calendar.listEvents

Lists events on a calendar.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.events.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `calendarId` | string | Yes | Non-empty |
| `timeMin` | string | No | — |
| `timeMax` | string | No | — |
| `pageToken` | string | No | — |
| `maxResults` | number | No | 1–2500 |
| `singleEvents` | boolean | No | — |
| `orderBy` | `'startTime' \| 'updated'` | No | — |
| `q` | string | No | — |

**Output:**

```typescript
interface ListEventsOutput {
  readonly events: GoogleCalendarEvent[];
  readonly nextPageToken?: string;
}
```

---

### 15. google.calendar.getEvent

Retrieves a single event by ID.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.events.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `calendarId` | string | Yes | Non-empty |
| `eventId` | string | Yes | Non-empty |

**Output:**

```typescript
interface GetEventOutput {
  readonly event: GoogleCalendarEvent;
}
```

---

### 16. google.calendar.createEvent

Creates a new event on a calendar.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.events.write` |
| Retryable | **No** |
| Idempotent | **No** |
| Timeout | 30,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `calendarId` | string | Yes | Non-empty |
| `summary` | string | Yes | Non-empty |
| `start` | `{ dateTime?, date?, timeZone? }` | Yes | Must have `dateTime` or `date`; validated |
| `end` | `{ dateTime?, date?, timeZone? }` | Yes | Must have `dateTime` or `date`; validated |
| `attendees` | `{ email, displayName? }[]` | No | Each must have non-empty `email` |
| `location` | string | No | — |
| `description` | string | No | — |
| `reminders` | `{ useDefault?, overrides? }` | No | Overrides need `method` + `minutes` |

**Output:**

```typescript
interface CreateEventOutput {
  readonly event: GoogleCalendarEvent;
}
```

---

### 17. google.calendar.updateEvent

Updates an existing event via PATCH.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.events.write` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 30,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `calendarId` | string | Yes | Non-empty |
| `eventId` | string | Yes | Non-empty |
| `summary` | string | No | Non-empty if present |
| `start` | object | No | Validated if present |
| `end` | object | No | Validated if present |
| `attendees` | array | No | Each must have non-empty `email` |
| `location` | string | No | — |
| `description` | string | No | — |
| `reminders` | object | No | — |

At least one updatable field must be provided.

**Output:**

```typescript
interface UpdateEventOutput {
  readonly event: GoogleCalendarEvent;
}
```

---

### 18. google.calendar.queryFreeBusy

Queries free/busy information for one or more calendars.

| Property | Value |
|----------|-------|
| Capabilities | `calendar.events.read` |
| Retryable | Yes |
| Idempotent | Yes |
| Timeout | 15,000 ms |

**Input:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `organizationId` | string | Yes | Non-empty |
| `timeMin` | string | Yes | Valid date/time |
| `timeMax` | string | Yes | Valid date/time |
| `calendarIds` | string[] | Yes | Non-empty array of non-empty strings |
| `timeZone` | string | No | Valid time zone if present |

**Output:**

```typescript
interface QueryFreeBusyOutput {
  readonly freeBusyResult: GoogleFreeBusyResult;
}
```

POSTs to `/freeBusy` with `{ timeMin, timeMax, items: [{ id }] }`.

---

## Non-Idempotent Operations

Five operations are marked `retryable: false, idempotent: false` to prevent the runtime from automatically retrying them on transient failures, avoiding duplicate side effects:

| Operation | Reason |
|-----------|--------|
| `google.drive.createFolder` | Could create duplicate folders |
| `google.drive.uploadFile` | Could upload duplicate files |
| `google.gmail.sendMessage` | Could send duplicate emails |
| `google.gmail.createDraft` | Could create duplicate drafts |
| `google.calendar.createEvent` | Could create duplicate calendar events |

## Input Validation

Every operation implements `validateInput()` which returns an array of error strings. Validation runs **before** any HTTP call. If errors are returned, the pipeline raises a `ConnectorValidationError` and the operation does not execute.

Common validation patterns:
- `organizationId` must be a non-empty string (all operations)
- Numeric bounds (e.g. `pageSize` 1–1000, `maxResults` 1–500 for Gmail, 1–250 for calendars, 1–2500 for events)
- Email address format validation (Gmail send/draft operations)
- Header injection detection (Gmail subject field)
- Date/time and time zone validation (Calendar operations)
- "At least one field" requirements (update operations)
