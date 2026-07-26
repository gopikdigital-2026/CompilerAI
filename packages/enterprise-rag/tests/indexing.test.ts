import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { InMemoryEmbeddingProvider, InMemoryVectorStore } from '../src/indexing/InMemoryIndex.js';
import type { EmbeddingVector } from '../src/models.js';

describe('InMemoryEmbeddingProvider', () => {
  test('generates embeddings of correct dimensions', async () => {
    const provider = new InMemoryEmbeddingProvider(128);
    const vector = await provider.embed('hello world');
    assert.equal(vector.length, 128);
  });

  test('different texts produce different embeddings', async () => {
    const provider = new InMemoryEmbeddingProvider(128);
    const v1 = await provider.embed('hello world');
    const v2 = await provider.embed('goodbye world');
    assert.notDeepEqual(v1, v2);
  });

  test('same text produces same embedding', async () => {
    const provider = new InMemoryEmbeddingProvider(128);
    const v1 = await provider.embed('hello world');
    const v2 = await provider.embed('hello world');
    assert.deepEqual(v1, v2);
  });

  test('embedBatch processes multiple texts', async () => {
    const provider = new InMemoryEmbeddingProvider(64);
    const vectors = await provider.embedBatch(['hello', 'world', 'test']);
    assert.equal(vectors.length, 3);
    for (const v of vectors) {
      assert.equal(v.length, 64);
    }
  });

  test('dimensions returns correct size', () => {
    const provider = new InMemoryEmbeddingProvider(256);
    assert.equal(provider.dimensions(), 256);
  });

  test('embeddings are normalized', async () => {
    const provider = new InMemoryEmbeddingProvider(64);
    const v = await provider.embed('test text for normalization');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(norm - 1) < 0.01 || norm === 0);
  });
});

describe('InMemoryVectorStore', () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  test('adds and searches embeddings', () => {
    const embedding: EmbeddingVector = {
      id: 'e1', chunkId: 'c1', vector: [1, 0, 0], documentId: 'd1', organizationId: 'org-1',
    };
    store.add(embedding);
    const results = store.search([1, 0, 0], 10);
    assert.equal(results.length, 1);
    assert.equal(results[0].embedding.id, 'e1');
    assert.ok(results[0].score > 0);
  });

  test('addBatch adds multiple embeddings', () => {
    const embeddings = [
      { id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' },
      { id: 'e2', chunkId: 'c2', vector: [0, 1], documentId: 'd1', organizationId: 'org-1' },
    ];
    store.addBatch(embeddings);
    assert.equal(store.count(), 2);
  });

  test('search filters by organization', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e2', chunkId: 'c2', vector: [1, 0], documentId: 'd2', organizationId: 'org-2' });
    const results = store.search([1, 0], 10, { organizationId: 'org-1' });
    assert.equal(results.length, 1);
    assert.equal(results[0].embedding.organizationId, 'org-1');
  });

  test('search filters by documentIds', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e2', chunkId: 'c2', vector: [1, 0], documentId: 'd2', organizationId: 'org-1' });
    const results = store.search([1, 0], 10, { documentIds: ['d1'] });
    assert.equal(results.length, 1);
    assert.equal(results[0].embedding.documentId, 'd1');
  });

  test('remove deletes an embedding', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' });
    store.remove('e1');
    assert.equal(store.count(), 0);
  });

  test('removeByDocument removes all embeddings for a document', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e2', chunkId: 'c2', vector: [0, 1], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e3', chunkId: 'c3', vector: [1, 1], documentId: 'd2', organizationId: 'org-1' });
    store.removeByDocument('d1');
    assert.equal(store.count(), 1);
  });

  test('search ranks by cosine similarity', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1, 0], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e2', chunkId: 'c2', vector: [0.9, 0.1], documentId: 'd2', organizationId: 'org-1' });
    store.add({ id: 'e3', chunkId: 'c3', vector: [0, 1], documentId: 'd3', organizationId: 'org-1' });
    const results = store.search([1, 0], 3);
    assert.equal(results[0].embedding.id, 'e1');
    assert.ok(results[0].score >= results[1].score);
  });

  test('count returns total embeddings', () => {
    store.add({ id: 'e1', chunkId: 'c1', vector: [1], documentId: 'd1', organizationId: 'org-1' });
    store.add({ id: 'e2', chunkId: 'c2', vector: [1], documentId: 'd2', organizationId: 'org-1' });
    assert.equal(store.count(), 2);
  });
});
