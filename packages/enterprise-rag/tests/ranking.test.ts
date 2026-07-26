import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { RankingEngine } from '../src/ranking/RankingEngine.js';
import type { RetrievalResult } from '../src/models.js';
import { createDocument } from '../src/ingestion/IngestionEngine.js';

function makeResult(score: number, author: string, source: RetrievalResult['document']['source'], daysAgo: number, chunkId: string): RetrievalResult {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const doc = { ...createDocument(source, 'f1', 'Test', 'content', author, 'org-1'), createdAt: date };
  return {
    chunk: { id: chunkId, documentId: doc.id, index: 0, content: 'test', tokenCount: 1, section: null, position: { start: 0, end: 4 }, hash: 'h1' },
    document: doc,
    score,
    matchedFields: ['content'],
  };
}

describe('RankingEngine', () => {
  let engine: RankingEngine;

  beforeEach(() => {
    engine = new RankingEngine();
  });

  test('ranks results by combined score', () => {
    const results = [
      makeResult(0.9, 'expert', 'knowledge_graph', 1, 'c1'),
      makeResult(0.5, 'novice', 'gmail', 30, 'c2'),
    ];
    engine.setUsageCount('c1', 5);
    engine.setUsageCount('c2', 0);
    const ranked = engine.rank(results);
    assert.equal(ranked[0].chunk.id, 'c1');
    assert.ok(ranked[0].rankScore > ranked[1].rankScore);
  });

  test('recency boosts recent documents', () => {
    const results = [
      makeResult(0.7, 'alice', 'google_drive', 90, 'c1'),
      makeResult(0.7, 'alice', 'google_drive', 1, 'c2'),
    ];
    const ranked = engine.rank(results);
    assert.equal(ranked[0].chunk.id, 'c2');
  });

  test('source trust affects ranking', () => {
    const results = [
      makeResult(0.8, 'alice', 'gmail', 1, 'c1'),
      makeResult(0.8, 'alice', 'knowledge_graph', 1, 'c2'),
    ];
    const ranked = engine.rank(results);
    assert.equal(ranked[0].chunk.id, 'c2');
  });

  test('usage frequency affects ranking', () => {
    const results = [
      makeResult(0.8, 'alice', 'google_drive', 1, 'c1'),
      makeResult(0.8, 'alice', 'google_drive', 1, 'c2'),
    ];
    engine.setUsageCount('c1', 0);
    engine.setUsageCount('c2', 10);
    const ranked = engine.rank(results);
    assert.equal(ranked[0].chunk.id, 'c2');
  });

  test('authority affects ranking', () => {
    const results = [
      makeResult(0.8, 'novice', 'google_drive', 1, 'c1'),
      makeResult(0.8, 'expert', 'google_drive', 1, 'c2'),
    ];
    engine.setAuthorAuthority('expert', 0.95);
    engine.setAuthorAuthority('novice', 0.3);
    const ranked = engine.rank(results);
    assert.equal(ranked[0].chunk.id, 'c2');
  });

  test('ranked results include factors breakdown', () => {
    const results = [makeResult(0.8, 'alice', 'knowledge_graph', 5, 'c1')];
    const ranked = engine.rank(results);
    assert.ok(ranked[0].factors.similarity > 0);
    assert.ok(ranked[0].factors.recency > 0);
    assert.ok(ranked[0].factors.authority > 0);
    assert.ok(ranked[0].factors.usageFrequency >= 0);
    assert.ok(ranked[0].factors.sourceTrust > 0);
  });

  test('empty results produce empty ranking', () => {
    const ranked = engine.rank([]);
    assert.equal(ranked.length, 0);
  });

  test('getWeights returns weight configuration', () => {
    const weights = engine.getWeights();
    assert.ok(weights.similarity > 0);
    assert.ok(weights.recency > 0);
    assert.ok(weights.authority > 0);
    assert.ok(weights.usageFrequency > 0);
    assert.ok(weights.sourceTrust > 0);
  });
});
