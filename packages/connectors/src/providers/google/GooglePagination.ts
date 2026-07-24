import type { GooglePageResult, GooglePaginationConfig } from './types/GooglePagination';
import { DEFAULT_GOOGLE_PAGINATION_CONFIG } from './types/GooglePagination';

export class GooglePagination {
  static async *iteratePages<T>(
    fetchPage: (pageToken: string | undefined, signal?: AbortSignal) => Promise<GooglePageResult<T>>,
    options: { config?: GooglePaginationConfig; signal?: AbortSignal } = {},
  ): AsyncGenerator<GooglePageResult<T>, void, unknown> {
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

      if (seenTokens.has(result.nextPageToken)) return;
      seenTokens.add(result.nextPageToken);
      pageToken = result.nextPageToken;
      pageCount++;
    }
  }

  static buildPageResult<T>(items: readonly T[], nextPageToken?: string, resultSizeEstimate?: number): GooglePageResult<T> {
    return { items, nextPageToken, resultSizeEstimate };
  }
}
