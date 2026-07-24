export interface GitHubPaginationResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly perPage: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly nextPage?: number;
  readonly previousPage?: number;
  readonly totalCount?: number;
}

export interface GitHubPaginationLinks {
  readonly next?: string;
  readonly prev?: string;
  readonly first?: string;
  readonly last?: string;
}

export interface GitHubPaginationConfig {
  readonly maxPages: number;
  readonly maxItems: number;
}

export const DEFAULT_PAGINATION_CONFIG: GitHubPaginationConfig = {
  maxPages: 50,
  maxItems: 1000,
};
