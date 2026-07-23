import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockApiAdapter } from '../src/api/MockApiAdapter.ts';

describe('Approvals — listing and decisions', () => {
  it('should load approvals via the mock adapter', async () => {
    const adapter = new MockApiAdapter();
    const approvals = await adapter.getApprovals();
    assert.ok(approvals.length > 0, 'should return approvals');
  });

  it('should filter approvals by status', async () => {
    const adapter = new MockApiAdapter();
    const pending = await adapter.getApprovals({ status: 'PENDING' });
    pending.forEach((a) => {
      assert.equal(a.status, 'PENDING', 'all results should be PENDING');
    });
  });

  it('should have approvals with risk levels', async () => {
    const adapter = new MockApiAdapter();
    const approvals = await adapter.getApprovals();
    const validRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    approvals.forEach((a) => {
      assert.ok(validRisks.includes(a.riskLevel), `approval should have valid risk level: ${a.riskLevel}`);
      assert.ok(a.executionId, 'approval should have executionId');
      assert.ok(a.nodeLabel, 'approval should have nodeLabel');
    });
  });

  it('should decide an approval (approve)', async () => {
    const adapter = new MockApiAdapter();
    const result = await adapter.decideApproval('appr_test_001', 'approve', 'Looks good');
    assert.equal(result.status, 'APPROVED');
    assert.equal(result.comment, 'Looks good');
    assert.equal(result.approvalId, 'appr_test_001');
  });

  it('should decide an approval (reject)', async () => {
    const adapter = new MockApiAdapter();
    const result = await adapter.decideApproval('appr_test_002', 'reject', 'Too risky');
    assert.equal(result.status, 'REJECTED');
    assert.equal(result.comment, 'Too risky');
    assert.equal(result.reviewedBy, 'dashboard-user');
  });
});
