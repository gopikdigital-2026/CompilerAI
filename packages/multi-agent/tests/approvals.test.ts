import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { ApprovalEngine } from '../src/approvals/ApprovalEngine.js';

describe('ApprovalEngine', () => {
  let engine: ApprovalEngine;

  beforeEach(() => {
    engine = new ApprovalEngine();
  });

  test('creates a pending approval request', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 'task-1', agentId: 'finance',
      action: 'payment', description: 'Process $10,000 payment', riskLevel: 'high',
    });
    assert.equal(approval.state, 'pending');
    assert.ok(approval.id.startsWith('approval-'));
    assert.ok(approval.expiresAt);
  });

  test('approves a pending request', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 'task-1', agentId: 'devops',
      action: 'deployment', description: 'Deploy to production', riskLevel: 'critical',
    });
    const decided = engine.approve(approval.id, 'ceo', 'Approved by CEO');
    assert.equal(decided.state, 'approved');
    assert.equal(decided.decidedBy, 'ceo');
    assert.equal(decided.reason, 'Approved by CEO');
  });

  test('rejects a pending request', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 'task-1', agentId: 'finance',
      action: 'payment', description: 'Process payment', riskLevel: 'high',
    });
    const decided = engine.reject(approval.id, 'ceo', 'Too expensive');
    assert.equal(decided.state, 'rejected');
    assert.equal(decided.reason, 'Too expensive');
  });

  test('throws when approving non-existent request', () => {
    assert.throws(() => engine.approve('nonexistent', 'user'));
  });

  test('throws when approving already decided request', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 'task-1', agentId: 'devops',
      action: 'deployment', description: 'Deploy', riskLevel: 'high',
    });
    engine.approve(approval.id, 'ceo');
    assert.throws(() => engine.approve(approval.id, 'ceo'));
  });

  test('getPending returns only pending approvals', () => {
    const a1 = engine.request({ workflowId: 'wf-1', taskId: 't1', agentId: 'a', action: 'x', description: 'd', riskLevel: 'low' });
    engine.request({ workflowId: 'wf-1', taskId: 't2', agentId: 'a', action: 'y', description: 'd', riskLevel: 'low' });
    engine.approve(a1.id, 'ceo');
    assert.equal(engine.getPending().length, 1);
  });

  test('expireOverdue expires past-due requests', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 't1', agentId: 'a', action: 'x', description: 'd', riskLevel: 'low',
    }, -1); // Already expired
    const expired = engine.expireOverdue();
    assert.equal(expired.length, 1);
    assert.equal(expired[0].id, approval.id);
    assert.equal(expired[0].state, 'expired');
  });

  test('approve sets decidedAt timestamp', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 't1', agentId: 'a', action: 'x', description: 'd', riskLevel: 'low',
    });
    const decided = engine.approve(approval.id, 'ceo');
    assert.ok(decided.decidedAt);
  });

  test('approval has correct expiry time (24h default)', () => {
    const approval = engine.request({
      workflowId: 'wf-1', taskId: 't1', agentId: 'a', action: 'x', description: 'd', riskLevel: 'low',
    });
    const expiryMs = new Date(approval.expiresAt).getTime() - new Date(approval.requestedAt).getTime();
    assert.ok(expiryMs > 23 * 60 * 60 * 1000);
  });

  test('get returns undefined for non-existent id', () => {
    assert.equal(engine.get('nonexistent'), undefined);
  });
});
