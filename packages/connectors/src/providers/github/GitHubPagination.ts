import type { GitHubPaginationResult, GitHubPaginationLinks, GitHubPaginationConfig } from './types/GitHubPaginationResult';
import { DEFAULT_PAGINATION_CONFIG } from './types/GitHubPaginationResult';

export class GitHubPagination {
  static parseLinkHeader(linkHeader: string | undefined): GitHubPaginationLinks {
    if (!linkHeader || linkHeader.length === 0) return {};

    const links: { next?: string; prev?: string; first?: string; last?: string } = {};
    const parts = linkHeader.split(',');

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const url = match[1]!;
        const rel = match[2]! as keyof GitHubPaginationLinks;
        if (rel === 'next' || rel === 'prev' || rel === 'first' || rel === 'last') {
          links[rel] = url;
        }
      }
    }

    return links;
  }

  static extractPageFromUrl(url: string): number | undefined {
    try {
      const parsed = new URL(url);
      const page = parsed.searchParams.get('page');
    if (page) {
      const num = parseInt(page, 10);
      return Number.isNaN(num) ? undefined : num;
    }
    } catch {
      // Invalid URL
    }
    return undefined;
  }

  static buildResult<T>(
    items: readonly T[],
    currentPage: number,
    perPage: number,
    linkHeader: string | undefined,
    totalCount?: number,
  ): GitHubPaginationResult<T> {
    const links = GitHubPagination.parseLinkHeader(linkHeader);

    const nextPage = links.next ? GitHubPagination.extractPageFromUrl(links.next) : undefined;
    const previousPage = links.prev ? GitHubPagination.extractPageFromUrl(links.prev) : undefined;

    return {
      items,
      page: currentPage,
      perPage,
      hasNextPage: nextPage !== undefined,
      hasPreviousPage: previousPage !== undefined,
      nextPage,
      previousPage,
      totalCount,
    };
  }

  static async *iteratePages<T>(
    fetchPage: (page: number, perPage: number, signal?: AbortSignal) => Promise<GitHubPaginationResult<T>>,
    options: { perPage?: number; config?: GitHubPaginationConfig; signal?: AbortSignal } = {},
  ): AsyncGenerator<GitHubPaginationResult<T>, void, unknown> {
    const perPage = options.perPage ?? 30;
    const config = options.config ?? DEFAULT_PAGINATION_CONFIG;
    let page = 1;
    let totalItems = 0;
    const seenUrls = new Set<string>();

    while (page <= config.maxPages) {
      if (options.signal?.aborted) return;

      const result = await fetchPage(page, perPage, options.signal);

      const fingerprint = `${page}:${result.items.length}`;
      if (seenUrls.has(fingerprint)) return;
      seenUrls.add(fingerprint);

      yield result;

      totalItems += result.items.length;
      if (totalItems >= config.maxItems) return;
      if (!result.hasNextPage) return;

      page = result.nextPage ?? page + 1;
    }
  }
}
