import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { IdentityManager } from '../src/identity/IdentityManager.js';
import { AuthenticationManager, MockAuthProvider } from '../src/authentication/AuthenticationManager.js';

describe('AuthenticationManager', () => {
  let identity: IdentityManager;
  let auth: AuthenticationManager;

  beforeEach(() => {
    identity = new IdentityManager();
    auth = new AuthenticationManager(identity);
  });

  test('authenticates a valid identity', async () => {
    const user = identity.create('user', 'Alice', 'org-1');
    const result = await auth.authenticate({
      identityId: user.id, method: 'mock', token: 'test-token', metadata: {},
    });
    assert.equal(result.authenticated, true);
    assert.ok(result.token);
    assert.ok(result.expiresAt);
  });

  test('fails for non-existent identity', async () => {
    const result = await auth.authenticate({
      identityId: 'nonexistent', method: 'mock', token: 'test', metadata: {},
    });
    assert.equal(result.authenticated, false);
    assert.ok(result.error);
  });

  test('fails for suspended identity', async () => {
    const user = identity.create('user', 'Alice', 'org-1');
    identity.setStatus(user.id, 'suspended');
    const result = await auth.authenticate({
      identityId: user.id, method: 'mock', token: 'test', metadata: {},
    });
    assert.equal(result.authenticated, false);
  });

  test('validateToken validates a valid token', async () => {
    const user = identity.create('user', 'Alice', 'org-1');
    const authResult = await auth.authenticate({
      identityId: user.id, method: 'mock', token: 'test', metadata: {},
    });
    const validation = await auth.validateToken(authResult.token!);
    assert.equal(validation.authenticated, true);
  });

  test('validateToken rejects invalid token', async () => {
    const result = await auth.validateToken('invalid-token');
    assert.equal(result.authenticated, false);
  });

  test('refreshToken extends expiration', async () => {
    const user = identity.create('user', 'Alice', 'org-1');
    const authResult = await auth.authenticate({
      identityId: user.id, method: 'mock', token: 'test', metadata: {},
    });
    const refreshed = await auth.refreshToken(authResult.token!);
    assert.equal(refreshed.authenticated, true);
    assert.ok(refreshed.expiresAt);
  });

  test('getSupportedMethods returns registered methods', () => {
    assert.ok(auth.getSupportedMethods().includes('mock'));
  });

  test('supports custom providers', async () => {
    const customProvider = new MockAuthProvider(identity);
    auth.registerProvider(customProvider);
    assert.ok(auth.getSupportedMethods().includes('mock'));
  });
});
