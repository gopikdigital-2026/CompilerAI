import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import {
  GitHubAppJwtProvider,
  SystemClock,
} from '../../src/index';
import type { GitHubAppCredentials } from '../../src/providers/github/auth/GitHubAppAuthContracts';

function generateTestPrivateKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    format: { type: 'pem' },
    type: 'pkcs1',
  });
  return typeof privateKey === 'string'
    ? privateKey
    : privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
}

const TEST_PRIVATE_KEY = generateTestPrivateKey();

const TEST_CREDENTIALS: GitHubAppCredentials = {
  appId: 12345,
  privateKey: TEST_PRIVATE_KEY,
  installationId: 67890,
};

describe('GitHubAppJwtProvider', () => {
  it('should generate a valid JWT with RS256', () => {
    const provider = new GitHubAppJwtProvider();
    const { jwt, claims } = provider.generateJwt(TEST_CREDENTIALS);

    assert.ok(jwt.length > 0);
    assert.equal(claims.iss, 12345);
    assert.ok(claims.exp > claims.iat);
    assert.ok(provider.verifyJwtStructure(jwt));
  });

  it('should produce 3-part JWT structure', () => {
    const provider = new GitHubAppJwtProvider();
    const { jwt } = provider.generateJwt(TEST_CREDENTIALS);
    const parts = jwt.split('.');
    assert.equal(parts.length, 3);
  });

  it('should set expiration per TTL option', () => {
    const clock = new SystemClock();
    const provider = new GitHubAppJwtProvider(clock);
    const { claims } = provider.generateJwt(TEST_CREDENTIALS, { ttlSeconds: 120 });
    const expectedTtl = 120;
    const actualTtl = claims.exp - claims.iat;
    assert.ok(actualTtl >= expectedTtl - 5 && actualTtl <= expectedTtl + 5);
  });

  it('should throw on invalid TTL', () => {
    const provider = new GitHubAppJwtProvider();
    assert.throws(
      () => provider.generateJwt(TEST_CREDENTIALS, { ttlSeconds: 0 }),
      /TTL/,
    );
    assert.throws(
      () => provider.generateJwt(TEST_CREDENTIALS, { ttlSeconds: 601 }),
      /TTL/,
    );
  });

  it('should throw on empty private key', () => {
    const provider = new GitHubAppJwtProvider();
    assert.throws(
      () => provider.generateJwt({ ...TEST_CREDENTIALS, privateKey: '' }),
      /private key/,
    );
  });

  it('should throw on invalid private key format', () => {
    const provider = new GitHubAppJwtProvider();
    assert.throws(
      () => provider.generateJwt({ ...TEST_CREDENTIALS, privateKey: 'not-a-key' }),
      /Invalid private key format/,
    );
  });

  it('should detect expired JWT', () => {
    const clock = new SystemClock();
    const provider = new GitHubAppJwtProvider(clock);
    const { claims } = provider.generateJwt(TEST_CREDENTIALS, { ttlSeconds: 600 });
    // Fresh JWT should not be expired
    assert.equal(provider.isExpired(claims), false);

    // Manually construct expired claims
    const expiredClaims = { iss: 12345, iat: 1000, exp: 1001 };
    assert.equal(provider.isExpired(expiredClaims), true);
  });

  it('should extract claims from generated JWT', () => {
    const provider = new GitHubAppJwtProvider();
    const { jwt, claims: original } = provider.generateJwt(TEST_CREDENTIALS);
    const extracted = provider.extractClaims(jwt);
    assert.equal(extracted.iss, original.iss);
    assert.equal(extracted.iat, original.iat);
    assert.equal(extracted.exp, original.exp);
  });

  it('should reject invalid JWT format', () => {
    const provider = new GitHubAppJwtProvider();
    assert.throws(
      () => provider.extractClaims('invalid.jwt'),
      /Invalid JWT format/,
    );
  });

  it('should use custom clock for time-based claims', () => {
    const fixedDate = new Date('2025-01-01T00:00:00Z');
    const clock: { now(): Date } = { now: () => fixedDate };
    const provider = new GitHubAppJwtProvider(clock);
    const { claims } = provider.generateJwt(TEST_CREDENTIALS, { ttlSeconds: 600 });
    const expectedIat = Math.floor(fixedDate.getTime() / 1000) - 60;
    assert.ok(Math.abs(claims.iat - expectedIat) <= 1);
  });
});
