import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { IngestionEngine, createDocument, computeHash, GoogleDriveAdapter, GitHubAdapter } from '../src/ingestion/IngestionEngine.js';

describe('IngestionEngine', () => {
  let engine: IngestionEngine;

  beforeEach(() => {
    engine = new IngestionEngine();
  });

  test('ingests documents and tracks them', () => {
    const doc = createDocument('google_drive', 'file-1', 'Test Doc', 'Content here', 'author-1', 'org-1');
    const result = engine.ingest([doc]);
    assert.equal(result.added, 1);
    assert.equal(engine.count(), 1);
    assert.ok(engine.getDocument(doc.id));
  });

  test('updates document when hash changes', () => {
    const doc1 = createDocument('google_drive', 'file-1', 'Doc', 'Content A', 'author', 'org-1');
    engine.ingest([doc1]);
    const doc2 = { ...doc1, content: 'Content B', hash: computeHash('Content B') };
    const result = engine.ingest([doc2]);
    assert.equal(result.updated, 1);
    assert.equal(result.added, 0);
  });

  test('getDocumentsByOrganization filters by org', () => {
    engine.ingest([createDocument('google_drive', 'f1', 'A', 'content', 'a', 'org-1')]);
    engine.ingest([createDocument('google_drive', 'f2', 'B', 'content', 'b', 'org-2')]);
    assert.equal(engine.getDocumentsByOrganization('org-1').length, 1);
    assert.equal(engine.getDocumentsByOrganization('org-2').length, 1);
  });

  test('getDocumentsBySource filters by source', () => {
    engine.ingest([createDocument('google_drive', 'f1', 'A', 'content', 'a', 'org-1')]);
    engine.ingest([createDocument('github', 'f2', 'B', 'content', 'b', 'org-1')]);
    assert.equal(engine.getDocumentsBySource('google_drive').length, 1);
    assert.equal(engine.getDocumentsBySource('github').length, 1);
  });

  test('removeDocument removes from tracking', () => {
    const doc = createDocument('google_drive', 'f1', 'A', 'content', 'a', 'org-1');
    engine.ingest([doc]);
    assert.equal(engine.removeDocument(doc.id), true);
    assert.equal(engine.getDocument(doc.id), undefined);
  });

  test('document preserves all required fields', () => {
    const doc = createDocument('github', 'repo-1', 'README', 'content', 'dev', 'org-1',
      { visibility: 'private', allowedUserIds: ['user-1'] },
      { repo: 'my-repo' },
    );
    engine.ingest([doc]);
    const stored = engine.getDocument(doc.id)!;
    assert.equal(stored.source, 'github');
    assert.equal(stored.author, 'dev');
    assert.equal(stored.organizationId, 'org-1');
    assert.equal(stored.permissions.visibility, 'private');
    assert.ok(stored.hash);
    assert.ok(stored.version);
    assert.equal(stored.metadata.repo, 'my-repo');
  });

  test('ingestFromSource fetches from adapter', () => {
    const adapter = new GoogleDriveAdapter();
    const doc = createDocument('google_drive', 'f1', 'A', 'content', 'a', 'org-1');
    adapter.addDocument(doc);
    engine.registerAdapter(adapter);
    const fetched = engine.ingestFromSource('google_drive');
    assert.equal(fetched.length, 1);
    assert.equal(engine.count(), 1);
  });

  test('hash computation is deterministic', () => {
    assert.equal(computeHash('test'), computeHash('test'));
    assert.notEqual(computeHash('test'), computeHash('different'));
  });
});

describe('Source Adapters', () => {
  test('GoogleDriveAdapter fetches documents', () => {
    const adapter = new GoogleDriveAdapter();
    const doc = createDocument('google_drive', 'f1', 'A', 'content', 'a', 'org-1');
    adapter.addDocument(doc);
    assert.equal(adapter.fetch().length, 1);
    assert.equal(adapter.fetch('2099-01-01').length, 0);
  });

  test('GitHubAdapter fetches documents', () => {
    const adapter = new GitHubAdapter();
    const doc = createDocument('github', 'r1', 'README', 'content', 'a', 'org-1');
    adapter.addDocument(doc);
    assert.equal(adapter.fetch().length, 1);
  });
});
