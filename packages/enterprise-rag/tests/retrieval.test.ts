import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { RetrievalEngine } from '../src/retrieval/RetrievalEngine.js';
import { InMemoryEmbeddingProvider, InMemoryVectorStore } from '../src/indexing/InMemoryIndex.js';
import { ChunkingEngine } from '../src/chunking/ChunkingEngine.js';
import { createDocument } from '../src/ingestion/IngestionEngine.js';
import type { IngestedDocument } from '../src/models.js';

describe('RetrievalEngine', () => {
  let retrieval: RetrievalEngine;
  let embeddingProvider: InMemoryEmbeddingProvider;
  let vectorStore: InMemoryVectorStore;
  let chunking: ChunkingEngine;

  beforeEach(async () => {
    embeddingProvider = new InMemoryEmbeddingProvider(128);
    vectorStore = new InMemoryVectorStore();
    retrieval = new RetrievalEngine(embeddingProvider, vectorStore);
    chunking = new ChunkingEngine({ chunkSize: 200, overlap: 20 });

    const docs: IngestedDocument[] = [
      createDocument('google_drive', 'f1', 'Project Alpha Specification', 'This document describes the Project Alpha specification for the enterprise platform.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'API Documentation', 'The API provides endpoints for user management, authentication, and data retrieval.', 'bob', 'org-1'),
      createDocument('gmail', 'm1', 'Q3 Budget Discussion', 'We need to discuss the Q3 budget allocation for the infrastructure team.', 'carol', 'org-1'),
      createDocument('google_drive', 'f2', 'Private Doc', 'This is a private document for specific users only.', 'alice', 'org-1',
        { visibility: 'private', allowedUserIds: ['user-1'] }),
    ];

    for (const doc of docs) {
      const chunks = chunking.chunk(doc);
      const vectors = await embeddingProvider.embedBatch(chunks.map((c) => c.content));
      const embeddings = chunks.map((c, i) => ({ chunkId: c.id, vector: vectors[i] }));
      retrieval.indexChunks(doc, chunks, embeddings);
    }
  });

  test('vector retrieval returns relevant results', async () => {
    const results = await retrieval.retrieve({
      query: 'project alpha specification',
      mode: 'vector',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.document.title.includes('Project Alpha')));
  });

  test('metadata retrieval matches by text content', async () => {
    const results = await retrieval.retrieve({
      query: 'budget allocation',
      mode: 'metadata',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.document.title.includes('Budget')));
  });

  test('hybrid retrieval combines vector and metadata', async () => {
    const results = await retrieval.retrieve({
      query: 'API endpoints authentication',
      mode: 'hybrid',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(results.length > 0);
    assert.ok(results.some((r) => r.document.title.includes('API')));
  });

  test('filters by organization', async () => {
    const results = await retrieval.retrieve({
      query: 'project',
      mode: 'vector',
      organizationId: 'org-999',
      limit: 5,
    });
    assert.equal(results.length, 0);
  });

  test('filters by source', async () => {
    const results = await retrieval.retrieve({
      query: 'documentation',
      mode: 'metadata',
      organizationId: 'org-1',
      source: 'github',
      limit: 5,
    });
    assert.ok(results.every((r) => r.document.source === 'github'));
  });

  test('respects private document permissions', async () => {
    // Without userId — should not see private docs
    const resultsNoUser = await retrieval.retrieve({
      query: 'private document',
      mode: 'metadata',
      organizationId: 'org-1',
      limit: 10,
    });
    assert.ok(!resultsNoUser.some((r) => r.document.title === 'Private Doc'));

    // With authorized userId — should see private docs
    const resultsWithUser = await retrieval.retrieve({
      query: 'private document',
      mode: 'metadata',
      organizationId: 'org-1',
      userId: 'user-1',
      limit: 10,
    });
    assert.ok(resultsWithUser.some((r) => r.document.title === 'Private Doc'));
  });

  test('respects date range filter', async () => {
    const results = await retrieval.retrieve({
      query: 'project',
      mode: 'vector',
      organizationId: 'org-1',
      dateRange: { start: '2099-01-01', end: '2099-12-31' },
      limit: 5,
    });
    assert.equal(results.length, 0);
  });

  test('limit controls result count', async () => {
    const results = await retrieval.retrieve({
      query: 'the',
      mode: 'metadata',
      organizationId: 'org-1',
      limit: 2,
    });
    assert.ok(results.length <= 2);
  });

  test('results include chunk and document', async () => {
    const results = await retrieval.retrieve({
      query: 'project alpha',
      mode: 'hybrid',
      organizationId: 'org-1',
      limit: 1,
    });
    if (results.length > 0) {
      assert.ok(results[0].chunk);
      assert.ok(results[0].document);
      assert.ok(results[0].score >= 0);
      assert.ok(results[0].matchedFields.length > 0);
    }
  });

  test('trackUsage increments usage count', async () => {
    await retrieval.retrieve({ query: 'project', mode: 'vector', organizationId: 'org-1', limit: 5 });
    await retrieval.retrieve({ query: 'project', mode: 'vector', organizationId: 'org-1', limit: 5 });
    // At least some chunks should have usage > 0
    const allChunks = Array.from({ length: 10 }, (_, i) => retrieval.getChunk(`chunk-${i + 1}`)).filter((c) => c !== undefined);
    if (allChunks.length > 0) {
      const totalUsage = allChunks.reduce((s, c) => s + (c ? retrieval.getUsageCount(c.id) : 0), 0);
      assert.ok(totalUsage > 0);
    }
  });

  test('countChunks and countDocuments return correct values', () => {
    assert.ok(retrieval.countChunks() > 0);
    assert.ok(retrieval.countDocuments() > 0);
  });
});
