const ALLOWED_HOSTS = new Set(['api.github.com', 'github.com']);

const MAX_QUERY_PARAMS = 50;
const MAX_PATH_SEGMENTS = 20;
const MAX_PATH_LENGTH = 500;

export class GitHubRequestBuilder {
  private pathSegments: string[] = [];
  private queryParams = new Map<string, string>();
  private body: Record<string, unknown> | null = null;
  private method: 'GET' | 'POST' = 'GET';

  constructor(
    private readonly baseUrl: string = 'https://api.github.com',
  ) {
    const url = new URL(this.baseUrl);
    if (!ALLOWED_HOSTS.has(url.hostname)) {
      throw new Error(`Host not allowed: ${url.hostname}. Allowed hosts: ${Array.from(ALLOWED_HOSTS).join(', ')}`);
    }
  }

  static get(path: string, baseUrl?: string): GitHubRequestBuilder {
    return new GitHubRequestBuilder(baseUrl).setMethod('GET').addPath(path);
  }

  static post(path: string, baseUrl?: string): GitHubRequestBuilder {
    return new GitHubRequestBuilder(baseUrl).setMethod('POST').addPath(path);
  }

  setMethod(method: 'GET' | 'POST'): this {
    this.method = method;
    return this;
  }

  addPath(segment: string): this {
    const cleaned = segment.replace(/^\/+|\/+$/g, '');
    if (cleaned.length === 0) return this;

    const decoded = decodeURIComponent(cleaned);
    if (decoded.includes('..')) {
      throw new Error('Path traversal detected');
    }

    const parts = cleaned.split('/');
    if (parts.length + this.pathSegments.length > MAX_PATH_SEGMENTS) {
      throw new Error('Path has too many segments');
    }

    for (const part of parts) {
      const encoded = encodeURIComponent(part);
      if (encoded.length > MAX_PATH_LENGTH) {
        throw new Error('Path segment too long');
      }
      if (encoded.includes('..') || encoded.toLowerCase().includes('%2e')) {
        throw new Error('Path traversal detected');
      }
      this.pathSegments.push(encoded);
    }
    return this;
  }

  addParam(key: string, value: string | number | boolean | undefined | null): this {
    if (value === undefined || value === null) return this;
    const strValue = typeof value === 'boolean' ? String(value) : String(value);
    this.queryParams.set(encodeURIComponent(key), encodeURIComponent(strValue));
    return this;
  }

  setBody(data: Record<string, unknown>): this {
    this.body = data;
    return this;
  }

  build(): { url: string; method: 'GET' | 'POST'; body: Record<string, unknown> | null } {
    if (this.queryParams.size > MAX_QUERY_PARAMS) {
      throw new Error('Too many query parameters');
    }

    const path = this.pathSegments.join('/');
    const base = this.baseUrl.replace(/\/+$/, '');
    let url = `${base}/${path}`;

    if (this.queryParams.size > 0) {
      const qs = Array.from(this.queryParams.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      url += `?${qs}`;
    }

    const parsed = new URL(url);
    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new Error(`Resolved host not allowed: ${parsed.hostname}`);
    }

    return { url, method: this.method, body: this.body };
  }
}

export { ALLOWED_HOSTS };
