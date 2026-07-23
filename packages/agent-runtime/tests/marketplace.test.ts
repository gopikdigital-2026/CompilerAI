import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgentRuntime, type IMarketplaceAdapter } from '../src/index.ts';
import { makeIdGenerator, makeClock, createTestProfile, createSuccessExecutor, createTaskInput } from './helpers.ts';

class TestMarketplaceAdapter implements IMarketplaceAdapter {
  private readonly tools = new Map<string, { id: string; name: string; version: string; capabilities: string[] }>();

  installTool(tool: { id: string; name: string; version: string; capabilities: string[] }, _orgId: string): void {
    this.tools.set(tool.id, tool);
  }

  getInstalledTools(_organizationId: string): Array<{ id: string; name: string; version: string; capabilities: string[] }> {
    return Array.from(this.tools.values());
  }

  checkToolAvailability(toolId: string, _organizationId: string): boolean {
    return this.tools.has(toolId);
  }

  getToolCapabilities(toolId: string, _organizationId: string): string[] {
    return this.tools.get(toolId)?.capabilities ?? [];
  }
}

describe('Marketplace integration', () => {
  let runtime: AgentRuntime;
  let marketplace: TestMarketplaceAdapter;

  beforeEach(() => {
    marketplace = new TestMarketplaceAdapter();
    marketplace.installTool({
      id: 'data-enricher', name: 'Data Enricher', version: '1.0.0',
      capabilities: ['enrichment', 'data-lookup'],
    }, 'org-1');
    runtime = new AgentRuntime({
      idGenerator: makeIdGenerator(),
      clock: makeClock(),
      marketplace,
    });
  });

  it('should check tool availability via marketplace adapter', () => {
    assert.ok(runtime.marketplace.checkToolAvailability('data-enricher', 'org-1'));
    assert.equal(runtime.marketplace.checkToolAvailability('non-existent', 'org-1'), false);
  });

  it('should get tool capabilities via marketplace adapter', () => {
    const caps = runtime.marketplace.getToolCapabilities('data-enricher', 'org-1');
    assert.ok(caps.includes('enrichment'));
    assert.ok(caps.includes('data-lookup'));
  });

  it('should list installed tools for organization', () => {
    const tools = runtime.marketplace.getInstalledTools('org-1');
    assert.equal(tools.length, 1);
    assert.equal(tools[0]!.id, 'data-enricher');
  });

  it('should execute with marketplace tools available', async () => {
    runtime.registerAgent(
      createTestProfile({ id: 'agent-a', capabilities: ['test-capability'], compatibleTools: ['data-enricher'] }),
      'org-1',
    );
    const execution = runtime.createExecution({
      organizationId: 'org-1', triggeredBy: 'test',
      tasks: [{ ...createTaskInput({ title: 'T' }) }], edges: [],
    });
    const result = await runtime.run(execution, createSuccessExecutor());
    assert.equal(result.status, 'completed');
  });
});
