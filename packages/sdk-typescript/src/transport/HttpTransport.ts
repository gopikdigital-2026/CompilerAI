import type { ResolvedConfig } from '../config/CompilerAIConfig';
import type { ApiErrorResponse, ApiSuccessResponse, PaginatedResponse } from '../types';
import { API_VERSION, SDK_VERSION, IDEMPOTENCY_HEADER, REQUEST_ID_HEADER, CORRELATION_ID_HEADER } from '../config/constants';
import { fromApiError, NetworkError, TimeoutError, RateLimitError, ServerError, isCompilerAIError } from '../errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  idempotencyKey?: string;
  requestId?: string;
  correlationId?: string;
  signal?: AbortSignal;
  retryable?: boolean;
}

function buildUrl(baseUrl: string, path: string, query?: RequestOptions['query']): string {
  const url = `${baseUrl}/api/${API_VERSION}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (/key|token|secret|password|authorization/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });
}

export class HttpTransport {
  constructor(private readonly config: ResolvedConfig) {}

  async request<T>(opts: RequestOptions): Promise<T> {
    return this.requestWithMeta<T>(opts).then((r) => r.data);
  }

  async requestWithMeta<T>(opts: RequestOptions): Promise<{ data: T; meta: ApiSuccessResponse<T>['meta'] }> {
    const requestId = opts.requestId ?? generateRequestId();
    const correlationId = opts.correlationId ?? requestId;
    const maxRetries = opts.retryable === false ? 0 : this.config.maxRetries;

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        await sleep(this.config.retryDelayMs * attempt, opts.signal);
      }

      try {
        const result = await this.doRequest<T>(opts, requestId, correlationId);
        return result;
      } catch (e) {
        lastError = e;

        if (e instanceof DOMException && e.name === 'AbortError') {
          throw new TimeoutError('Request was aborted', { cause: e });
        }

        if (isCompilerAIError(e)) {
          if (e.retryable && attempt < maxRetries && isRetryableStatus(e.httpStatus)) {
            continue;
          }
          throw e;
        }

        if (e instanceof TypeError) {
          if (attempt < maxRetries) {
            continue;
          }
          throw new NetworkError(`Network request failed: ${e.message}`, { cause: e });
        }

        throw e;
      }
    }

    throw lastError ?? new ServerError('Request failed after retries');
  }

  async requestPaginated<T>(opts: RequestOptions): Promise<PaginatedResponse<T>> {
    const requestId = opts.requestId ?? generateRequestId();
    const correlationId = opts.correlationId ?? requestId;
    return this.doRequestRaw<PaginatedResponse<T>>(opts, requestId, correlationId).then((r) => r.body);
  }

  private async doRequest<T>(
    opts: RequestOptions,
    requestId: string,
    correlationId: string,
  ): Promise<{ data: T; meta: ApiSuccessResponse<T>['meta'] }> {
    const { body } = await this.doRequestRaw<ApiSuccessResponse<T>>(opts, requestId, correlationId);
    return { data: body.data, meta: body.meta };
  }

  private async doRequestRaw<R>(
    opts: RequestOptions,
    requestId: string,
    correlationId: string,
  ): Promise<{ status: number; body: R }> {
    const url = buildUrl(this.config.baseUrl, opts.path, opts.query);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Api-Key': this.config.apiKey,
      'X-Organization-Id': this.config.organizationId,
      'User-Agent': `compilerai-sdk/${SDK_VERSION}`,
      [REQUEST_ID_HEADER]: requestId,
      [CORRELATION_ID_HEADER]: correlationId,
    };

    if (opts.idempotencyKey) {
      headers[IDEMPOTENCY_HEADER] = opts.idempotencyKey;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let response: Response;
    try {
      response = await this.config.fetchFn(url, {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${this.config.timeoutMs}ms`, { cause: e });
      }
      throw e;
    }

    clearTimeout(timeoutId);

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { status: response.status, body: { data: undefined, meta: { requestId, correlationId, timestamp: '', apiVersion: API_VERSION } } as unknown as R };
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new ServerError(`Unexpected content-type: ${contentType}. Body: ${text.slice(0, 200)}`);
    }

    let jsonBody: unknown;
    try {
      jsonBody = await response.json();
    } catch (e) {
      throw new ServerError(`Failed to parse JSON response: ${(e as Error).message}`);
    }

    if (!response.ok) {
      const errorBody = jsonBody as ApiErrorResponse;
      if (errorBody?.error?.code) {
        throw fromApiError(errorBody.error, errorBody.meta ?? null);
      }
      throw new ServerError(`HTTP ${response.status}: ${JSON.stringify(jsonBody).slice(0, 200)}`);
    }

    return { status: response.status, body: jsonBody as R };
  }

  getSanitizedHeaders(opts: RequestOptions): Record<string, string> {
    const requestId = opts.requestId ?? 'unknown';
    return sanitizeHeaders({
      'X-Api-Key': this.config.apiKey,
      'X-Organization-Id': this.config.organizationId,
      [REQUEST_ID_HEADER]: requestId,
    });
  }
}
