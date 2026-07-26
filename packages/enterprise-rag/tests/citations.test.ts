import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { CitationEngine } from '../src/citations/CitationEngine.js';
import type { Citation } from '../src/models.js';

function makeCitation(docId: string, title: string, author: string, source: Citation['source'], chunkId: string, score: number, kgRefs: string[] = []): Citation {
  return {
    documentId: docId,
    documentTitle: title,
    source,
    author,
    chunkId,
    section: 'Introduction',
    position: { start: 0, end: 100 },
    score,
    knowledgeGraphRefs: kgRefs,
  };
}

describe('CitationEngine', () => {
  test('formatCitation produces readable string', () => {
    const engine = new CitationEngine();
    const citation = makeCitation('doc-1', 'Project Spec', 'Alice', 'google_drive', 'chunk-1', 0.92, ['kg-1']);
    const formatted = engine.formatCitation(citation);
    assert.ok(formatted.includes('Project Spec'));
    assert.ok(formatted.includes('Alice'));
    assert.ok(formatted.includes('google_drive'));
    assert.ok(formatted.includes('Introduction'));
    assert.ok(formatted.includes('kg-1'));
  });

  test('formatCitations formats multiple citations', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c1', 0.9),
      makeCitation('doc-2', 'B', 'Bob', 'github', 'c2', 0.8),
    ];
    const formatted = engine.formatCitations(citations);
    assert.equal(formatted.length, 2);
    assert.ok(formatted[0].includes('A'));
    assert.ok(formatted[1].includes('B'));
  });

  test('formatCitationList produces numbered list', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c1', 0.9),
      makeCitation('doc-2', 'B', 'Bob', 'github', 'c2', 0.8),
    ];
    const list = engine.formatCitationList(citations);
    assert.ok(list.includes('1.'));
    assert.ok(list.includes('2.'));
    assert.ok(list.includes('Citations (2)'));
  });

  test('formatBibliography deduplicates by document', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c1', 0.9),
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c2', 0.85),
      makeCitation('doc-2', 'B', 'Bob', 'github', 'c3', 0.8),
    ];
    const bibliography = engine.formatBibliography(citations);
    assert.ok(bibliography.includes('2 source'));
    assert.ok(bibliography.includes('A'));
    assert.ok(bibliography.includes('B'));
    assert.ok(!bibliography.includes('A\nA'));
  });

  test('getDocumentIds returns unique document IDs', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c1', 0.9),
      makeCitation('doc-1', 'A', 'Alice', 'google_drive', 'c2', 0.85),
      makeCitation('doc-2', 'B', 'Bob', 'github', 'c3', 0.8),
    ];
    const docIds = engine.getDocumentIds(citations);
    assert.deepEqual(docIds, ['doc-1', 'doc-2']);
  });

  test('getKGReferences returns unique KG refs', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('d1', 'A', 'a', 'knowledge_graph', 'c1', 0.9, ['kg-1', 'kg-2']),
      makeCitation('d2', 'B', 'b', 'knowledge_graph', 'c2', 0.8, ['kg-2', 'kg-3']),
    ];
    const refs = engine.getKGReferences(citations);
    assert.deepEqual(refs, ['kg-1', 'kg-2', 'kg-3']);
  });

  test('toTraceableObject includes all traceable IDs', () => {
    const engine = new CitationEngine();
    const citations = [
      makeCitation('d1', 'A', 'a', 'github', 'c1', 0.9, ['kg-1']),
      makeCitation('d2', 'B', 'b', 'google_drive', 'c2', 0.8, ['kg-2']),
    ];
    const traceable = engine.toTraceableObject(citations);
    assert.deepEqual(traceable.documentIds, ['d1', 'd2']);
    assert.deepEqual(traceable.chunkIds, ['c1', 'c2']);
    assert.deepEqual(traceable.kgRefs, ['kg-1', 'kg-2']);
    assert.deepEqual(traceable.sources, ['github', 'google_drive']);
  });

  test('empty citations list produces graceful output', () => {
    const engine = new CitationEngine();
    assert.equal(engine.formatCitationList([]).includes('No citations'), true);
    assert.ok(engine.formatBibliography([]).includes('0 source'));
  });
});
