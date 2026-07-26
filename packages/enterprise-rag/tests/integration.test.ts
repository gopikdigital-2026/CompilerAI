import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { RAGEngine } from '../src/api/RAGEngine.js';
import { createDocument } from '../src/ingestion/IngestionEngine.js';
import type { IKnowledgeGraphBridge } from '../src/models.js';

describe('RAGEngine — Integration', () => {
  let rag: RAGEngine;

  beforeEach(() => {
    rag = new RAGEngine({ chunkingConfig: { chunkSize: 200, overlap: 20 } });
  });

  test('ingests documents and creates chunks + embeddings', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Project Alpha', 'Project Alpha is the new enterprise platform initiative.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'API Guide', 'The API guide covers authentication, endpoints, and rate limiting.', 'bob', 'org-1'),
    ];
    const result = await rag.ingest('google_drive', docs);
    assert.equal(result.documentsIngested, 2);
    assert.ok(result.chunksCreated > 0);
    assert.ok(result.embeddingsGenerated > 0);
    assert.equal(result.errors.length, 0);
  });

  test('search returns ranked results', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Project Alpha', 'Project Alpha is the new enterprise platform initiative for Q3.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'API Guide', 'The API guide covers authentication, endpoints, and rate limiting.', 'bob', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const results = await rag.search({
      query: 'project alpha enterprise',
      mode: 'hybrid',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(results.length > 0);
    assert.ok(results[0].rankScore > 0);
    assert.ok(results[0].factors.similarity > 0);
  });

  test('retrieve returns unranked results', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Spec', 'The specification covers all technical requirements.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const results = await rag.retrieve({
      query: 'specification',
      mode: 'hybrid',
      organizationId: 'org-1',
      limit: 5,
    });
    assert.ok(results.length > 0);
  });

  test('explain returns grounded answer with citations', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Project Alpha', 'Project Alpha is the enterprise platform. It uses microservices.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'Architecture', 'The architecture follows a microservices pattern with REST APIs.', 'bob', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const answer = await rag.explain('What architecture does Project Alpha use?', 'org-1');
    assert.ok(answer.answer.length > 0);
    assert.ok(answer.citations.length > 0);
    assert.ok(answer.groundedChunks.length > 0);
    assert.ok(answer.confidence > 0);
  });

  test('citations include full traceability', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Budget Doc', 'The Q3 budget allocates 50K for infrastructure.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const answer = await rag.explain('What is the Q3 budget?', 'org-1');
    for (const citation of answer.citations) {
      assert.ok(citation.documentId);
      assert.ok(citation.documentTitle);
      assert.ok(citation.source);
      assert.ok(citation.author);
      assert.ok(citation.chunkId);
      assert.ok(citation.score > 0);
    }
  });

  test('cache is used on repeated searches', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc', 'Some relevant content for testing cache behavior.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    await rag.search({ query: 'cache behavior', mode: 'hybrid', organizationId: 'org-1' });
    await rag.search({ query: 'cache behavior', mode: 'hybrid', organizationId: 'org-1' });
    const stats = rag.getCacheStats();
    assert.ok(stats.hits > 0);
  });

  test('invalidateCache clears cache entries', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc', 'Content for cache invalidation test.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    await rag.search({ query: 'cache test', mode: 'hybrid', organizationId: 'org-1' });
    const cleared = rag.invalidateCache();
    assert.ok(cleared >= 1);
    assert.equal(rag.getCacheStats().size, 0);
  });

  test('reindex regenerates chunks and embeddings', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc', 'Original content for reindexing.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const result = await rag.reindex();
    assert.equal(result.documentsReindexed, 1);
    assert.ok(result.chunksReprocessed > 0);
    assert.ok(result.embeddingsRegenerated > 0);
  });

  test('reindex specific document', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc A', 'Content A.', 'alice', 'org-1'),
      createDocument('google_drive', 'f2', 'Doc B', 'Content B.', 'bob', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const firstDoc = docs[0];
    const result = await rag.reindex(firstDoc.id);
    assert.equal(result.documentsReindexed, 1);
  });

  test('telemetry events are emitted during workflow', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc', 'Content for telemetry testing.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    await rag.search({ query: 'telemetry', mode: 'hybrid', organizationId: 'org-1' });
    await rag.explain('What is this about?', 'org-1');
    const events = rag.getTelemetryEvents();
    assert.ok(events.some((e) => e.type === 'ingestion.completed'));
    assert.ok(events.some((e) => e.type === 'retrieval.executed'));
    assert.ok(events.some((e) => e.type === 'grounding.completed'));
  });

  test('permission filters work in search', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Public Doc', 'Public content for everyone.', 'alice', 'org-1',
        { visibility: 'organization' }),
      createDocument('google_drive', 'f2', 'Private Doc', 'Private content for specific users.', 'bob', 'org-1',
        { visibility: 'private', allowedUserIds: ['user-1'] }),
    ];
    await rag.ingest('google_drive', docs);

    // Without userId, should only see organization-level docs
    const resultsNoUser = await rag.search({
      query: 'content',
      mode: 'metadata',
      organizationId: 'org-1',
      limit: 10,
    });
    assert.ok(!resultsNoUser.some((r) => r.document.title === 'Private Doc'));

    // With authorized userId, should see private docs
    const resultsWithUser = await rag.search({
      query: 'content',
      mode: 'metadata',
      organizationId: 'org-1',
      userId: 'user-1',
      limit: 10,
    });
    assert.ok(resultsWithUser.some((r) => r.document.title === 'Private Doc'));
  });

  test('formatCitations produces readable citation list', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Spec', 'The specification document covers all requirements.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const answer = await rag.explain('What are the requirements?', 'org-1');
    const formatted = rag.formatCitations(answer);
    assert.ok(formatted.includes('Citation'));
    assert.ok(formatted.includes('Spec'));
  });

  test('formatBibliography produces source list', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc A', 'Content A about topics.', 'alice', 'org-1'),
      createDocument('github', 'r1', 'Doc B', 'Content B about topics.', 'bob', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    const answer = await rag.explain('topics', 'org-1');
    const bibliography = rag.formatBibliography(answer);
    assert.ok(bibliography.includes('Bibliography'));
  });

  test('count helpers return correct values', async () => {
    const docs = [
      createDocument('google_drive', 'f1', 'Doc', 'Content.', 'alice', 'org-1'),
    ];
    await rag.ingest('google_drive', docs);
    assert.ok(rag.countDocuments() > 0);
    assert.ok(rag.countChunks() > 0);
    assert.ok(rag.countEmbeddings() > 0);
  });

  test('all public API methods are accessible', () => {
    assert.equal(typeof rag.ingest, 'function');
    assert.equal(typeof rag.reindex, 'function');
    assert.equal(typeof rag.search, 'function');
    assert.equal(typeof rag.retrieve, 'function');
    assert.equal(typeof rag.explain, 'function');
    assert.equal(typeof rag.invalidateCache, 'function');
  });

  test('Knowledge Graph bridge provides cross-references', async () => {
    const mockBridge: IKnowledgeGraphBridge = {
      getRelatedEntities: (docId: string, _orgId: string) => [`kg-ref-for-${docId}`],
      getEntityBySourceId: (_sId: string, _s: string) => undefined,
    };
    const ragWithKG = new RAGEngine({ kgBridge: mockBridge, chunkingConfig: { chunkSize: 200, overlap: 20 } });
    const docs = [
      createDocument('knowledge_graph', 'kg-1', 'KG Doc', 'Content from the knowledge graph.', 'system', 'org-1'),
    ];
    await ragWithKG.ingest('knowledge_graph', docs);
    const answer = await ragWithKG.explain('knowledge graph content', 'org-1');
    assert.ok(answer.citations.length > 0);
    assert.ok(answer.citations[0].knowledgeGraphRefs.length > 0);
  });
});
