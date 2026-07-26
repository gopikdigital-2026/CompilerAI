import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { RAGCache } from '../src/cache/RAGCache.js';

describe('RAGCache', () => {
  let cache: RAGCache;

  beforeEach(() => {
    cache = new RAGCache();
  });

  test('set and get a value', () => {
    cache.set('key-1', { data: 'test' }, 'hash-1');
    const value = cache.get<{ data: string }>('key-1');
    assert.deepEqual(value, { data: 'test' });
  });

  test('get returns undefined for missing key', () => {
    assert.equal(cache.get('nonexistent'), undefined);
  });

  test('tracks hits and misses', () => {
    cache.set('key-1', 'value', 'hash-1');
    cache.get('key-1');
    cache.get('missing');
    const stats = cache.getStats();
    assert.equal(stats.hits, 1);
    assert.equal(stats.misses, 1);
    assert.equal(stats.hitRate, 0.5);
  });

  test('invalidate removes a key', () => {
    cache.set('key-1', 'value', 'hash-1');
    assert.equal(cache.invalidate('key-1'), true);
    assert.equal(cache.get('key-1'), undefined);
  });

  test('invalidateByHash removes all entries with that hash', () => {
    cache.set('key-1', 'value1', 'shared-hash');
    cache.set('key-2', 'value2', 'shared-hash');
    cache.set('key-3', 'value3', 'different-hash');
    const count = cache.invalidateByHash('shared-hash');
    assert.equal(count, 2);
    assert.equal(cache.get('key-1'), undefined);
    assert.equal(cache.get('key-2'), undefined);
    assert.ok(cache.get('key-3'));
  });

  test('invalidatePattern removes matching keys', () => {
    cache.set('query:org-1:vector:abc', 'val1', 'h1');
    cache.set('query:org-1:metadata:xyz', 'val2', 'h2');
    cache.set('result:org-1:def', 'val3', 'h3');
    const count = cache.invalidatePattern('query:org-1');
    assert.equal(count, 2);
    assert.equal(cache.get('query:org-1:vector:abc'), undefined);
    assert.equal(cache.get('result:org-1:def') !== undefined, true);
  });

  test('size returns number of entries', () => {
    cache.set('k1', 'v1', 'h1');
    cache.set('k2', 'v2', 'h2');
    assert.equal(cache.size(), 2);
  });

  test('clear removes all entries and resets stats', () => {
    cache.set('k1', 'v1', 'h1');
    cache.get('k1');
    cache.clear();
    assert.equal(cache.size(), 0);
    const stats = cache.getStats();
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
  });

  test('TTL expires entries', () => {
    cache.set('key-1', 'value', 'hash-1', 1); // 1ms TTL
    // Wait for expiration
    const start = Date.now();
    while (Date.now() - start < 10) { /* spin */ }
    assert.equal(cache.get('key-1'), undefined);
  });

  test('updating a key with different hash updates hash index', () => {
    cache.set('key-1', 'v1', 'hash-1');
    cache.set('key-1', 'v2', 'hash-2');
    assert.equal(cache.invalidateByHash('hash-1'), 0); // old hash should have no entries
    assert.equal(cache.invalidateByHash('hash-2'), 1);
  });

  test('access count increments on get', () => {
    cache.set('key-1', 'value', 'hash-1');
    cache.get('key-1');
    cache.get('key-1');
    cache.get('key-1');
    // We can't directly check accessCount from the interface, but stats show hits
    const stats = cache.getStats();
    assert.equal(stats.hits, 3);
  });

  test('getStats includes invalidated count', () => {
    cache.set('k1', 'v1', 'h1');
    cache.set('k2', 'v2', 'h2');
    cache.invalidate('k1');
    cache.invalidate('k2');
    const stats = cache.getStats();
    assert.equal(stats.invalidated, 2);
  });

  test('cache key builders produce consistent keys', () => {
    const k1 = RAGCache.embeddingKey('hello');
    const k2 = RAGCache.embeddingKey('hello');
    assert.equal(k1, k2);
    assert.ok(k1.startsWith('emb:'));
  });

  test('query key includes org and mode', () => {
    const k = RAGCache.queryKey('test', 'org-1', 'hybrid');
    assert.ok(k.includes('org-1'));
    assert.ok(k.includes('hybrid'));
  });
});
