import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
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
} from './fixtures';

const CID = 'github' as never;

describe('Rate limits — header extraction', () => {
  it('should extract valid rate limit headers', () => {
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

  it('should return null for empty headers', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders({});
    assert.equal(headers, null);
  });

  it('should handle invalid numeric values gracefully', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders({
      'x-ratelimit-limit': 'not-a-number',
      'x-ratelimit-remaining': 'also-not-a-number',
      'x-ratelimit-reset': 'invalid',
    });
    assert.ok(headers);
    // parseIntSafe returns null for non-numeric strings
    assert.equal(headers!.limit, null);
    assert.equal(headers!.remaining, null);
  });

  it('should compute resetAt from epoch', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders({
      'x-ratelimit-limit': '5000',
      'x-ratelimit-remaining': '4999',
      'x-ratelimit-reset': '1372700873',
    });
    assert.ok(headers);
    assert.ok(headers!.resetAt);
    assert.equal(headers!.resetAt, '2013-07-01T17:47:53.000Z');
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
});

describe('Rate limits — metadata conversion', () => {
  it('should convert to metadata object', () => {
    const headers = GitHubRateLimitMapper.extractFromHeaders(FIXTURE_RATE_LIMIT_HEADERS)!;
    const metadata = GitHubRateLimitMapper.toMetadata(headers);
    assert.equal(metadata['rateLimitLimit'], 5000);
    assert.equal(metadata['rateLimitRemaining'], 4999);
    assert.equal(metadata['rateLimitResource'], 'core');
  });
});

describe('Rate limits — error mapping', () => {
  it('should convert 429 to ConnectorRateLimitError', () => {
    const error = GitHubErrorMapper.mapHttpError(
      429, FIXTURE_RATE_LIMIT_ERROR_BODY, FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS, CID,
    );
    assert.ok(error instanceof ConnectorRateLimitError);
    assert.equal(error.rateLimit.limit, 5000);
    assert.equal(error.rateLimit.remaining, 0);
    assert.ok(error.rateLimit.retryAfterMs! > 0);
  });

  it('should convert 403 with rate limit headers to ConnectorRateLimitError', () => {
    const error = GitHubErrorMapper.mapHttpError(
      403, FIXTURE_RATE_LIMIT_ERROR_BODY, FIXTURE_RATE_LIMIT_EXHAUSTED_HEADERS, CID,
    );
    assert.ok(error instanceof ConnectorRateLimitError);
  });

  it('should map 403 without rate limit to authorization error', () => {
    const error = GitHubErrorMapper.mapHttpError(403, FIXTURE_ERROR_403, {}, CID);
    assert.ok(error instanceof ConnectorRuntimeError);
    assert.equal(error.errorCode, 'AUTHORIZATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 401 to authentication error', () => {
    const error = GitHubErrorMapper.mapHttpError(401, FIXTURE_ERROR_401, {}, CID);
    assert.ok(error instanceof ConnectorAuthenticationError);
    assert.equal(error.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 404 to validation error', () => {
    const error = GitHubErrorMapper.mapHttpError(404, FIXTURE_ERROR_404, {}, CID);
    assert.equal(error.errorCode, 'VALIDATION_ERROR');
    assert.equal(error.retryable, false);
  });

  it('should map 422 to validation error with field details', () => {
    const error = GitHubErrorMapper.mapHttpError(422, FIXTURE_ERROR_422, {}, CID);
    assert.equal(error.errorCode, 'VALIDATION_ERROR');
    const details = error.sanitizedDetails as { validationErrors: string[] };
    assert.ok(details.validationErrors.length > 0);
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
});

describe('Rate limits — sanitized error details', () => {
  it('should sanitize authorization header in error details', () => {
    const error = GitHubErrorMapper.mapHttpError(500, FIXTURE_ERROR_500, {
      'authorization': 'Bearer ghp_secret_token_not_real',
      'x-custom': 'visible',
    }, CID);
    const details = error.sanitizedDetails as Record<string, unknown>;
    const headers = details['headers'] as Record<string, unknown>;
    assert.equal(headers['authorization'], '[REDACTED]');
    assert.equal(headers['x-custom'], 'visible');
  });

  it('should not include token in serialized error', () => {
    const secretToken = 'ghp_SUPER_SECRET_TEST_TOKEN';
    const error = GitHubErrorMapper.mapHttpError(401, {
      message: `Invalid token: ${secretToken}`,
    }, {
      'authorization': `Bearer ${secretToken}`,
    }, CID);
    const serialized = JSON.stringify(error);
    assert.ok(!serialized.includes(secretToken),
      `Token found in serialized error: ${serialized}`);
  });
});
