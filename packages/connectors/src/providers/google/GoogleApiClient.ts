import { GoogleRequestBuilder } from './GoogleRequestBuilder';
import { GoogleErrorMapper } from './GoogleErrorMapper';
import { GoogleRateLimitMapper, type GoogleRateLimitInfo } from './GoogleRateLimitMapper';
import { ConnectorRuntimeError } from '../../errors/ConnectorRuntimeError';
import type { ConnectorId } from '../../types/index';

export interface GoogleApiClientConfig {
  readonly driveBaseUrl?: string;
  readonly gmailBaseUrl?: string;
  readonly calendarBaseUrl?: string;
  readonly maxPayloadBytes?: number;
  readonly timeoutMs?: number;
}

export const DEFAULT_GOOGLE_CONFIG: Required<GoogleApiClientConfig> = {
  driveBaseUrl: 'https://www.googleapis.com/drive/v3',
  gmailBaseUrl: 'https://gmail.googleapis.com/gmail/v1',
  calendarBaseUrl: 'https://www.googleapis.com/calendar/v3',
  maxPayloadBytes: 10 * 1024 * 1024,
  timeoutMs: 30_000,
};

export type FetchLike = typeof fetch;

export interface GoogleResponse<T = unknown> {
  readonly status: number;
  readonly data: T | null;
  readonly headers: Record<string, string>;
  readonly rateLimit: GoogleRateLimitInfo | null;
}

export interface GoogleRequestOptions {
  readonly token: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: FetchLike;
}

const GOOGLE_CONNECTOR_ID: ConnectorId = 'google-workspace';

export type GoogleService = 'drive' | 'gmail' | 'calendar';

export class GoogleApiClient {
  private readonly config: Required<GoogleApiClientConfig>;
  private readonly fetchImpl: FetchLike;

  constructor(
    config: GoogleApiClientConfig = {},
    fetchImpl?: FetchLike,
  ) {
    this.config = { ...DEFAULT_GOOGLE_CONFIG, ...config };
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async get<T = unknown>(
    service: GoogleService,
    path: string,
    params: Record<string, string | number | boolean | undefined | null>,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    const baseUrl = this.getBaseUrl(service);
    const builder = GoogleRequestBuilder.get(path, baseUrl);
    for (const [key, value] of Object.entries(params)) {
      builder.addParam(key, value);
    }
    const { url } = builder.build();
    return this.doRequest<T>('GET', url, null, options);
  }

  async post<T = unknown>(
    service: GoogleService,
    path: string,
    body: Record<string, unknown>,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    const baseUrl = this.getBaseUrl(service);
    const builder = GoogleRequestBuilder.post(path, baseUrl);
    const { url } = builder.build();
    return this.doRequest<T>('POST', url, body, options);
  }

  async patch<T = unknown>(
    service: GoogleService,
    path: string,
    body: Record<string, unknown>,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    const baseUrl = this.getBaseUrl(service);
    const builder = GoogleRequestBuilder.patch(path, baseUrl);
    const { url } = builder.build();
    return this.doRequest<T>('PATCH', url, body, options);
  }

  async delete<T = unknown>(
    service: GoogleService,
    path: string,
    params: Record<string, string | number | boolean | undefined | null>,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    const baseUrl = this.getBaseUrl(service);
    const builder = GoogleRequestBuilder.delete(path, baseUrl);
    for (const [key, value] of Object.entries(params)) {
      builder.addParam(key, value);
    }
    const { url } = builder.build();
    return this.doRequest<T>('DELETE', url, null, options);
  }

  async postMultipart<T = unknown>(
    service: GoogleService,
    path: string,
    metadata: Record<string, unknown>,
    mediaContent: { readonly mimeType: string; readonly data: string },
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    const baseUrl = this.getBaseUrl(service);
    const boundary = 'google_boundary_' + Math.random().toString(36).slice(2);
    const body = this.buildMultipartBody(boundary, metadata, mediaContent);

    if (body.length > this.config.maxPayloadBytes) {
      throw new ConnectorRuntimeError(
        'Upload payload exceeds maximum size', 'VALIDATION_ERROR', false,
        GOOGLE_CONNECTOR_ID, 'uploadFile', 'unknown',
        undefined, { maxSize: this.config.maxPayloadBytes },
      );
    }

    const builder = GoogleRequestBuilder.post(path, baseUrl);
    builder.addParam('uploadType', 'multipart');
    const { url } = builder.build();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${options.token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    };

    return this.executeRequest<T>('POST', url, headers, body, options);
  }

  private getBaseUrl(service: GoogleService): string {
    switch (service) {
      case 'drive': return this.config.driveBaseUrl;
      case 'gmail': return this.config.gmailBaseUrl;
      case 'calendar': return this.config.calendarBaseUrl;
    }
  }

  private async doRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body: Record<string, unknown> | null,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
    if (!options.token || options.token.length === 0) {
      throw new ConnectorRuntimeError(
        'No authentication token provided', 'AUTHENTICATION_ERROR', false,
        GOOGLE_CONNECTOR_ID, 'apiRequest', 'unknown',
      );
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${options.token}`,
      'Accept': 'application/json',
    };

    let serialized: string | null = null;
    if (body) {
      headers['Content-Type'] = 'application/json';
      serialized = JSON.stringify(body);
      if (serialized.length > this.config.maxPayloadBytes) {
        throw new ConnectorRuntimeError(
          'Request payload exceeds maximum size', 'VALIDATION_ERROR', false,
          GOOGLE_CONNECTOR_ID, 'apiRequest', 'unknown',
          undefined, { maxSize: this.config.maxPayloadBytes },
        );
      }
    }

    return this.executeRequest<T>(method, url, headers, serialized, options);
  }

  private async executeRequest<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    headers: Record<string, string>,
    body: string | null,
    options: GoogleRequestOptions,
  ): Promise<GoogleResponse<T>> {
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
      throw GoogleErrorMapper.mapNetworkError(
        e instanceof Error ? e : new Error('Network error'),
        GOOGLE_CONNECTOR_ID,
      );
    }

    const responseHeaders = this.extractHeaders(response);
    const rateLimit = GoogleRateLimitMapper.extractFromHeaders(responseHeaders);

    if (response.status === 204) {
      return { status: 204, data: null, headers: responseHeaders, rateLimit };
    }

    if (response.status >= 400) {
      let errorBody: unknown = null;
      try {
        errorBody = await response.json();
      } catch {
        try {
          const text = await response.text();
          errorBody = { error: { message: text } };
        } catch {
          // No body
        }
      }
      throw GoogleErrorMapper.mapHttpError(
        response.status, errorBody, responseHeaders, GOOGLE_CONNECTOR_ID,
      );
    }

    const text = await response.text();
    if (text.length === 0) {
      return { status: response.status, data: null, headers: responseHeaders, rateLimit };
    }

    const data = JSON.parse(text) as T;
    return { status: response.status, data, headers: responseHeaders, rateLimit };
  }

  private buildMultipartBody(
    boundary: string,
    metadata: Record<string, unknown>,
    media: { readonly mimeType: string; readonly data: string },
  ): string {
    const parts: string[] = [];
    parts.push(`--${boundary}`);
    parts.push('Content-Type: application/json; charset=UTF-8');
    parts.push('');
    parts.push(JSON.stringify(metadata));
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${media.mimeType}`);
    parts.push('');
    parts.push(media.data);
    parts.push(`--${boundary}--`);
    return parts.join('\r\n');
  }

  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    return headers;
  }
}
