# GitHub Connector — Rate Limits

## Header Extraction

GitHub returns rate limit information in response headers:

| Header | Description |
|--------|-------------|
| `x-ratelimit-limit` | Maximum requests per hour |
| `x-ratelimit-remaining` | Remaining requests in current window |
| `x-ratelimit-used` | Requests used in current window |
| `x-ratelimit-reset` | Unix timestamp when the window resets |
| `x-ratelimit-resource` | Resource type (core, search, graphql, etc.) |
| `retry-after` | Seconds to wait before retrying (secondary rate limits) |

`GitHubRateLimitMapper.extractFromHeaders()` parses these into a structured `GitHubRateLimitHeaders` object with computed `resetAt` (ISO string) and `retryAfterMs` (milliseconds).

## Rate Limit Detection

`GitHubRateLimitMapper.isRateLimited()` returns true when:
- `x-ratelimit-remaining` is `0`
- `retry-after` header is present

## Error Mapping

When the GitHub API returns 429 or 403 with rate limit headers, `GitHubErrorMapper` creates a `ConnectorRateLimitError` with:

```typescript
{
  limit: number,
  remaining: number,
  resetAt: string,
  retryAfterMs?: number,
}
```

This error has `retryable: true`, allowing the Sprint 23 retry policy to automatically retry after the reset time.

## Secondary Rate Limits

GitHub imposes secondary rate limits for concurrent or burst requests. These are detected by:
1. HTTP 403 with `retry-after` header
2. Error message containing "rate limit" or "secondary rate limit"

## Integration with Sprint 23 Runtime

The `ConnectorRateLimitError` is recognized by the `RetryPolicy` which uses the `retryAfterMs` field (if present) to calculate the backoff duration, falling back to exponential backoff if not specified.
