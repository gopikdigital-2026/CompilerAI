# GitHub Connector — Pagination

## Link Header Parsing

GitHub uses the [Link header](https://docs.github.com/rest/using-api/rest-api#pagination) for pagination. The `GitHubPagination` class parses this header into a `GitHubPaginationLinks` object:

```
<https://api.github.com/user/repos?page=2&per_page=30>; rel="next",
<https://api.github.com/user/repos?page=5&per_page=30>; rel="last"
```

Parsed as:
```typescript
{
  next: "https://api.github.com/user/repos?page=2&per_page=30",
  last: "https://api.github.com/user/repos?page=5&per_page=30"
}
```

## Build Result

`GitHubPagination.buildResult()` combines the response items with Link header metadata into a `GitHubPaginationResult<T>`:

```typescript
{
  items: T[],
  page: number,
  perPage: number,
  hasNextPage: boolean,
  hasPreviousPage: boolean,
  nextPage?: number,
  previousPage?: number,
  totalCount?: number,
}
```

## Async Iteration

`GitHubPagination.iteratePages()` is an async generator that yields each page of results. It includes safety limits:

| Limit | Default | Description |
|-------|---------|-------------|
| `maxPages` | 50 | Maximum pages to fetch |
| `maxItems` | 1000 | Maximum total items across all pages |
| Loop detection | — | Stops if the same URL is seen twice |

These limits prevent runaway pagination that could exhaust API rate limits or memory.

## Default Configuration

```typescript
const DEFAULT_PAGINATION_CONFIG: GitHubPaginationConfig = {
  maxPages: 50,
  maxItems: 1000,
};
```
