import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ExitCode, exitCodeFromError } from '../src/config/exit-codes.js';

describe('exit-codes', () => {
  test('ExitCode enum values', () => {
    assert.equal(ExitCode.Success, 0);
    assert.equal(ExitCode.GenericError, 1);
    assert.equal(ExitCode.ConfigError, 2);
    assert.equal(ExitCode.AuthenticationError, 3);
    assert.equal(ExitCode.NotFound, 4);
    assert.equal(ExitCode.ValidationError, 5);
    assert.equal(ExitCode.NetworkError, 6);
    assert.equal(ExitCode.Cancelled, 7);
    assert.equal(ExitCode.Timeout, 8);
  });

  test('exitCodeFromError maps authentication', () => {
    assert.equal(exitCodeFromError({ code: 'AUTHENTICATION_REQUIRED' }), ExitCode.AuthenticationError);
    assert.equal(exitCodeFromError({ code: 'ACCESS_DENIED' }), ExitCode.AuthenticationError);
  });

  test('exitCodeFromError maps validation', () => {
    assert.equal(exitCodeFromError({ code: 'VALIDATION_ERROR' }), ExitCode.ValidationError);
    assert.equal(exitCodeFromError({ code: 'WORKFLOW_VALIDATION_FAILED' }), ExitCode.ValidationError);
  });

  test('exitCodeFromError maps not found', () => {
    assert.equal(exitCodeFromError({ code: 'EXECUTION_NOT_FOUND' }), ExitCode.NotFound);
    assert.equal(exitCodeFromError({ code: 'WORKFLOW_NOT_FOUND' }), ExitCode.NotFound);
    assert.equal(exitCodeFromError({ code: 'APPROVAL_NOT_FOUND' }), ExitCode.NotFound);
    assert.equal(exitCodeFromError({ code: 'RESOURCE_NOT_FOUND' }), ExitCode.NotFound);
  });

  test('exitCodeFromError maps rate limit to network', () => {
    assert.equal(exitCodeFromError({ code: 'RATE_LIMIT_EXCEEDED' }), ExitCode.NetworkError);
  });

  test('exitCodeFromError maps timeout', () => {
    assert.equal(exitCodeFromError({ code: 'REQUEST_TIMEOUT' }), ExitCode.Timeout);
  });

  test('exitCodeFromError maps conflict to generic', () => {
    assert.equal(exitCodeFromError({ code: 'CONFLICT' }), ExitCode.GenericError);
    assert.equal(exitCodeFromError({ code: 'INVALID_EXECUTION_STATE' }), ExitCode.GenericError);
    assert.equal(exitCodeFromError({ code: 'IDEMPOTENCY_CONFLICT' }), ExitCode.GenericError);
  });

  test('exitCodeFromError maps unknown to generic', () => {
    assert.equal(exitCodeFromError({ code: 'UNKNOWN' }), ExitCode.GenericError);
    assert.equal(exitCodeFromError(null), ExitCode.GenericError);
    assert.equal(exitCodeFromError('string'), ExitCode.GenericError);
    assert.equal(exitCodeFromError(undefined), ExitCode.GenericError);
  });
});
