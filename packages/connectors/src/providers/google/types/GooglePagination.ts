export interface GooglePageResult<T> {
  readonly items: readonly T[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}

export interface GooglePaginationConfig {
  readonly maxPages: number;
  readonly maxItems: number;
}

export const DEFAULT_GOOGLE_PAGINATION_CONFIG: GooglePaginationConfig = {
  maxPages: 50,
  maxItems: 1000,
};
