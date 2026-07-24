import type { FetchLike } from '../../src/providers/github/GitHubApiClient';

export interface MockResponseConfig {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Record<string, string>;
}

export interface MockRoute {
  readonly method: string;
  readonly urlPattern: RegExp;
  readonly response: MockResponseConfig | (() => MockResponseConfig);
}

export function createMockFetch(
  routes: MockRoute[],
  defaultResponse?: MockResponseConfig,
): FetchLike {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();

    for (const route of routes) {
      if (route.method.toUpperCase() === method && route.urlPattern.test(url)) {
        const config = typeof route.response === 'function' ? route.response() : route.response;
        return createMockResponse(config);
      }
    }

    if (defaultResponse) {
      return createMockResponse(defaultResponse);
    }

    return createMockResponse({
      status: 404,
      body: { message: 'Not Found', documentation_url: 'https://docs.github.com/rest' },
      headers: {},
    });
  }) as FetchLike;
}

function createMockResponse(config: MockResponseConfig): Response {
  const headers = new Headers();
  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      headers.set(key, value);
    }
  }

  const body = config.status === 204 ? null : JSON.stringify(config.body);

  return new Response(body, {
    status: config.status,
    headers,
  });
}

export function createRateLimitHeaders(remaining: number = 4999, resetEpoch: number = 1372700873): Record<string, string> {
  return {
    'x-ratelimit-limit': '5000',
    'x-ratelimit-remaining': String(remaining),
    'x-ratelimit-used': String(5000 - remaining),
    'x-ratelimit-reset': String(resetEpoch),
    'x-ratelimit-resource': 'core',
  };
}

export function createErrorConfig(status: number, message: string, extra?: Record<string, unknown>): MockResponseConfig {
  return {
    status,
    body: {
      message,
      documentation_url: 'https://docs.github.com/rest',
      ...extra,
    },
    headers: {},
  };
}
