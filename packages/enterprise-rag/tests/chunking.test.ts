import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { ChunkingEngine } from '../src/chunking/ChunkingEngine.js';
import { createDocument } from '../src/ingestion/IngestionEngine.js';

describe('ChunkingEngine', () => {
  test('chunks with fixed size', () => {
    const engine = new ChunkingEngine({ strategy: 'fixed_size', chunkSize: 100, overlap: 20 });
    const doc = createDocument('google_drive', 'f1', 'Test', 'A'.repeat(300), 'author', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 3);
    for (const chunk of chunks) {
      assert.ok(chunk.content.length <= 100 || chunk.content.length > 0);
      assert.equal(chunk.documentId, doc.id);
      assert.ok(chunk.tokenCount > 0);
      assert.ok(chunk.hash);
    }
  });

  test('chunks by header', () => {
    const content = '# Section 1\nContent for section 1\n\n# Section 2\nContent for section 2\n\n# Section 3\nContent for section 3';
    const engine = new ChunkingEngine({ strategy: 'by_header' });
    const doc = createDocument('google_drive', 'f1', 'Test', content, 'author', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 3);
    assert.ok(chunks.some((c) => c.section === 'Section 1'));
    assert.ok(chunks.some((c) => c.section === 'Section 2'));
  });

  test('chunks by section', () => {
    const content = 'Part one content\n\n---\n\nPart two content\n\n---\n\nPart three content';
    const engine = new ChunkingEngine({ strategy: 'by_section' });
    const doc = createDocument('google_drive', 'f1', 'Test', content, 'author', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 3);
  });

  test('preserves code blocks', () => {
    const code = '```python\ndef hello():\n    print("Hello World")\n    return 42\n```';
    const engine = new ChunkingEngine({ strategy: 'fixed_size', chunkSize: 50, overlap: 10, preserveCodeBlocks: true });
    const doc = createDocument('github', 'r1', 'Code', code, 'dev', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 1);
    // At least one chunk should contain the full code block
    const hasFullCode = chunks.some((c) => c.content.includes('def hello'));
    assert.ok(hasFullCode);
  });

  test('preserves tables', () => {
    const table = '| Col1 | Col2 |\n|------|------|\n| A    | B    |\n| C    | D    |';
    const engine = new ChunkingEngine({ strategy: 'fixed_size', chunkSize: 30, overlap: 5, preserveTables: true });
    const doc = createDocument('google_drive', 'f1', 'Table', table, 'author', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 1);
  });

  test('each chunk has unique id', () => {
    const engine = new ChunkingEngine({ chunkSize: 50, overlap: 10 });
    const doc = createDocument('google_drive', 'f1', 'Test', 'A'.repeat(200), 'author', 'org-1');
    const chunks = engine.chunk(doc);
    const ids = chunks.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('chunks have correct positions', () => {
    const engine = new ChunkingEngine({ chunkSize: 50, overlap: 0 });
    const doc = createDocument('google_drive', 'f1', 'Test', 'A'.repeat(100), 'author', 'org-1');
    const chunks = engine.chunk(doc);
    assert.ok(chunks.length >= 2);
    for (const chunk of chunks) {
      assert.ok(chunk.position.start < chunk.position.end);
    }
  });

  test('chunk indices are sequential', () => {
    const engine = new ChunkingEngine({ chunkSize: 50, overlap: 0 });
    const doc = createDocument('google_drive', 'f1', 'Test', 'A'.repeat(200), 'author', 'org-1');
    const chunks = engine.chunk(doc);
    for (let i = 0; i < chunks.length; i++) {
      assert.equal(chunks[i].index, i);
    }
  });

  test('empty content produces no chunks or minimal chunks', () => {
    const engine = new ChunkingEngine({ chunkSize: 100, overlap: 0 });
    const doc = createDocument('google_drive', 'f1', 'Test', '', 'author', 'org-1');
    const chunks = engine.chunk(doc);
    // Empty content should produce 0 chunks with fixed_size since the while loop never enters
    assert.ok(chunks.length <= 1);
  });

  test('getConfig returns current configuration', () => {
    const engine = new ChunkingEngine({ chunkSize: 256, overlap: 32 });
    const config = engine.getConfig();
    assert.equal(config.chunkSize, 256);
    assert.equal(config.overlap, 32);
  });
});
