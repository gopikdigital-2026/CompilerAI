# Google Workspace Connector — Pagination

## Overview

Google APIs use **token-based pagination** via a `nextPageToken` field in response bodies. This differs from GitHub's Link-header approach. The Google Workspace connector provides a `GooglePagination` utility for iterating across pages with configurable limits and abort signal support.

## Google Token-Based Pagination

### How It Works

1. The client sends a request with an optional `pageToken` query parameter.
2. Google returns a response body that includes the results and, if more results exist, a `nextPageToken` field.
3. The client sends the next request with `pageToken` set to the previous response's `nextPageToken`.
4. When `nextPageToken` is absent (or empty), all pages have been consumed.

```
Request:  GET /files?pageSize=100
Response: { files: [...100 items...], nextPageToken: "abc123" }

Request:  GET /files?pageSize=100&pageToken=abc123
Response: { files: [...50 items...], nextPageToken: null }  ← last page
```

### Key Characteristics

| Aspect | Google Pagination |
|--------|-------------------|
| Token location | Response body (`nextPageToken` field) |
| Token type | Opaque string |
| Token expiry | Tokens may expire; reuse promptly |
| Page size | Controlled by `pageSize` / `maxResults` query parameter |
| Direction | Forward only (no `prevPageToken` in this connector) |

## GooglePagination Class

### iteratePages

An async generator that fetches pages until exhausted or a limit is reached:

```typescript
static async *iteratePages<T>(
  fetchPage: (pageToken: string | undefined, signal?: AbortSignal) => Promise<GooglePageResult<T>>,
  options: { config?: GooglePaginationConfig; signal?: AbortSignal } = {},
): AsyncGenerator<GooglePageResult<T>, void, unknown>
```

#### Implementation

```typescript
static async *iteratePages<T>(fetchPage, options = {}): AsyncGenerator<GooglePageResult<T>> {
  const config = options.config ?? DEFAULT_GOOGLE_PAGINATION_CONFIG;
  let pageToken: string | undefined = undefined;
  let totalItems = 0;
  let pageCount = 0;
  const seenTokens = new Set<string>();

  while (pageCount < config.maxPages) {
    if (options.signal?.aborted) return;

    const result = await fetchPage(pageToken, options.signal);

    yield result;

    totalItems += result.items.length;
    if (totalItems >= config.maxItems) return;

    if (!result.nextPageToken) return;

    if (seenTokens.has(result.nextPageToken)) return;  // dedup guard
    seenTokens.add(result.nextPageToken);
    pageToken = result.nextPageToken;
    pageCount++;
  }
}
```

#### Features

| Feature | Description |
|---------|-------------|
| **maxPages limit** | Stops after `config.maxPages` pages (default: 50) |
| **maxItems limit** | Stops after `config.maxItems` total items (default: 1000) |
| **Abort signal support** | Checks `signal.aborted` before each page fetch; stops if aborted |
| **Token deduplication** | Tracks seen `nextPageToken` values in a `Set`; stops if a duplicate is detected (prevents infinite loops) |
| **Yields per page** | Each yielded value is a `GooglePageResult<T>` containing that page's items |

### buildPageResult

A helper to construct a `GooglePageResult` from raw items:

```typescript
static buildPageResult<T>(
  items: readonly T[],
  nextPageToken?: string,
  resultSizeEstimate?: number,
): GooglePageResult<T> {
  return { items, nextPageToken, resultSizeEstimate };
}
```

## GooglePaginationConfig

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

| Field | Default | Description |
|-------|---------|-------------|
| `maxPages` | 50 | Maximum number of pages to fetch |
| `maxItems` | 1000 | Maximum total items across all pages |

## GooglePageResult

```typescript
interface GooglePageResult<T> {
  readonly items: readonly T[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}
```

## Usage Example

```typescript
const allFiles: GoogleDriveFile[] = [];

for await (const page of GooglePagination.iteratePages(
  async (pageToken, signal) => {
    const result = await runtime.execute('google-workspace', 'google.drive.listFiles', {
      organizationId,
      pageToken,
      pageSize: 100,
    }, { signal });
    return {
      items: result.items,
      nextPageToken: result.nextPageToken,
    };
  },
  { config: { maxPages: 10, maxItems: 500 }, signal: controller.signal },
)) {
  allFiles.push(...page.items);
}
```

## Token Deduplication

Google page tokens are opaque strings, but in rare cases (e.g., API bugs or concurrent modifications) the same token could be returned repeatedly. The `iteratePages` generator maintains a `Set<string>` of seen tokens:

```typescript
if (seenTokens.has(result.nextPageToken)) return;  // stop — potential loop
seenTokens.add(result.nextPageToken);
```

This prevents infinite pagination loops without raising an error — the generator simply terminates.

## Abort Signal Support

The generator checks `options.signal?.aborted` at the top of each iteration:

```typescript
while (pageCount < config.maxPages) {
  if (options.signal?.aborted) return;
  // ...
}
```

This allows callers to cancel long-running pagination operations (e.g., on timeout or user cancellation). The signal is also passed to the `fetchPage` callback, allowing the underlying HTTP request to be aborted:

```typescript
const result = await fetchPage(pageToken, options.signal);
```

## Google vs GitHub Pagination

| Aspect | Google | GitHub |
|--------|--------|--------|
| Mechanism | `nextPageToken` in response body | `Link` header with rel="next" |
| Token format | Opaque string | Full URL |
| Page size control | `pageSize` / `maxResults` query param | `per_page` query param |
| Direction | Forward only | Forward + backward (rel="prev") |
| Utility class | `GooglePagination.iteratePages()` | `GitHubPagination` (Link header parsing) |
| Dedup | Built-in `Set<string>` token tracking | URL-based dedup |
| Max limits | `maxPages` (50) + `maxItems` (1000) | Configurable |
| Abort support | Yes (signal checked per page) | Yes |

## Operations Supporting Pagination

The following operations return `nextPageToken` and support pagination:

| Operation | Page Size Param | Default | Max |
|-----------|----------------|---------|-----|
| `google.drive.listFiles` | `pageSize` | 100 | 1000 |
| `google.drive.searchFiles` | `pageSize` | 100 | 1000 |
| `google.gmail.listMessages` | `maxResults` | 100 | 500 |
| `google.calendar.listCalendars` | `maxResults` | 100 | 250 |
| `google.calendar.listEvents` | `maxResults` | 250 | 2500 |

Operations without pagination (single resource or non-list):
- `google.drive.getFile`, `google.drive.createFolder`, `google.drive.uploadFile`, `google.drive.updateFileMetadata`
- `google.gmail.getMessage`, `google.gmail.listLabels`, `google.gmail.sendMessage`, `google.gmail.createDraft`
- `google.calendar.getCalendar`, `google.calendar.getEvent`, `google.calendar.createEvent`, `google.calendar.updateEvent`, `google.calendar.queryFreeBusy`
