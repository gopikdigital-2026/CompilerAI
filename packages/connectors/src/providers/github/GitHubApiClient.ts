import { GitHubRequestBuilder } from './GitHubRequestBuilder';
import { GitHubErrorMapper } from './GitHubErrorMapper';
import { GitHubRateLimitMapper, type GitHubRateLimitHeaders } from './GitHubRateLimitMapper';
import { ConnectorRuntimeError } from '../../errors/ConnectorRuntimeError';
import type { ConnectorId } from '../../types/index';

export interface GitHubApiClientConfig {
  readonly baseUrl?: string;
  readonly apiVersion?: string;
  readonly accept?: string;
  readonly maxPayloadBytes?: number;
  readonly timeoutMs?: number;
}

export const DEFAULT_GITHUB_CONFIG: Required<GitHubApiClientConfig> = {
  baseUrl: 'https://api.github.com',
  apiVersion: '2022-11-28',
  accept: 'application/vnd.github+json',
  maxPayloadBytes: 10 * 1024 * 1024,
  timeoutMs: 30_000,
};

export type FetchLike = typeof fetch;

export interface GitHubResponse<T = unknown> {
  readonly status: number;
  readonly data: T | null;
  readonly headers: Record<string, string>;
  readonly rateLimit: GitHubRateLimitHeaders | null;
}

export interface GitHubRequestOptions {
  readonly token: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: FetchLike;
}

const GITHUB_CONNECTOR_ID: ConnectorId = 'github';

export class GitHubApiClient {
  private readonly config: Required<GitHubApiClientConfig>;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: GitHubApiClientConfig = {},
    fetchImpl?: FetchLike,
  ) {
    this.config = { ...DEFAULT_GITHUB_CONFIG, ...config };
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async get<T = unknown>(
    path: string,
    params: Record<string, string | number | boolean | undefined | null>,
    options: GitHubRequestOptions,
  ): Promise<GitHubResponse<T>> {
    const builder = GitHubRequestBuilder.get(path, this.config.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      builder.addParam(key, value);
    }
    const { url } = builder.build();
    return this.doRequest<T>('GET', url, null, options);
  }

  async post<T = unknown>(
    path: string,
    body: Record<string, unknown>,
    options: GitHubRequestOptions,
  ): Promise<GitHubResponse<T>> {
    const builder = GitHubRequestBuilder.post(path, this.config.baseUrl);
    const { url } = builder.build();
    return this.doRequest<T>('POST', url, body, options);
  }

  private async doRequest<T>(
    method: 'GET' | 'POST',
    url: string,
    body: Record<string, unknown> | null,
    options: GitHubRequestOptions,
  ): Promise<GitHubResponse<T>> {
    if (!options.token || options.token.length === 0) {
      throw new ConnectorRuntimeError(
        'No authentication token provided', 'AUTHENTICATION_ERROR', false,
        GITHUB_CONNECTOR_ID, 'apiRequest', 'unknown',
      );
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${options.token}`,
      'Accept': this.config.accept,
      'X-GitHub-Api-Version': this.config.apiVersion,
      'User-Agent': 'CompilerAI-Connectors/1.0',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
      const serialized = JSON.stringify(body);
      if (serialized.length > this.config.maxPayloadBytes) {
        throw new ConnectorRuntimeError(
          'Request payload exceeds maximum size', 'VALIDATION_ERROR', false,
          GITHUB_CONNECTOR_ID, 'apiRequest', 'unknown',
          undefined, { maxSize: this.config.maxPayloadBytes },
        );
      }
      return this.executeRequest<T>(method, url, headers, serialized, options);
    }

    return this.executeRequest<T>(method, url, headers, null, options);
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST',
    url: string,
    headers: Record<string, string>,
    body: string | null,
    options: GitHubRequestOptions,
  ): Promise<GitHubResponse<T>> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        signal: options.signal ?? undefined,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw e;
      }
      throw GitHubErrorMapper.mapNetworkError(
        e instanceof Error ? e : new Error('Network error'),
        GITHUB_CONNECTOR_ID,
      );
    }

    const responseHeaders = this.extractHeaders(response);
    const rateLimit = GitHubRateLimitMapper.extractFromHeaders(responseHeaders);

    if (response.status === 204) {
      return { status: 204, data: null, headers: responseHeaders, rateLimit };
    }

    if (response.status >= 400) {
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
      } catch {
        // No JSON body
      }
      throw GitHubErrorMapper.mapHttpError(
        response.status, errorBody, responseHeaders, GITHUB_CONNECTOR_ID,
      );
    }

    const data = await response.json() as T;
    return { status: response.status, data, headers: responseHeaders, rateLimit };
  }

  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }
}
