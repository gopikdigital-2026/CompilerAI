import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GitHubApiClient,
  GitHubRateLimitMapper,
  GitHubErrorMapper,
  ConnectorRateLimitError,
  ConnectorAuthenticationError,
  ConnectorRuntimeError,
} from '../../src/index';
import {
  FIXTURE_RATE_LIMIT_HEADERS,
  FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS,
  FIXTURE_RATE_LIMIT_ERROR_BODY,
  FIXTURE_ERROR_401,
  FIXTURE_ERROR_403,
  FIXTURE_ERROR_404,
  FIXTURE_ERROR_422,
  FIXTURE_ERROR_500,
  createMockFetch,
  createRateLimitHeaders,
} from './fixtures';

const VALID_TOKEN = 'ghp_test_token_not_real';
const CID = 'github' as never;

describe('GitHub Rate Limits', () => {
  it('should extract rate limit headers', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders(FIXTURE_RATE_LIMIT_HEADERS);
    assert.ok(headers);
    assert.equal(headers!.limit, 5000);
    assert.equal(headers!.remaining, 4999);
    assert.equal(headers!.used, 1);
    assert.equal(headers!.resource, 'core');
    assert.ok(headers!.resetAt);
  });

  it('should return null when no rate limit headers present', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders({ 'content-type': 'application/json' });
    assert.equal(headers, null);
  });

  it('should detect rate limited state when remaining is 0', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders(FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS);
    assert.ok(GitHubRateLimitMapper.isRateLimited(headers));
  });

  it('should detect rate limited state when retry-after is present', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders({ 'retry-after': '60' });
    assert.ok(GitHubRateLimitMapper.isRateLimited(headers));
  });

  it('should not detect rate limited when remaining > 0', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders(FIXTURE_RATE_LIMIT_HEADERS);
    assert.equal(GitHubRateLimitMapper.isRateLimited(headers), false);
  });

  it('should convert to metadata object', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders(FIXTURE_RATE_LIMIT_HEADERS)!;
    const metadata = GitHubRateLimitMapper.toMetadata(headers);
    assert.equal(metadata['rateLimitLimit'], 5000);
    assert.equal(metadata['rateLimitRemaining'], 4999);
    assert.equal(metadata['rateLimitResource'], 'core');
  });

  it('should convert 429 to ConnectorRateLimitError', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: {
          status: 429,
          body: FIXTURE_RATE_LIMIT_ERROR_BODY,
          headers: FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS,
        },
      },
    ]);

    const client = new GitHubApiClient({}, mockFetch);
    await assert.rejects(
      client.get('user', {}, { token: VALID_TOKEN, fetchImpl: mockFetch }),
      (e: unknown) => {
        assert.ok(e instanceof ConnectorRateLimitError);
        assert.equal(e.rateLimit.limit, 5000);
        assert.equal(e.rateLimit.remaining, 0);
        assert.ok(e.rateLimit.retryAfterMs! > 0);
        return true;
      },
    );
  });

  it('should convert 403 with rate limit headers to ConnectorRateLimitError', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'GET',
        urlPattern: /\/user$/,
        response: {
          status: 403,
          body: FIXTURE_RATE_LIMIT_ERROR_BODY,
          headers: FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS,
        },
      },
    ]);

    const client = new GitHubApiClient({}, mockFetch);
    await assert.rejects(
      client.get('user', {}, { token: VALID_TOKEN, fetchImpl: mockFetch }),
      (e: unknown) => e instanceof ConnectorRateLimitError,
    );
  });
});

describe('GitHub Error Mapping', () => {
  it('should map 401 to ConnectorAuthenticationError', () => {
    const error = GitHubErrorMapper.mapHttpError(401, FIXTURE_ERROR_401, {}, CID);
    assert.ok(error instanceof ConnectorAuthenticationError);
    assert.equal(error.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 403 (not rate limited) to authorization error', () => {
    const error = GitHubErrorMapper.mapHttpError(403, FIXTURE_ERROR_403, {}, CID);
    assert.ok(error instanceof ConnectorRuntimeError);
    assert.equal(error.errorCode, 'AUTHORIZATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 403 with rate limit headers to rate limit error', () => {
    const error = GitHubErrorMapper.mapHttpError(403, FIXTURE_RATE_LIMIT_ERROR_BODY, FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS, CID);
    assert.ok(error instanceof ConnectorRateLimitError);
  });

  it('should map 404 to validation error (resource not found)', () => {
    const error = GitHubErrorMapper.mapHttpError(404, FIXTURE_ERROR_404, {}, CID);
    assert.equal(error.errorCode, 'VALIDATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 422 to validation error with field details', () => {
    const error = GitHubErrorMapper.mapHttpError(422, FIXTURE_ERROR_422, {}, CID);
    assert.equal(error.errorCode, 'VALIDATION_ERROR');
    assert.equal(error.retryable, false);
    const details = error.sanitizedDetails as { validationErrors: string[] };
    assert.ok(details.validationErrors.length > 0);
  });

  it('should map 429 to rate limit error', () => {
    const error = GitHubErrorMapper.mapHttpError(429, FIXTURE_RATE_LIMIT_ERROR_BODY, FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS, CID);
    assert.ok(error instanceof ConnectorRateLimitError);
  });

  it('should map 500 to provider error (retryable)', () => {
    const error = GitHubErrorMapper.mapHttpError(500, FIXTURE_ERROR_500, {}, CID);
    assert.equal(error.errorCode, 'PROVIDER_ERROR');
    assert.equal(error.retryable, true);
  });

  it('should map 502 to provider error (retryable)', () => {
    const error = GitHubErrorMapper.mapHttpError(502, FIXTURE_ERROR_500, {}, CID);
    assert.equal(error.errorCode, 'PROVIDER_ERROR');
    assert.equal(error.retryable, true);
  });

  it('should map 409 to conflict (retryable)', () => {
    const error = GitHubErrorMapper.mapHttpError(409, { message: 'Conflict' }, {}, CID);
    assert.equal(error.errorCode, 'PROVIDER_ERROR');
    assert.equal(error.retryable, true);
  });

  it('should map network errors', () => {
    const error = GitHubErrorMapper.mapNetworkError(new Error('ECONNREFUSED'), CID);
    assert.equal(error.errorCode, 'NETWORK_ERROR');
    assert.equal(error.retryable, true);
  });

  it('should sanitize headers in error details', () => {
    const error = GitHubErrorMapper.mapHttpError(500, FIXTURE_ERROR_500, {
      'authorization': 'Bearer ghp_secret_token',
      'x-custom': 'visible',
    }, CID);
    const details = error.sanitizedDetails as Record<string, unknown>;
    const headers = details['headers'] as Record<string, unknown>;
    assert.equal(headers['authorization'], '[REDACTED]');
    assert.equal(headers['x-custom'], 'visible');
  });

  it('should handle response with 204 No Content', async () => {
    const mockFetch = createMockFetch([
      {
        method: 'POST',
        urlPattern: /\/dispatches$/,
        response: { status: 204, body: null, headers: createRateLimitHeaders() },
      },
    ]);

    const client = new GitHubApiClient({}, mockFetch);
    const response = await client.post(
      'repos/octocat/Hello-World/actions/workflows/ci.yml/dispatches',
      { ref: 'main' },
      { token: VALID_TOKEN, fetchImpl: mockFetch },
    );

    assert.equal(response.status, 204);
    assert.equal(response.data, null);
  });
});
