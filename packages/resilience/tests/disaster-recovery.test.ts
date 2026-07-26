import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { DisasterRecoveryManager, createDisasterRecoveryConfig, createRecoveryPlan } from '../src/index.js';

describe('DisasterRecoveryManager', () => {
  let mgr: DisasterRecoveryManager;

  beforeEach(() => {
    mgr = new DisasterRecoveryManager();
  });

  test('creates a recovery plan', () => {
    const config = createDisasterRecoveryConfig({ rpoSeconds: 60, rtoSeconds: 300, mode: 'automatic' });
    const plan = mgr.createPlan(config);
    assert.ok(plan.id);
    assert.equal(plan.rpoSeconds, 60);
    assert.equal(plan.rtoSeconds, 300);
    assert.ok(plan.steps.length > 0);
  });

  test('automatic mode creates 5 steps', () => {
    const config = createDisasterRecoveryConfig({ mode: 'automatic' });
    const plan = mgr.createPlan(config);
    assert.equal(plan.steps.length, 5);
  });

  test('manual mode adds approval step', () => {
    const config = createDisasterRecoveryConfig({ mode: 'manual' });
    const plan = mgr.createPlan(config);
    assert.equal(plan.steps.length, 6);
    assert.equal(plan.steps[0].name, 'Await Manual Approval');
  });

  test('executePlan completes all steps', () => {
    const config = createDisasterRecoveryConfig({ rpoSeconds: 60, rtoSeconds: 300 });
    const plan = mgr.createPlan(config);
    const result = mgr.executePlan(plan.id);
    assert.equal(result.success, true);
    assert.equal(result.completedSteps, plan.steps.length);
    assert.equal(result.totalSteps, plan.steps.length);
  });

  test('executePlan for missing plan returns failure', () => {
    const result = mgr.executePlan('nonexistent');
    assert.equal(result.success, false);
  });

  test('validateRecovery checks all steps completed', () => {
    const config = createDisasterRecoveryConfig();
    const plan = mgr.createPlan(config);
    mgr.executePlan(plan.id);
    assert.equal(mgr.validateRecovery(plan.id), true);
  });

  test('validateRecovery returns false for incomplete plan', () => {
    const config = createDisasterRecoveryConfig();
    const plan = mgr.createPlan(config);
    assert.equal(mgr.validateRecovery(plan.id), false);
  });

  test('getConfig returns current config', () => {
    const config = mgr.getConfig();
    assert.ok(config.rpoSeconds > 0);
    assert.ok(config.rtoSeconds > 0);
  });

  test('updateConfig changes values', () => {
    mgr.updateConfig({ rpoSeconds: 30, rtoSeconds: 120 });
    const config = mgr.getConfig();
    assert.equal(config.rpoSeconds, 30);
    assert.equal(config.rtoSeconds, 120);
  });

  test('getPlans returns all plans', () => {
    mgr.createPlan(createDisasterRecoveryConfig());
    mgr.createPlan(createDisasterRecoveryConfig({ mode: 'manual' }));
    assert.equal(mgr.getPlans().length, 2);
  });

  test('configurable RPO and RTO', () => {
    const config = createDisasterRecoveryConfig({ rpoSeconds: 15, rtoSeconds: 45 });
    const plan = mgr.createPlan(config);
    assert.equal(plan.rpoSeconds, 15);
    assert.equal(plan.rtoSeconds, 45);
  });

  test('createRecoveryPlan helper creates a plan', () => {
    const plan = createRecoveryPlan(30, 60, 'automatic');
    assert.equal(plan.rpoSeconds, 30);
    assert.equal(plan.rtoSeconds, 60);
    assert.equal(plan.mode, 'automatic');
    assert.ok(plan.steps.length >= 5);
  });

  test('execution result checks RPO and RTO', () => {
    const config = createDisasterRecoveryConfig({ rpoSeconds: 60, rtoSeconds: 300 });
    const plan = mgr.createPlan(config);
    const result = mgr.executePlan(plan.id);
    assert.equal(typeof result.rpoMet, 'boolean');
    assert.equal(typeof result.rtoMet, 'boolean');
  });
});
