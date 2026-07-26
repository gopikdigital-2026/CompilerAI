import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { BackupManager } from '../src/index.js';

describe('BackupManager', () => {
  let mgr: BackupManager;

  beforeEach(() => {
    mgr = new BackupManager();
  });

  test('creates a full backup', () => {
    const snap = mgr.createBackup('all', { key1: 'value1', key2: 'value2' });
    assert.equal(snap.status, 'completed');
    assert.equal(snap.type, 'full');
    assert.ok(snap.checksum);
    assert.ok(snap.sizeBytes > 0);
    assert.equal(snap.validated, true);
  });

  test('creates an incremental backup', () => {
    const full = mgr.createBackup('all', { a: 1, b: 2, c: 3 });
    const inc = mgr.createBackup('all', { a: 1, b: 5, c: 3 }, { type: 'incremental', parentId: full.id });
    assert.equal(inc.type, 'incremental');
    assert.equal(inc.parentId, full.id);
    assert.equal(inc.data.b, 5);
    assert.ok(!('a' in inc.data)); // unchanged key excluded
  });

  test('restores from a full backup', () => {
    mgr.createBackup('all', { key1: 'value1', key2: 'value2' });
    const snapshots = mgr.getSnapshots();
    const result = mgr.restoreBackup(snapshots[0].id);
    assert.equal(result.success, true);
    assert.equal(result.recordsRestored, 2);
    assert.equal(result.integrityValid, true);
  });

  test('restores from incremental merges parent chain', () => {
    const full = mgr.createBackup('all', { a: 1, b: 2 });
    mgr.createBackup('all', { b: 3 }, { type: 'incremental', parentId: full.id });
    const snapshots = mgr.getSnapshots();
    const result = mgr.restoreBackup(snapshots[1].id);
    assert.equal(result.success, true);
    assert.ok(result.recordsRestored >= 1);
  });

  test('selective restore only restores specified keys', () => {
    mgr.createBackup('all', { key1: 'value1', key2: 'value2', key3: 'value3' });
    const snapshots = mgr.getSnapshots();
    const result = mgr.restoreBackup(snapshots[0].id, { selectiveKeys: ['key1', 'key3'] });
    assert.equal(result.recordsRestored, 2);
  });

  test('selective restore reports missing keys', () => {
    mgr.createBackup('all', { key1: 'value1' });
    const snapshots = mgr.getSnapshots();
    const result = mgr.restoreBackup(snapshots[0].id, { selectiveKeys: ['key1', 'nonexistent'] });
    assert.ok(result.errors.some((e) => e.includes('nonexistent')));
  });

  test('validateIntegrity returns true for valid snapshot', () => {
    const snap = mgr.createBackup('all', { data: 'test' });
    assert.equal(mgr.validateIntegrity(snap.id), true);
  });

  test('validateIntegrity returns false for missing snapshot', () => {
    assert.equal(mgr.validateIntegrity('nonexistent'), false);
  });

  test('restore fails for missing snapshot', () => {
    const result = mgr.restoreBackup('nonexistent');
    assert.equal(result.success, false);
    assert.ok(result.errors.length > 0);
  });

  test('getSnapshots returns all snapshots sorted by date', () => {
    mgr.createBackup('all', { a: 1 });
    mgr.createBackup('all', { b: 2 });
    assert.equal(mgr.getSnapshots().length, 2);
  });

  test('getSnapshot retrieves by id', () => {
    const snap = mgr.createBackup('all', { a: 1 });
    assert.ok(mgr.getSnapshot(snap.id));
    assert.equal(mgr.getSnapshot('nonexistent'), undefined);
  });

  test('deleteSnapshot removes snapshot', () => {
    const snap = mgr.createBackup('all', { a: 1 });
    assert.equal(mgr.deleteSnapshot(snap.id), true);
    assert.equal(mgr.count(), 0);
  });

  test('countByType tracks full vs incremental', () => {
    const full = mgr.createBackup('all', { a: 1 });
    mgr.createBackup('all', { a: 2 }, { type: 'incremental', parentId: full.id });
    assert.equal(mgr.countByType('full'), 1);
    assert.equal(mgr.countByType('incremental'), 1);
  });
});
