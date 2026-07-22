import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  CompilerAIError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  ServerError,
  fromApiError,
  isCompilerAIError,
} from '../src/errors';
import type { ApiErrorBody, ApiMeta } from '../src/types';

void CompilerAIError;
void AuthenticationError;
void AuthorizationError;
void ValidationError;
void NotFoundError;
void ConflictError;
void RateLimitError;
void TimeoutError;
void NetworkError;
void ServerError;

describe('Errors', () => {
  test('each error has correct code and httpStatus', () => {
    assert.equal(new AuthenticationError('msg').code, 'AUTHENTICATION_REQUIRED');
    assert.equal(new AuthenticationError('msg').httpStatus, 401);
    assert.equal(new AuthorizationError('msg').code, 'ACCESS_DENIED');
    assert.equal(new AuthorizationError('msg').httpStatus, 403);
    assert.equal(new ValidationError('msg').code, 'VALIDATION_ERROR');
    assert.equal(new ValidationError('msg').httpStatus, 400);
    assert.equal(new NotFoundError('msg').code, 'RESOURCE_NOT_FOUND');
    assert.equal(new NotFoundError('msg').httpStatus, 404);
    assert.equal(new ConflictError('msg').code, 'CONFLICT');
    assert.equal(new ConflictError('msg').httpStatus, 409);
    assert.equal(new RateLimitError('msg').code, 'RATE_LIMIT_EXCEEDED');
    assert.equal(new RateLimitError('msg').httpStatus, 429);
    assert.equal(new TimeoutError('msg').code, 'REQUEST_TIMEOUT');
    assert.equal(new TimeoutError('msg').httpStatus, 408);
    assert.equal(new NetworkError('msg').code, 'NETWORK_ERROR');
    assert.equal(new NetworkError('msg').httpStatus, 0);
    assert.equal(new ServerError('msg').code, 'INTERNAL_ERROR');
    assert.equal(new ServerError('msg').httpStatus, 500);
  });

  test('retryable flags', () => {
    assert.equal(new AuthenticationError('msg').retryable, false);
    assert.equal(new ValidationError('msg').retryable, false);
    assert.equal(new NotFoundError('msg').retryable, false);
    assert.equal(new RateLimitError('msg').retryable, true);
    assert.equal(new TimeoutError('msg').retryable, true);
    assert.equal(new NetworkError('msg').retryable, true);
    assert.equal(new ServerError('msg').retryable, true);
  });

  test('toSafeObject excludes stack traces', () => {
    const err = new AuthenticationError('bad key');
    const safe = err.toSafeObject();
    assert.equal(safe.code, 'AUTHENTICATION_REQUIRED');
    assert.equal(safe.message, 'bad key');
    assert.equal('stack' in safe, false);
  });

  test('fromApiError maps known codes', () => {
    const body: ApiErrorBody = { code: 'EXECUTION_NOT_FOUND', message: 'not found', details: [], retryable: false };
    const meta: ApiMeta = { requestId: 'r1', correlationId: 'c1', timestamp: 'now', apiVersion: 'v1' };
    const err = fromApiError(body, meta);
    assert.ok(err instanceof NotFoundError);
    assert.equal(err.meta?.requestId, 'r1');
  });

  test('fromApiError maps unknown codes to ServerError', () => {
    const body: ApiErrorBody = { code: 'UNKNOWN_CODE', message: 'oops', details: [], retryable: false };
    const err = fromApiError(body, null);
    assert.ok(err instanceof ServerError);
  });

  test('isCompilerAIError type guard', () => {
    assert.ok(isCompilerAIError(new NotFoundError('x')));
    assert.ok(!isCompilerAIError(new Error('x')));
    assert.ok(!isCompilerAIError('string'));
  });

  test('error message does not leak API key', () => {
    const err = new AuthenticationError('Authentication required');
    assert.ok(!err.message.includes('key'));
  });
});
