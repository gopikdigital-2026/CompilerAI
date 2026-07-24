# Google Workspace Connector

A Google Workspace connector for the Compiler AI platform, supporting Google Drive, Gmail, and Calendar with 18 operations.

## Features

- **Google Drive**: List, get, search files; create folders; upload files; update metadata
- **Gmail**: List and get messages; list labels; send messages; create drafts
- **Google Calendar**: List and get calendars; list, get, create, update events; query free/busy

## Quick Start

```typescript
import { ConnectorRuntime, registerGoogleConnector, InMemoryCredentialStore, DevelopmentCredentialEncryptionProvider, CredentialResolver } from '@compiler/connectors';

const runtime = new ConnectorRuntime();
const store = new InMemoryCredentialStore();
const encryption = new DevelopmentCredentialEncryptionProvider('encryption-key');
const resolver = new CredentialResolver(store, encryption);

await resolver.storeCredentials('google-workspace', 'org-1', 'oauth2', {
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  refreshToken: 'your-refresh-token',
  accessToken: 'your-access-token',
});

registerGoogleConnector({ runtime, credentialResolver: resolver });

const result = await runtime.execute({
  connectorId: 'google-workspace',
  operation: 'google.drive.listFiles',
  input: { organizationId: 'org-1' },
  context: { organizationId: 'org-1', userId: null, requestId: 'r-1', correlationId: 'c-1', traceId: 't-1', metadata: {} },
});
```

## Operations

| Service | Operation | Capabilities | Retryable |
|---------|-----------|-------------|-----------|
| Drive | `google.drive.listFiles` | `drive.files.read` | Yes |
| Drive | `google.drive.getFile` | `drive.files.read` | Yes |
| Drive | `google.drive.searchFiles` | `drive.search` | Yes |
| Drive | `google.drive.createFolder` | `drive.files.write` | No |
| Drive | `google.drive.uploadFile` | `drive.files.write` | No |
| Drive | `google.drive.updateFileMetadata` | `drive.files.write` | Yes |
| Gmail | `google.gmail.listMessages` | `gmail.messages.read` | Yes |
| Gmail | `google.gmail.getMessage` | `gmail.messages.read` | Yes |
| Gmail | `google.gmail.listLabels` | `gmail.labels.read` | Yes |
| Gmail | `google.gmail.sendMessage` | `gmail.messages.send` | No |
| Gmail | `google.gmail.createDraft` | `gmail.messages.send` | No |
| Calendar | `google.calendar.listCalendars` | `calendar.calendars.read` | Yes |
| Calendar | `google.calendar.getCalendar` | `calendar.calendars.read` | Yes |
| Calendar | `google.calendar.listEvents` | `calendar.events.read` | Yes |
| Calendar | `google.calendar.getEvent` | `calendar.events.read` | Yes |
| Calendar | `google.calendar.createEvent` | `calendar.events.write` | No |
| Calendar | `google.calendar.updateEvent` | `calendar.events.write` | Yes |
| Calendar | `google.calendar.queryFreeBusy` | `calendar.events.read` | Yes |

## Authentication

OAuth2 with refresh token support. Required credentials:
- `clientId`
- `clientSecret`
- `refreshToken`
- `accessToken`

## Documentation

See [docs/google/](./docs/google/) for detailed documentation on architecture, authentication, operations, data models, error handling, rate limits, security, pagination, runtime integration, and testing.
