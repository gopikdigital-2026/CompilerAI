# Google Workspace Connector — Data Model

## Overview

The Google Workspace connector defines canonical TypeScript interfaces for all three services. Google API responses (snake_case JSON) are mapped to normalized camelCase models via service-specific mappers before being returned to callers. This document describes every canonical type, raw response type, and mapper transformation.

## Drive Types

### GoogleDriveFile

The canonical representation of a Google Drive file.

```typescript
interface GoogleDriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size: number | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
  readonly owners: readonly GoogleDriveOwner[];
  readonly parents: readonly string[];
  readonly webViewLink: string | null;
  readonly trashed: boolean;
  readonly metadata?: Metadata;
}
```

### GoogleDriveOwner

```typescript
interface GoogleDriveOwner {
  readonly id: string;
  readonly displayName: string;
  readonly emailAddress: string | null;
}
```

### GoogleDriveFolder

```typescript
interface GoogleDriveFolder {
  readonly id: string;
  readonly name: string;
  readonly parentFolderId: string | null;
  readonly webViewLink: string | null;
  readonly createdAt: string;
  readonly modifiedAt: string;
}
```

### Raw Response Types

```typescript
// Single file response from Drive API
interface GoogleDriveFileResponse {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly size?: string;          // Drive returns size as string
  readonly createdTime?: string;
  readonly modifiedTime?: string;
  readonly owners?: readonly {
    readonly displayName: string;
    readonly emailAddress?: string;
    readonly permissionId?: string;
  }[];
  readonly parents?: readonly string[];
  readonly webViewLink?: string;
  readonly trashed?: boolean;
}

// File list response
interface GoogleDriveFileListResponse {
  readonly files: readonly GoogleDriveFileResponse[];
  readonly nextPageToken?: string;
  readonly incompleteSearch?: boolean;
}
```

### GoogleDriveMapper Transformations

| Mapper Method | Input | Output | Key Transformations |
|---------------|-------|--------|---------------------|
| `mapFile(raw)` | `GoogleDriveFileResponse` | `GoogleDriveFile` | `size` string→number, `createdTime`→`createdAt`, `modifiedTime`→`modifiedAt`, owners mapped with `permissionId`→`id` |
| `mapFileList(raw)` | `GoogleDriveFileListResponse` | `{ files, nextPageToken, incompleteSearch }` | Delegates to `mapFile` per item |

---

## Gmail Types

### GoogleGmailMessage

The canonical representation of a Gmail message.

```typescript
interface GoogleGmailMessage {
  readonly id: string;
  readonly threadId: string;
  readonly subject: string | null;
  readonly from: string | null;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly date: string | null;
  readonly snippet: string | null;
  readonly labels: readonly string[];
  readonly bodyText: string | null;
  readonly bodyHtml: string | null;
  readonly attachments: readonly GoogleGmailAttachment[];
  readonly internalDate: string | null;
  readonly metadata?: Metadata;
}
```

### GoogleGmailLabel

```typescript
interface GoogleGmailLabel {
  readonly id: string;
  readonly name: string;
  readonly type: 'system' | 'user';
  readonly messageListVisibility: 'show' | 'hide' | null;
  readonly labelListVisibility: 'labelShow' | 'labelShowIfUnread' | 'labelHide' | null;
}
```

### GoogleGmailAttachment

```typescript
interface GoogleGmailAttachment {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
}
```

### Raw Response Types

```typescript
interface GoogleGmailMessageResponse {
  readonly id: string;
  readonly threadId: string;
  readonly labelIds?: readonly string[];
  readonly snippet?: string;
  readonly payload?: GoogleGmailMessagePart;
  readonly sizeEstimate?: number;
  readonly internalDate?: string;
}

interface GoogleGmailMessagePart {
  readonly partId?: string;
  readonly mimeType?: string;
  readonly filename?: string;
  readonly headers?: readonly { readonly name: string; readonly value: string }[];
  readonly body?: { readonly attachmentId?: string; readonly size?: number; readonly data?: string };
  readonly parts?: readonly GoogleGmailMessagePart[];
}

interface GoogleGmailMessageListResponse {
  readonly messages: readonly { readonly id: string; readonly threadId: string }[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}

interface GoogleGmailLabelListResponse {
  readonly labels: readonly {
    readonly id: string;
    readonly name: string;
    readonly type?: string;
    readonly messageListVisibility?: string;
    readonly labelListVisibility?: string;
  }[];
}
```

