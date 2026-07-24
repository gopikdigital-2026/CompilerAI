import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GoogleRateLimitMapper,
  isGoogleRateLimitReason,
  GoogleErrorMapper,
  ConnectorRateLimitError,
} from '../../src/index';

describe('Google Rate Limit Mapper', () => {
  describe('extractFromHeaders', () => {
    it('should extract rate limit info from headers', () => {
      const headers: Record<string, string> = {
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '5000',
      };
      const info = GoogleRateLimitMapper.extractFromHeaders(headers);
      assert.ok(info);
      assert.equal(info!.limit, 10000);
      assert.equal(info!.remaining, 5000);
    });

    it('should return null when no rate limit headers present', () => {
      const info = GoogleRateLimitMapper.extractFromHeaders({ 'content-type': 'application/json' });
      assert.equal(info, null);
    });

    it('should parse retry-after header into milliseconds', () => {
      const headers: Record<string, string> = {
        'x-ratelimit-remaining': '0',
        'retry-after': '60',
      };
      const info = GoogleRateLimitMapper.extractFromHeaders(headers);
      assert.ok(info);
      assert.equal(info!.retryAfterMs, 60_000);
    });

    it('should handle missing remaining header gracefully', () => {
      const headers: Record<string, string> = {
        'retry-after': '30',
      };
      const info = GoogleRateLimitMapper.extractFromHeaders(headers);
      assert.ok(info);
      assert.equal(info!.remaining, null);
      assert.equal(info!.retryAfterMs, 30_000);
    });
  });

  describe('isRateLimited', () => {
    it('should return true when remaining is 0', () => {
      const info = GoogleRateLimitMapper.extractFromHeaders({
        'x-ratelimit-remaining': '0',
        'x-ratelimit-limit': '10000',
      });
      assert.ok(GoogleRateLimitMapper.isRateLimited(info));
    });

    it('should return true when retryAfterMs > 0', () => {
      const info = GoogleRateLimitMapper.extractFromHeaders({
        'retry-after': '60',
      });
      assert.ok(GoogleRateLimitMapper.isRateLimited(info));
    });

    it('should return false when remaining > 0 and no retry-after', () => {
      const info = GoogleRateLimitMapper.extractFromHeaders({
        'x-ratelimit-remaining': '5000',
        'x-ratelimit-limit': '10000',
      });
      assert.equal(GoogleRateLimitMapper.isRateLimited(info), false);
    });

    it('should return false for null info', () => {
      assert.equal(GoogleRateLimitMapper.isRateLimited(null), false);
    });
  });

  describe('isGoogleRateLimitReason', () => {
    it('should return true for rateLimitExceeded', () => {
      assert.ok(isGoogleRateLimitReason('rateLimitExceeded'));
    });

    it('should return true for userRateLimitExceeded', () => {
      assert.ok(isGoogleRateLimitReason('userRateLimitExceeded'));
    });

    it('should return true for quotaExceeded', () => {
      assert.ok(isGoogleRateLimitReason('quotaExceeded'));
    });

    it('should return true for dailyLimitExceeded', () => {
      assert.ok(isGoogleRateLimitReason('dailyLimitExceeded'));
    });

    it('should return false for non-rate-limit reasons', () => {
      assert.equal(isGoogleRateLimitReason('invalid'), false);
      assert.equal(isGoogleRateLimitReason('notFound'), false);
      assert.equal(isGoogleRateLimitReason('authError'), false);
      assert.equal(isGoogleRateLimitReason('insufficientPermissions'), false);
    });
  });

  describe('extractFromErrorBody', () => {
    it('should extract reason from error body errors array', () => {
      const body = {
        error: {
          code: 429,
          message: 'Rate limit exceeded',
          errors: [{ message: 'Rate limit exceeded', reason: 'rateLimitExceeded' }],
        },
      };
      assert.equal(GoogleRateLimitMapper.extractFromErrorBody(body), 'rateLimitExceeded');
    });

    it('should extract reason from error.reason when no errors array', () => {
      const body = { error: { code: 403, message: 'Quota', reason: 'quotaExceeded' } };
      assert.equal(GoogleRateLimitMapper.extractFromErrorBody(body), 'quotaExceeded');
    });

    it('should return null when no reason found', () => {
      const body = { error: { code: 400, message: 'Bad request' } };
      assert.equal(GoogleRateLimitMapper.extractFromErrorBody(body), null);
    });

    it('should return null for null body', () => {
      assert.equal(GoogleRateLimitMapper.extractFromErrorBody(null), null);
    });
  });

  describe('429 error mapping', () => {
    it('should produce ConnectorRateLimitError for 429 with rateLimitExceeded', () => {
      const error = GoogleErrorMapper.mapHttpError(
        429,
        {
          error: {
            code: 429,
            message: 'Rate limit exceeded',
            errors: [{ message: 'Rate limit exceeded', reason: 'rateLimitExceeded' }],
          },
        },
        { 'retry-after': '60' },
        'google-workspace',
      );
      assert.ok(error instanceof ConnectorRateLimitError);
    });

    it('should produce ConnectorRateLimitError for 403 with quotaExceeded', () => {
      const error = GoogleErrorMapper.mapHttpError(
        403,
        {
          error: {
            code: 403,
            message: 'Quota exceeded',
            errors: [{ message: 'Quota exceeded', reason: 'quotaExceeded' }],
          },
        },
        {},
        'google-workspace',
      );
      assert.ok(error instanceof ConnectorRateLimitError);
    });
  });

  describe('toMetadata', () => {
    it('should convert rate limit info to metadata object', () => {
      const info = GoogleRateLimitMapper.extractFromHeaders({
        'x-ratelimit-limit': '10000',
        'x-ratelimit-remaining': '5000',
        'retry-after': '30',
      });
      assert.ok(info);
      const metadata = GoogleRateLimitMapper.toMetadata(info!);
      assert.equal(metadata['rateLimitLimit'], 10000);
      assert.equal(metadata['rateLimitRemaining'], 5000);
      assert.equal(metadata['rateLimitResetAt'], null);
      assert.equal(metadata['rateLimitRetryAfterMs'], 30_000);
      assert.equal(metadata['rateLimitReason'], null);
    });
  });
});
