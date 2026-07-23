import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MockApiAdapter } from '../src/api/MockApiAdapter.ts';

describe('Executions — loading and filtering', () => {
  it('should load executions via the mock adapter', async () => {
    const adapter = new MockApiAdapter();
    const executions = await adapter.getExecutions();
    assert.ok(executions.length > 0, 'should return executions');
    assert.ok(executions.length <= 100, 'should cap at 100');
  });

  it('should filter by status', async () => {
    const adapter = new MockApiAdapter();
    const running = await adapter.getExecutions({ status: 'RUNNING' });
    running.forEach((e) => {
      assert.equal(e.status, 'RUNNING', 'all results should be RUNNING');
    });
  });

  it('should filter by organization ID', async () => {
    const adapter = new MockApiAdapter();
    const all = await adapter.getExecutions();
    const firstOrg = all[0]!.organizationId;
    const filtered = await adapter.getExecutions({ organizationId: firstOrg });
    filtered.forEach((e) => {
      assert.equal(e.organizationId, firstOrg, 'all results should belong to the filtered org');
    });
  });

  it('should filter by search query', async () => {
    const adapter = new MockApiAdapter();
    const all = await adapter.getExecutions();
    const searchTerm = all[0]!.workflowName.slice(0, 4).toLowerCase();
    const filtered = await adapter.getExecutions({ search: searchTerm });
    filtered.forEach((e) => {
      const matches =
        e.executionId.toLowerCase().includes(searchTerm) ||
        e.organizationId.toLowerCase().includes(searchTerm) ||
        e.workflowName.toLowerCase().includes(searchTerm);
      assert.ok(matches, `result should match search term: ${e.executionId}`);
    });
  });

  it('should return ALL status when filter is ALL', async () => {
    const adapter = new MockApiAdapter();
    const all = await adapter.getExecutions({ status: 'ALL' });
    const statuses = new Set(all.map((e) => e.status));
    assert.ok(statuses.size > 1, 'ALL filter should return multiple statuses');
  });
});