### GoogleGmailMapper Transformations

| Mapper Method | Input | Output | Key Transformations |
|---------------|-------|--------|---------------------|
| `mapMessage(raw, format)` | `GoogleGmailMessageResponse` | `GoogleGmailMessage` | Extracts `Subject`, `From`, `To`, `Cc`, `Date` from payload headers; splits address lists by comma; decodes base64url body parts (full format); collects attachments recursively |
| `mapLabel(raw)` | Raw label object | `GoogleGmailLabel` | Normalizes `type` to `'system' \| 'user'`; validates visibility enums |
| `mapLabelList(raw)` | `GoogleGmailLabelListResponse` | `GoogleGmailLabel[]` | Delegates to `mapLabel` per item |
| `buildRfc2822Message(params)` | Send/draft input | RFC 2822 string | Builds `To`, `Cc`, `Bcc`, `Subject`, `In-Reply-To`, `References`, `Content-Type`, `MIME-Version` headers + body |
| `encodeBase64Url(input)` | string | base64url string | UTF-8 → base64url encoding |
| `validateEmailAddress(email)` | string | boolean | Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `checkHeaderInjection(value)` | string | boolean | Detects `\r\n` or `\n` in header values |

#### Body Extraction (full format)

The mapper recursively traverses `GoogleGmailMessagePart.parts` to find `text/plain` and `text/html` bodies, decoding base64url data:

```
payload
  ├─ mimeType: multipart/alternative
  │   ├─ part: text/plain → bodyText (base64url decoded)
  │   └─ part: text/html  → bodyHtml  (base64url decoded)
  └─ part: attachment (body.attachmentId present, filename non-empty)
```

#### Attachment Collection

Attachments are collected recursively from any part where `body.attachmentId` is present and `filename` is non-empty.

---

## Calendar Types

### GoogleCalendarInfo

```typescript
interface GoogleCalendarInfo {
  readonly id: string;
  readonly summary: string;
  readonly primary: boolean;
  readonly accessRole: string;
  readonly timeZone: string | null;
  readonly colorId: string | null;
  readonly metadata?: Metadata;
}
```

### GoogleCalendarEvent

```typescript
interface GoogleCalendarEvent {
  readonly id: string;
  readonly summary: string | null;
  readonly description: string | null;
  readonly location: string | null;
  readonly start: GoogleCalendarEventTime;
  readonly end: GoogleCalendarEventTime;
  readonly attendees: readonly GoogleCalendarEventAttendee[];
  readonly organizer: GoogleCalendarEventAttendee | null;
  readonly status: 'confirmed' | 'tentative' | 'cancelled';
  readonly htmlLink: string | null;
  readonly created: string | null;
  readonly updated: string | null;
  readonly reminders: GoogleCalendarEventReminders | null;
  readonly metadata?: Metadata;
}
```

### GoogleCalendarEventTime

```typescript
interface GoogleCalendarEventTime {
  readonly dateTime: string | null;
  readonly date: string | null;
  readonly timeZone: string | null;
}
```

### GoogleCalendarEventAttendee

```typescript
interface GoogleCalendarEventAttendee {
  readonly email: string;
  readonly displayName: string | null;
  readonly responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted' | null;
  readonly organizer: boolean;
  readonly self: boolean;
}
```

### GoogleCalendarEventReminders

```typescript
interface GoogleCalendarEventReminders {
  readonly useDefault: boolean;
  readonly overrides: readonly { readonly method: string; readonly minutes: number }[];
}
```

### GoogleFreeBusyResult

```typescript
interface GoogleFreeBusyResult {
  readonly timeMin: string;
  readonly timeMax: string;
  readonly calendars: readonly GoogleFreeBusyCalendar[];
}

interface GoogleFreeBusyCalendar {
  readonly calendarId: string;
  readonly busy: readonly { readonly start: string; readonly end: string }[];
}
```

### Raw Response Types

