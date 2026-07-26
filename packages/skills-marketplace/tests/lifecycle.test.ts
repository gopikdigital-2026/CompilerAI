import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { LifecycleManager } from '../src/lifecycle/LifecycleManager.js';

describe('LifecycleManager', () => {
  test('records and retrieves events', () => {
    const mgr = new LifecycleManager();
    mgr.recordEvent({ type: 'install', skillId: 's1', version: '1.0.0', timestamp: '' });
    mgr.recordEvent({ type: 'activate', skillId: 's1', version: '1.0.0', timestamp: '' });
    assert.equal(mgr.getEvents().length, 2);
  });

  test('filters events by skill', () => {
    const mgr = new LifecycleManager();
    mgr.recordEvent({ type: 'install', skillId: 's1', version: '1.0.0', timestamp: '' });
    mgr.recordEvent({ type: 'install', skillId: 's2', version: '1.0.0', timestamp: '' });
    assert.equal(mgr.getEvents('s1').length, 1);
  });

  test('filters events by type', () => {
    const mgr = new LifecycleManager();
    mgr.recordEvent({ type: 'install', skillId: 's1', version: '1.0.0', timestamp: '' });
    mgr.recordEvent({ type: 'activate', skillId: 's1', version: '1.0.0', timestamp: '' });
    assert.equal(mgr.getEventsByType('install').length, 1);
    assert.equal(mgr.getEventsByType('activate').length, 1);
  });

  test('all 5 lifecycle event types are supported', () => {
    const mgr = new LifecycleManager();
    const types = ['install', 'activate', 'update', 'deactivate', 'uninstall'] as const;
    for (const type of types) {
      mgr.recordEvent({ type, skillId: 's1', version: '1.0.0', timestamp: '' });
    }
    assert.equal(mgr.getEvents().length, 5);
  });

  test('clear removes all events', () => {
    const mgr = new LifecycleManager();
    mgr.recordEvent({ type: 'install', skillId: 's1', version: '1.0.0', timestamp: '' });
    mgr.clear();
    assert.equal(mgr.getEvents().length, 0);
  });
});
