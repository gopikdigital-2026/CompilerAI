export interface PageRequest {
  limit: number;
  offset: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function defaultPageRequest(limit: number = 50, offset: number = 0): PageRequest {
  return { limit: Math.min(Math.max(1, limit), 1000), offset: Math.max(0, offset) };
}

export function toPageResult<T>(items: T[], total: number, req: PageRequest): PageResult<T> {
  return {
    items,
    total,
    limit: req.limit,
    offset: req.offset,
    hasMore: req.offset + items.length < total,
  };
}