```typescript
interface GoogleCalendarListResponse {
  readonly items: readonly GoogleCalendarInfoResponse[];
}

interface GoogleCalendarInfoResponse {
  readonly id: string;
  readonly summary: string;
  readonly primary?: boolean;
  readonly accessRole?: string;
  readonly timeZone?: string;
  readonly colorId?: string;
}

interface GoogleCalendarEventListResponse {
  readonly items: readonly GoogleCalendarEventResponse[];
  readonly nextPageToken?: string;
}

interface GoogleCalendarEventResponse {
  readonly id: string;
  readonly summary?: string;
  readonly description?: string;
  readonly location?: string;
  readonly start?: { readonly dateTime?: string; readonly date?: string; readonly timeZone?: string };
  readonly end?: { readonly dateTime?: string; readonly date?: string; readonly timeZone?: string };
  readonly attendees?: readonly { readonly email: string; readonly displayName?: string; readonly responseStatus?: string; readonly organizer?: boolean; readonly self?: boolean; }[];
  readonly organizer?: { readonly email: string; readonly displayName?: string; readonly self?: boolean; };
  readonly status?: string;
  readonly htmlLink?: string;
  readonly created?: string;
  readonly updated?: string;
  readonly reminders?: { readonly useDefault?: boolean; readonly overrides?: readonly { readonly method: string; readonly minutes: number }[]; };
}

interface GoogleFreeBusyRequestResponse {
  readonly timeMin: string;
  readonly timeMax: string;
  readonly calendars: Readonly<Record<string, { readonly busy: readonly { readonly start: string; readonly end: string }[] }>>;
}
```

### GoogleCalendarMapper Transformations

| Mapper Method | Input | Output | Key Transformations |
|---------------|-------|--------|---------------------|
| `mapCalendar(raw)` | `GoogleCalendarInfoResponse` | `GoogleCalendarInfo` | Direct field mapping with null coalescing |
| `mapCalendarList(raw)` | `GoogleCalendarListResponse` | `GoogleCalendarInfo[]` | Delegates to `mapCalendar` per item |
| `mapEvent(raw)` | `GoogleCalendarEventResponse` | `GoogleCalendarEvent` | Maps start/end times, attendees, organizer, reminders; normalizes `status` to union type |
| `mapEventList(raw)` | `GoogleCalendarEventListResponse` | `GoogleCalendarEvent[]` | Delegates to `mapEvent` per item |
| `mapFreeBusy(raw)` | `GoogleFreeBusyRequestResponse` | `GoogleFreeBusyResult` | Converts `Record<string, {...}>` to `GoogleFreeBusyCalendar[]` array with `calendarId` |
| `validateDateTime(value)` | string | boolean | Validates date/time format |
| `validateTimeZone(value)` | string | boolean | Validates IANA time zone |

#### Free/Busy Mapping

The Google Free/Busy API returns calendars as a `Record<string, { busy: [...] }>` keyed by calendar ID. The mapper transforms this into an array:

```
Input:  { calendars: { "primary@group.calendar.google.com": { busy: [...] } } }
Output: { calendars: [{ calendarId: "primary@group.calendar.google.com", busy: [...] }] }
```

---

## Pagination Types

### GooglePageResult

```typescript
interface GooglePageResult<T> {
  readonly items: readonly T[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}
```

### GooglePaginationConfig

```typescript
interface GooglePaginationConfig {
  readonly maxPages: number;
  readonly maxItems: number;
}

const DEFAULT_GOOGLE_PAGINATION_CONFIG: GooglePaginationConfig = {
  maxPages: 50,
  maxItems: 1000,
};
```

---

## Type Export Summary

All types are exported from the connector barrel (`src/providers/google/index.ts`):

| Category | Types |
|----------|-------|
| Drive | `GoogleDriveFile`, `GoogleDriveOwner`, `GoogleDriveFolder`, `GoogleDriveFileResponse`, `GoogleDriveFileListResponse` |
| Gmail | `GoogleGmailMessage`, `GoogleGmailAttachment`, `GoogleGmailLabel`, `GoogleGmailMessageResponse`, `GoogleGmailMessagePart`, `GoogleGmailMessageListResponse`, `GoogleGmailLabelListResponse` |
| Calendar | `GoogleCalendarInfo`, `GoogleCalendarEvent`, `GoogleCalendarEventTime`, `GoogleCalendarEventAttendee`, `GoogleCalendarEventReminders`, `GoogleFreeBusyResult`, `GoogleFreeBusyCalendar`, `GoogleCalendarListResponse`, `GoogleCalendarInfoResponse`, `GoogleCalendarEventListResponse`, `GoogleCalendarEventResponse`, `GoogleFreeBusyRequestResponse` |
| Pagination | `GooglePageResult`, `GooglePaginationConfig` |
