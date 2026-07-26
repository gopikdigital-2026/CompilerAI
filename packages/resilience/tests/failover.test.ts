import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { FailoverManager, createFailoverConfig, createInstance } from '../src/index.js';

describe('FailoverManager', () => {
  test('selects active instance by priority', () => {
    const instances = [
      createInstance('i1', 'Primary', 'http://a', 1),
      createInstance('i2', 'Secondary', 'http://b', 2),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    const active = fm.getActiveInstance();
    assert.ok(active);
    // First active instance by priority
    assert.equal(active.priority, 1);
  });

  test('failover switches to next instance', () => {
    const instances = [
      createInstance('i1', 'Primary', 'http://a', 1),
      createInstance('i2', 'Secondary', 'http://b', 2),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    const original = fm.getActiveInstance();
    const event = fm.failover('primary failed');
    assert.ok(event);
    assert.equal(event.fromInstanceId, original!.id);
    assert.notEqual(event.toInstanceId, original!.id);
  });

  test('markFailed triggers failover for active instance', () => {
    const instances = [
      createInstance('i1', 'Primary', 'http://a', 1),
      createInstance('i2', 'Secondary', 'http://b', 2),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    const active = fm.getActiveInstance();
    fm.markFailed(active!.id);
    const newActive = fm.getActiveInstance();
    assert.notEqual(newActive!.id, active!.id);
  });

  test('markRecovered sets instance to standby', () => {
    const instances = [
      createInstance('i1', 'Primary', 'http://a', 1),
      createInstance('i2', 'Secondary', 'http://b', 2),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    fm.markFailed('i1');
    fm.markRecovered('i1');
    const inst = fm.getAllInstances().find((i) => i.id === 'i1');
    assert.equal(inst!.status, 'standby');
  });

  test('records failover events', () => {
    const instances = [
      createInstance('i1', 'A', 'http://a', 1),
      createInstance('i2', 'B', 'http://b', 2),
      createInstance('i3', 'C', 'http://c', 3),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    fm.failover('test 1');
    fm.failover('test 2');
    assert.equal(fm.getFailoverEvents().length, 2);
  });

  test('round_robin strategy cycles through instances', () => {
    const instances = [
      createInstance('i1', 'A', 'http://a', 1),
      createInstance('i2', 'B', 'http://b', 2),
      createInstance('i3', 'C', 'http://c', 3),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances, { loadBalancingStrategy: 'round_robin' }));
    const s1 = fm.selectInstance();
    const s2 = fm.selectInstance();
    assert.ok(s1);
    assert.ok(s2);
    assert.notEqual(s1!.id, s2!.id);
  });

  test('least_load strategy selects highest health score', () => {
    const instances = [
      createInstance('i1', 'A', 'http://a', 1),
      createInstance('i2', 'B', 'http://b', 2),
    ];
    instances[0].healthScore = 80;
    instances[1].healthScore = 95;
    const fm = new FailoverManager(createFailoverConfig(instances, { loadBalancingStrategy: 'least_load' }));
    const selected = fm.selectInstance();
    assert.equal(selected!.id, 'i2');
  });

  test('returns null when no instances available for failover', () => {
    const instances = [createInstance('i1', 'A', 'http://a', 1)];
    const fm = new FailoverManager(createFailoverConfig(instances));
    const event = fm.failover('only instance failed');
    assert.equal(event, null);
  });

  test('countActive and countByStatus', () => {
    const instances = [
      createInstance('i1', 'A', 'http://a', 1),
      createInstance('i2', 'B', 'http://b', 2),
    ];
    const fm = new FailoverManager(createFailoverConfig(instances));
    assert.equal(fm.countActive(), 1);
    assert.equal(fm.countByStatus('standby'), 1);
  });
});
