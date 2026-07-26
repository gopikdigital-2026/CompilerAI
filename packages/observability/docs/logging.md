# Structured Logging

The `StructuredLogger` emits JSON-friendly `LogEntry` records and automatically
redacts sensitive fields from log context before they are stored.

## LogEntry structure

```ts
interface LogEntry {
  id: string;                        // 'log-<base36>', auto-assigned
  timestamp: string;                 // ISO-8601, auto-assigned
  level: LogLevel;                   // 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  component: ComponentName;
  organizationId?: string;
  userId?: string;
  agentId?: string;
  message: string;
  correlationId?: string;            // joins related logs across services
  traceId?: string;                  // joins a log to its trace
  context: Record<string, unknown>;  // sanitized before storage
}
```

`writeLog` (the facade method) takes `Omit<LogEntry, 'id' | 'timestamp'>`; the
logger assigns both automatically. The convenience method `log(level,
component, message, options?)` builds the entry for you.

## Log levels

Five levels are supported, in increasing severity:

`debug` → `info` → `warn` → `error` → `fatal`

## Sensitive field redaction

Before a log is stored, the logger walks its `context` object recursively and
replaces the value of any key whose lowercased name **contains** one of the
`SENSITIVE_FIELDS` substrings with the literal string `'[REDACTED]'`. Nested
objects are recursed; arrays and primitives are left untouched.

The `SENSITIVE_FIELDS` constant contains:

```
password, secret, token, apiKey, api_key, privateKey, private_key,
credential, authorization, cookie, session, accessToken, access_token,
refreshToken, refresh_token
```

Because matching is substring-based and case-insensitive, a key like
`userAccessToken` or `X-Api-Key` is also redacted.

## Querying logs

`query(filter)` filters by `level`, `component`, `organizationId`,
`correlationId`, `traceId`, and a `[startTime, endTime]` window, returning up
to `limit` (default 1000) most recent matches. `getById(id)` retrieves a
single entry.

## Code example

```ts
import { ObservabilityPlatform } from '@compilerai/observability';

const platform = new ObservabilityPlatform();

// Sensitive data is redacted automatically
const entry = platform.writeLog({
  level: 'info',
  component: 'security_governance',
  organizationId: 'org-42',
  userId: 'u-1',
  message: 'User authenticated',
  correlationId: 'corr-99',
  context: {
    method: 'oidc',
    accessToken: 'eyJhbGciOi...',   // will become '[REDACTED]'
    user: { email: 'a@b.com', apiKey: 'sk_live_123' }, // nested apiKey redacted
  },
});

console.log(entry.context.accessToken); // '[REDACTED]'
console.log(entry.context.user.apiKey); // '[REDACTED]'
console.log(entry.context.method);      // 'oidc' (not sensitive)

// Convenience helper
platform.log('warn', 'connector_runtime', 'Connector retrying', {
  correlationId: 'corr-99',
  context: { attempt: 3, endpoint: '/api/v1' },
});

// Query by correlation id to follow a request across components
const related = platform.queryLogs({ correlationId: 'corr-99' });
```

Use `getAll()` to read every stored entry and `clear()` to reset the store.
