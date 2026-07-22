import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { HttpTransport } from '../src/transport/HttpTransport';
import { ResolvedConfig } from '../src/config/CompilerAIConfig';
import type { ApiSuccessResponse, ApiErrorResponse } from '../src/types';
import {
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  NetworkError,
  TimeoutError,
  isCompilerAIError,
} from '../src/errors';

function createMockFetch(
  handler: (url: string, init: RequestInit) => { status: number; body: unknown },
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const result = handler(url, init ?? {});
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;
}

function createTransport(fetchFn: typeof fetch, overrides?: Partial<{ timeoutMs: number; maxRetries: number }>): HttpTransport {
  const cfg = new ResolvedConfig({
    apiKey: 'test-key',
    organizationId: 'org_123',
    fetch: fetchFn,
    timeoutMs: overrides?.timeoutMs ?? 5000,
    maxRetries: overrides?.maxRetries ?? 2,
  });
  return new HttpTransport(cfg);
}

describe('Transport — Headers', () => {
  test('sends api key, org id, request id, correlation id', async () => {
    let capturedInit: RequestInit | null = null;
    const fetchFn = createMockFetch((_url, init) => {
      capturedInit = init;
      return { status: 200, body: { data: { ok: true }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } } };
    });
    const transport = createTransport(fetchFn);
    await transport.request({ method: 'GET', path: '/health' });

    assert.ok(capturedInit, 'init must be captured');
    const headers = capturedInit!.headers as Record<string, string>;
    assert.equal(headers['X-Api-Key'], 'test-key');
    assert.equal(headers['X-Organization-Id'], 'org_123');
    assert.ok(headers['X-Request-Id'], 'request id must be set');
    assert.ok(headers['X-Correlation-Id'], 'correlation id must be set');
    assert.ok(headers['User-Agent'].startsWith('compilerai-sdk/'));
  });

  test('sends idempotency key when provided', async () => {
    let capturedInit: RequestInit | null = null;
    const fetchFn = createMockFetch((_url, init) => {
      capturedInit = init;
      return { status: 200, body: { data: {}, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } } };
    });
    const transport = createTransport(fetchFn);
    await transport.request({ method: 'POST', path: '/executions', body: {}, idempotencyKey: 'idem-123' });

    const headers = capturedInit!.headers as Record<string, string>;
    assert.equal(headers['Idempotency-Key'], 'idem-123');
  });
});

