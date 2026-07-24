# GitHub Connector — Testing

## Test Structure

```
tests/github/
├── fixtures/
│   └── index.ts              # All fixture data + mock helper re-exports
├── mocks/
│   └── MockFetch.ts          # createMockFetch(), createMockResponse(), helpers
├── index.ts                  # Re-exports fixtures and mocks
├── auth.test.ts              # 8 tests — token resolution, multi-tenant isolation
├── repositories.test.ts      # 5 tests — list, pagination, get, 404, field mapping
├── issues.test.ts            # 6 tests — list, get, create, comment, field mapping
├── pull-requests.test.ts     # 10 tests — list, get, stats, draft, merged, branches, workflows
├── rate-limits.test.ts       # 18 tests — header extraction, detection, error codes, sanitization, 204
├── webhooks.test.ts          # 15 tests — verification, parsing, event mapping
├── security.test.ts          # 14 tests — sanitization, host allowlist, path encoding, payload limits, isolation
└── integration.test.ts       # 15 tests — full pipeline through ConnectorRuntime for all 11 operations
```

## Test Count: 101 tests

| Suite | Tests |
|-------|-------|
| Authentication | 8 |
| Repositories | 5 |
| Issues | 6 |
| Pull Requests + Actions | 10 |
| Rate Limits + Error Mapping | 18 |
| Webhooks | 15 |
| Security | 14 |
| Integration | 15 |
| **Sprint 23 tests** | **136** |
| **Total** | **237** |

## Mock Strategy

### MockFetch

`createMockFetch()` creates a `FetchLike` function that matches routes by method + URL regex pattern. This is injected into `GitHubApiClient` via its constructor, allowing tests to run without network access.

```typescript
const mockFetch = createMockFetch([
  {
    method: 'GET',
    urlPattern: /\/user$/,
    response: { status: 200, body: FIXTURE_USER, headers: createRateLimitHeaders() },
  },
]);
const client = new GitHubApiClient({}, mockFetch);
```

### Fixtures

All test data is centralized in `fixtures/index.ts`:

- `FIXTURE_USER` — GitHub user response
- `FIXTURE_REPOSITORY` / `FIXTURE_REPOSITORIES_LIST` — Repository responses
- `FIXTURE_ISSUE` / `FIXTURE_ISSUES_LIST` / `FIXTURE_ISSUE_COMMENT_RESPONSE` — Issue responses
- `FIXTURE_PULL_REQUEST` / `FIXTURE_PULL_REQUEST_DRAFT` / `FIXTURE_PULL_REQUEST_MERGED` — PR variants
- `FIXTURE_WORKFLOW_RUN` / `FIXTURE_WORKFLOW_RUNS_LIST` — Actions responses
- `FIXTURE_RATE_LIMIT_HEADERS` / `FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS` — Rate limit header sets
- `FIXTURE_ERROR_*` — Error response bodies for each HTTP status
- `FIXTURE_LINK_HEADER_PAGE1` / `FIXTURE_LINK_HEADER_PAGE2` — Pagination Link headers
- `WEBHOOK_SECRET` / `WEBHOOK_PAYLOAD_PUSH` / `WEBHOOK_PAYLOAD_ISSUES` — Webhook test data

## Integration Tests

The integration test suite exercises the full `ConnectorRuntime` pipeline — all 11 stages including rate limiting, circuit breaker, timeout, retry, telemetry, metrics, and audit logging — for all 11 GitHub operations.

## Running Tests

```bash
npm test
```

All tests use Node.js's built-in test runner (`node:test`) with `tsx` for TypeScript transpilation.
