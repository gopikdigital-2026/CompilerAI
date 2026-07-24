import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubPagination } from '../../src/index';

describe('GitHub Pagination — Link header parsing', () => {
  it('should parse next-only link', () => {
    const links = GitHubPagination.parseLinkHeader(
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=2>; rel="next"',
    );
    assert.equal(links.next, 'https://api.github.com/repos/octocat/Hello-World/issues?page=2');
    assert.equal(links.prev, undefined);
    assert.equal(links.first, undefined);
    assert.equal(links.last, undefined);
  });

  it('should parse next and last links', () => {
    const links = GitHubPagination.parseLinkHeader(
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=2>; rel="next", ' +
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=5>; rel="last"',
    );
    assert.ok(links.next);
    assert.ok(links.last);
    assert.equal(links.prev, undefined);
    assert.equal(links.first, undefined);
  });

  it('should parse first, prev, next, and last links', () => {
    const links = GitHubPagination.parseLinkHeader(
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=1>; rel="first", ' +
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=1>; rel="prev", ' +
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=3>; rel="next", ' +
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=5>; rel="last"',
    );
    assert.ok(links.first);
    assert.ok(links.prev);
    assert.ok(links.next);
    assert.ok(links.last);
  });

  it('should return empty object when header is absent', () => {
    const links = GitHubPagination.parseLinkHeader(undefined);
    assert.deepEqual(links, {});
  });

  it('should return empty object when header is empty', () => {
    const links = GitHubPagination.parseLinkHeader('');
    assert.deepEqual(links, {});
  });

  it('should handle malformed header gracefully', () => {
    const links = GitHubPagination.parseLinkHeader('this is not a valid link header');
    assert.deepEqual(links, {});
  });

  it('should handle partially malformed header', () => {
    const links = GitHubPagination.parseLinkHeader(
      'garbage text, <https://api.github.com/repos?page=2>; rel="next", more garbage',
    );
    assert.ok(links.next);
  });

  it('should handle links with additional query parameters', () => {
    const links = GitHubPagination.parseLinkHeader(
      '<https://api.github.com/repos/octocat/Hello-World/issues?page=2&per_page=30&state=open>; rel="next"',
    );
    assert.ok(links.next);
    assert.ok(links.next!.includes('per_page=30'));
    assert.ok(links.next!.includes('state=open'));
  });
});

describe('GitHub Pagination — page extraction', () => {
  it('should extract page number from URL', () => {
    const page = GitHubPagination.extractPageFromUrl('https://api.github.com/repos?page=3');
    assert.equal(page, 3);
  });

  it('should return undefined when no page param', () => {
    const page = GitHubPagination.extractPageFromUrl('https://api.github.com/repos');
    assert.equal(page, undefined);
  });

  it('should return undefined for invalid URL', () => {
    const page = GitHubPagination.extractPageFromUrl('not-a-url');
    assert.equal(page, undefined);
  });

  it('should return undefined for non-numeric page', () => {
    const page = GitHubPagination.extractPageFromUrl('https://api.github.com/repos?page=abc');
    assert.equal(page, undefined);
  });
});

describe('GitHub Pagination — buildResult', () => {
  it('should detect next page from link header', () => {
    const result = GitHubPagination.buildResult(
      ['item1', 'item2'], 1, 30,
      '<https://api.github.com/repos?page=2>; rel="next"',
    );
    assert.equal(result.hasNextPage, true);
    assert.equal(result.nextPage, 2);
    assert.equal(result.hasPreviousPage, false);
  });

  it('should detect previous page from link header', () => {
    const result = GitHubPagination.buildResult(
      ['item1'], 2, 30,
      '<https://api.github.com/repos?page=1>; rel="prev"',
    );
    assert.equal(result.hasPreviousPage, true);
    assert.equal(result.previousPage, 1);
    assert.equal(result.hasNextPage, false);
  });

  it('should set hasNextPage false when no link header', () => {
    const result = GitHubPagination.buildResult(['item1'], 1, 30, undefined);
    assert.equal(result.hasNextPage, false);
    assert.equal(result.hasPreviousPage, false);
  });
});

describe('GitHub Pagination — iteratePages', () => {
  it('should iterate multiple pages', async () => {
    const pageCalls: number[] = [];
    const fetchPage = async (page: number) => {
      pageCalls.push(page);
      return GitHubPagination.buildResult(
        [`item-${page}`], page, 30,
        page < 3 ? `<https://api.github.com/repos?page=${page + 1}>; rel="next"` : undefined,
      );
    };

    const results: string[] = [];
    for await (const page of GitHubPagination.iteratePages(fetchPage, { perPage: 30 })) {
      results.push(...page.items);
    }

    assert.equal(results.length, 3);
    assert.equal(pageCalls.length, 3);
  });

  it('should respect maxPages limit', async () => {
    let count = 0;
    const fetchPage = async (page: number) => {
      count++;
      return GitHubPagination.buildResult(
        [`item-${page}`], page, 30,
        `<https://api.github.com/repos?page=${page + 1}>; rel="next"`,
      );
    };

    const results: string[] = [];
    for await (const page of GitHubPagination.iteratePages(fetchPage, { perPage: 30, config: { maxPages: 3, maxItems: 1000 } })) {
      results.push(...page.items);
    }

    assert.equal(count, 3);
  });

  it('should respect maxItems limit', async () => {
    const fetchPage = async (page: number) => {
      return GitHubPagination.buildResult(
        Array(10).fill(`item-${page}`), page, 30,
        `<https://api.github.com/repos?page=${page + 1}>; rel="next"`,
      );
    };

    const results: string[] = [];
    for await (const page of GitHubPagination.iteratePages(fetchPage, { perPage: 30, config: { maxPages: 50, maxItems: 15 } })) {
      results.push(...page.items);
    }

    // First page yields 10 items, second page pushes total to 20 which exceeds 15.
    // The maxItems check happens after yielding, so up to 2 pages can be returned.
    assert.ok(results.length >= 10, `Expected at least 10 items, got ${results.length}`);
    assert.ok(results.length <= 20, `Expected at most 20 items, got ${results.length}`);
  });

  it('should stop when abort signal is set', async () => {
    const controller = new AbortController();
    let count = 0;
    const fetchPage = async (page: number) => {
      count++;
      if (page === 2) controller.abort();
      return GitHubPagination.buildResult(
        [`item-${page}`], page, 30,
        `<https://api.github.com/repos?page=${page + 1}>; rel="next"`,
      );
    };

    const results: string[] = [];
    for await (const page of GitHubPagination.iteratePages(fetchPage, { perPage: 30, signal: controller.signal })) {
      results.push(...page.items);
    }

    assert.ok(count <= 2);
  });

  it('should stop when hasNextPage is false', async () => {
    let count = 0;
    const fetchPage = async (page: number) => {
      count++;
      return GitHubPagination.buildResult(
        [`item-${page}`], page, 30, undefined,
      );
    };

    const results: string[] = [];
    for await (const page of GitHubPagination.iteratePages(fetchPage, { perPage: 30 })) {
      results.push(...page.items);
    }

    assert.equal(count, 1, 'Should stop after first page when no next link');
    assert.equal(results.length, 1);
  });
});
