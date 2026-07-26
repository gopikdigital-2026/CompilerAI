import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { GroundingEngine } from '../src/grounding/GroundingEngine.js';
import { createDocument } from '../src/ingestion/IngestionEngine.js';
import type { RankedResult } from '../src/models.js';

function makeRankedResult(title: string, source: RankedResult['document']['source'], author: string, score: number): RankedResult {
  const doc = createDocument(source, 'f1', title, 'This is the content of the document that was retrieved.', author, 'org-1');
  return {
    chunk: { id: `chunk-${title}`, documentId: doc.id, index: 0, content: 'Content excerpt here.', tokenCount: 3, section: 'Introduction', position: { start: 0, end: 20 }, hash: 'h1' },
    document: doc,
    score,
    rankScore: score,
    factors: { similarity: score, recency: 0.8, authority: 0.7, usageFrequency: 0.5, sourceTrust: 0.9 },
    matchedFields: ['content'],
  };
}

describe('GroundingEngine', () => {
  let engine: GroundingEngine;

  beforeEach(() => {
    engine = new GroundingEngine();
  });

  test('grounds results into an answer with citations', () => {
    const results = [makeRankedResult('Project Spec', 'google_drive', 'alice', 0.9)];
    const answer = engine.ground('What is Project Alpha?', results, 'org-1');
    assert.ok(answer.answer.length > 0);
    assert.equal(answer.citations.length, 1);
    assert.equal(answer.groundedChunks.length, 1);
    assert.ok(answer.confidence > 0);
  });

  test('answer includes document title and author', () => {
    const results = [makeRankedResult('Tech Doc', 'github', 'bob', 0.85)];
    const answer = engine.ground('explain the API', results, 'org-1');
    assert.ok(answer.answer.includes('Tech Doc'));
    assert.ok(answer.answer.includes('bob'));
  });

  test('citations include all traceable fields', () => {
    const results = [makeRankedResult('Spec', 'google_drive', 'alice', 0.9)];
    const answer = engine.ground('query', results, 'org-1');
    const citation = answer.citations[0];
    assert.ok(citation.documentId);
    assert.ok(citation.documentTitle);
    assert.ok(citation.source);
    assert.ok(citation.author);
    assert.ok(citation.chunkId);
    assert.ok(citation.section);
    assert.ok(citation.position);
    assert.ok(citation.score > 0);
    assert.ok(Array.isArray(citation.knowledgeGraphRefs));
  });

  test('grounded chunks include content and position', () => {
    const results = [makeRankedResult('Doc', 'github', 'dev', 0.8)];
    const answer = engine.ground('query', results, 'org-1');
    const chunk = answer.groundedChunks[0];
    assert.ok(chunk.chunkId);
    assert.ok(chunk.documentId);
    assert.ok(chunk.content);
    assert.ok(chunk.score > 0);
    assert.ok(chunk.position);
  });

  test('confidence is higher with multiple diverse sources', () => {
    const singleSource = [makeRankedResult('A', 'google_drive', 'alice', 0.9)];
    const multiSource = [
      makeRankedResult('A', 'google_drive', 'alice', 0.9),
      makeRankedResult('B', 'github', 'bob', 0.85),
    ];
    const answer1 = engine.ground('query', singleSource, 'org-1');
    const answer2 = engine.ground('query', multiSource, 'org-1');
    assert.ok(answer2.confidence >= answer1.confidence);
  });

  test('empty results produce no-citations answer', () => {
    const answer = engine.ground('query', [], 'org-1');
    assert.equal(answer.citations.length, 0);
    assert.ok(answer.answer.includes('No relevant'));
    assert.equal(answer.confidence, 0);
  });

  test('explainCitation formats a readable string', () => {
    const results = [makeRankedResult('Spec', 'google_drive', 'alice', 0.9)];
    const answer = engine.ground('query', results, 'org-1');
    const explanation = engine.explainCitation(answer.citations[0]);
    assert.ok(explanation.includes('Spec'));
    assert.ok(explanation.includes('alice'));
    assert.ok(explanation.includes('google_drive'));
  });

  test('explainAll formats all citations', () => {
    const results = [
      makeRankedResult('A', 'google_drive', 'alice', 0.9),
      makeRankedResult('B', 'github', 'bob', 0.8),
    ];
    const answer = engine.ground('query', results, 'org-1');
    const explanations = engine.explainAll(answer.citations);
    assert.equal(explanations.length, 2);
  });

  test('KG references included when bridge is provided', () => {
    const mockBridge = {
      getRelatedEntities: (_docId: string, _orgId: string) => ['kg-entity-1', 'kg-entity-2'],
      getEntityBySourceId: (_sId: string, _s: string) => undefined,
    };
    const groundedEngine = new GroundingEngine(mockBridge);
    const results = [makeRankedResult('Doc', 'knowledge_graph', 'alice', 0.9)];
    const answer = groundedEngine.ground('query', results, 'org-1');
    assert.equal(answer.citations[0].knowledgeGraphRefs.length, 2);
  });
});
