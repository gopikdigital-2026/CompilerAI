import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryMarketplaceRepository } from '../src/services/MarketplaceRepository.ts';
import { ToolSearchService } from '../src/services/ToolSearchService.ts';
import { createValidManifest } from './helpers.ts';

describe('ToolSearchService — unit tests', () => {
  function setupRepo(): InMemoryMarketplaceRepository {
    const repo = new InMemoryMarketplaceRepository();
    repo.registerTool(createValidManifest({
      id: 'data-enricher', name: 'Data Enricher',
      capabilities: ['enrichment', 'data-lookup'],
    }));
    repo.registerTool(createValidManifest({
      id: 'ai-scorer', name: 'AI Scorer',
      capabilities: ['scoring', 'evaluation'],
      category: 'ai',
    }));
    repo.registerTool(createValidManifest({
      id: 'security-scanner', name: 'Security Scanner',
      capabilities: ['vulnerability-scan'],
      category: 'security',
      verified: false,
    }));
    return repo;
  }

  it('should search by text and return scored results', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ text: 'enricher' });
    assert.ok(results.length > 0);
    assert.equal(results[0]!.tool.id, 'data-enricher');
    assert.ok(results[0]!.score > 0);
  });

  it('should filter by category', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ category: 'ai' });
    assert.equal(results.length, 1);
    assert.equal(results[0]!.tool.id, 'ai-scorer');
  });

  it('should filter by verifiedOnly', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ verifiedOnly: true });
    assert.ok(results.every((r) => r.tool.verified));
    assert.equal(results.length, 2);
  });

  it('should filter by runtime', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ runtime: 'node' });
    assert.ok(results.every((r) => r.tool.runtimeCompatibility.includes('node')));
  });

  it('should support pagination', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const page1 = service.search({ limit: 1, offset: 0 });
    const page2 = service.search({ limit: 1, offset: 1 });
    assert.equal(page1.length, 1);
    assert.equal(page2.length, 1);
    assert.notEqual(page1[0]!.tool.id, page2[0]!.tool.id);
  });

  it('should sort by name', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ sortBy: 'name' });
    assert.ok(results[0]!.tool.name.localeCompare(results[1]!.tool.name) <= 0);
  });

  it('should return suggestions', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const suggestions = service.suggest('sec');
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.some((s) => s.id === 'security-scanner'));
  });

  it('should return empty for no matches', () => {
    const repo = setupRepo();
    const service = new ToolSearchService(repo);
    const results = service.search({ text: 'nonexistent-tool-xyz' });
    assert.equal(results.length, 0);
  });
});
