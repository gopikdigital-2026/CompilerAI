import type { FetchLike } from '../../../src/providers/google/GoogleApiClient';

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
      body: { error: { code: 404, message: 'Not Found', errors: [{ message: 'Not Found', reason: 'notFound' }] } },
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

/**
 * Google API rate-limit headers. Google uses `x-ratelimit-limit` and
 * `x-ratelimit-remaining` (matching what GoogleRateLimitMapper looks for),
 * plus `retry-after` for 429 responses.
 */
export function createGoogleRateLimitHeaders(
  remaining: number = 1000,
  resetEpoch?: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-ratelimit-limit': '10000',
    'x-ratelimit-remaining': String(remaining),
  };
  if (resetEpoch !== undefined) {
    headers['retry-after'] = String(Math.max(0, Math.floor((resetEpoch - Date.now() / 1000))));
  }
  return headers;
}

export function createErrorConfig(
  status: number,
  message: string,
  reason?: string,
  extra?: Record<string, unknown>,
): MockResponseConfig {
  return {
    status,
    body: {
      error: {
        code: status,
        message,
        errors: [{ message, reason: reason ?? 'unknown' }],
        ...extra,
      },
    },
    headers: {},
  };
}