describe('Transport — Errors', () => {
  test('maps 401 to AuthenticationError', async () => {
    const body: ApiErrorResponse = {
      error: { code: 'AUTHENTICATION_REQUIRED', message: 'bad key', details: [], retryable: false },
      meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' },
    };
    const transport = createTransport(createMockFetch(() => ({ status: 401, body })));
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof AuthenticationError,
    );
  });

  test('maps 404 to NotFoundError', async () => {
    const body: ApiErrorResponse = {
      error: { code: 'EXECUTION_NOT_FOUND', message: 'missing', details: [], retryable: false },
      meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' },
    };
    const transport = createTransport(createMockFetch(() => ({ status: 404, body })));
    await assert.rejects(
      transport.request({ method: 'GET', path: '/executions/123' }),
      (e: unknown) => e instanceof NotFoundError,
    );
  });

  test('maps 429 to RateLimitError with retryable=true', async () => {
    const body: ApiErrorResponse = {
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'slow down', details: [{ remaining: 0, resetAt: 'tomorrow', message: 'rate limited' }], retryable: true },
      meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' },
    };
    const transport = createTransport(createMockFetch(() => ({ status: 429, body })), { maxRetries: 0 });
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof RateLimitError && e.retryable === true,
    );
  });

  test('maps 500 to ServerError', async () => {
    const body: ApiErrorResponse = {
      error: { code: 'INTERNAL_ERROR', message: 'boom', details: [], retryable: false },
      meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' },
    };
    const transport = createTransport(createMockFetch(() => ({ status: 500, body })), { maxRetries: 0 });
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof ServerError,
    );
  });

  test('non-JSON response throws ServerError', async () => {
    const fetchFn = (async () => {
      return new Response('<html>not json</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    }) as typeof fetch;
    const transport = createTransport(fetchFn);
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof ServerError && e.message.includes('content-type'),
    );
  });

  test('invalid JSON throws ServerError', async () => {
    const fetchFn = (async () => {
      return new Response('{not valid json', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    const transport = createTransport(fetchFn);
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof ServerError && e.message.includes('parse'),
    );
  });
});

describe('Transport — Retries', () => {
  test('retries on 429 then succeeds', async () => {
    let calls = 0;
    const fetchFn = createMockFetch(() => {
      calls++;
      if (calls < 3) {
        return {
          status: 429,
          body: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'slow', details: [], retryable: true }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } },
        };
      }
      return { status: 200, body: { data: { ok: true }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } } };
    });
    const transport = createTransport(fetchFn, { maxRetries: 3 });
    const result = await transport.request<{ ok: boolean }>({ method: 'GET', path: '/health' });
    assert.equal(calls, 3);
    assert.ok(result.ok);
  });

  test('does not retry on 400 (non-retryable)', async () => {
    let calls = 0;
    const fetchFn = createMockFetch(() => {
      calls++;
      return {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'bad', details: [], retryable: false }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } },
      };
    });
    const transport = createTransport(fetchFn, { maxRetries: 3 });
    await assert.rejects(transport.request({ method: 'GET', path: '/health' }));
    assert.equal(calls, 1);
  });

  test('does not retry when retryable=false in options', async () => {
    let calls = 0;
    const fetchFn = createMockFetch(() => {
      calls++;
      return {
        status: 500,
        body: { error: { code: 'INTERNAL_ERROR', message: 'boom', details: [], retryable: false }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } },
      };
    });
    const transport = createTransport(fetchFn, { maxRetries: 3 });
    await assert.rejects(transport.request({ method: 'GET', path: '/health', retryable: false }));
    assert.equal(calls, 1);
  });

  test('retries on network error then succeeds', async () => {
    let calls = 0;
    const fetchFn = (async () => {
      calls++;
      if (calls < 2) throw new TypeError('fetch failed');
      return new Response(JSON.stringify({ data: { ok: true }, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;
    const transport = createTransport(fetchFn, { maxRetries: 2 });
    const result = await transport.request<{ ok: boolean }>({ method: 'GET', path: '/health' });
    assert.equal(calls, 2);
    assert.ok(result.ok);
  });

  test('exhausts retries and throws NetworkError', async () => {
    const fetchFn = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    const transport = createTransport(fetchFn, { maxRetries: 1 });
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => e instanceof NetworkError,
    );
  });
});

describe('Transport — Timeout', () => {
  test('aborts on timeout', async () => {
    const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;
    const transport = createTransport(fetchFn, { timeoutMs: 50, maxRetries: 0 });
    await assert.rejects(
      transport.request({ method: 'GET', path: '/health' }),
      (e: unknown) => isCompilerAIError(e) && e instanceof TimeoutError,
    );
  });
});

describe('Transport — Cancellation', () => {
  test('respects AbortSignal from caller', async () => {
    const fetchFn = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }) as typeof fetch;
    const transport = createTransport(fetchFn, { timeoutMs: 10_000, maxRetries: 0 });
    const controller = new AbortController();
    const promise = transport.request({ method: 'GET', path: '/health', signal: controller.signal });
    controller.abort();
    await assert.rejects(promise, (e: unknown) => isCompilerAIError(e) && e instanceof TimeoutError);
  });
});

describe('Transport — Idempotency', () => {
  test('idempotency key passed as header', async () => {
    let capturedInit: RequestInit | null = null;
    const fetchFn = createMockFetch((_url, init) => {
      capturedInit = init;
      return { status: 200, body: { data: {}, meta: { requestId: 'r', correlationId: 'c', timestamp: 't', apiVersion: 'v1' } } };
    });
    const transport = createTransport(fetchFn);
    await transport.request({ method: 'POST', path: '/executions', body: { x: 1 }, idempotencyKey: 'key-abc' });
    const headers = capturedInit!.headers as Record<string, string>;
    assert.equal(headers['Idempotency-Key'], 'key-abc');
  });
});

describe('Transport — Response validation', () => {
  test('extracts data from success envelope', async () => {
    const successBody: ApiSuccessResponse<{ value: number }> = {
      data: { value: 42 },
      meta: { requestId: 'r1', correlationId: 'c1', timestamp: 'now', apiVersion: 'v1' },
    };
    const transport = createTransport(createMockFetch(() => ({ status: 200, body: successBody })));
    const result = await transport.request<{ value: number }>({ method: 'GET', path: '/health' });
    assert.equal(result.value, 42);
  });
});
