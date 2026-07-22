// ─── Memory Intelligence Engine — unit tests ────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/memory/tests/MemoryEngine.test.ts

import assert from 'node:assert/strict';
import { MemoryEngine } from '../services/MemoryEngine';
import { InMemoryMemoryRepository } from '../services/InMemoryMemoryRepository';
import { MemoryExtractor } from '../services/MemoryExtractor';
import { MemoryValidator } from '../services/MemoryValidator';
import { MemoryRanker } from '../services/MemoryRanker';
import { MemoryConsolidator } from '../services/MemoryConsolidator';
import {
  SensitiveDataBlockedError, DuplicateMemoryError,
} from '../errors/MemoryErrors';
import {
  computeContentHash, isExpired, computeExpiry,
} from '../policies/MemoryPolicies';
import { isSensitive } from '../models/MemoryTypes';
import { CompilerIntelligenceOrchestrator } from '../../orchestrator/services/CompilerIntelligenceOrchestrator';
import { DEFAULT_FACTOR_WEIGHTS } from '../../confidence/rules/ConfidenceRules';
import type { CompilerIntelligenceRequest } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { ContextRequest } from '../../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  void Promise.resolve(fn()).then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
}

let idCounter = 0;
const FIXED_CLOCK = () => '2026-01-01T00:00:00.000Z';
function makeMemoryDeps() {
  return {
    idGenerator: () => `mem-${(++idCounter).toString().padStart(4, '0')}`,
    clock: FIXED_CLOCK,
    repository: new InMemoryMemoryRepository(FIXED_CLOCK),
  };
}

let execCounter = 0;
function makeOrchestratorDeps() {
  return {
    idGenerator: () => `exec-${(++execCounter).toString().padStart(4, '0')}`,
    clock: FIXED_CLOCK,
    factorWeights: { ...DEFAULT_FACTOR_WEIGHTS } as Record<string, number>,
  };
}

function mkContextRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    requestId: `req-${Math.random().toString(36).slice(2, 8)}`,
    prompt: 'Analiza por qué ha bajado nuestro margen este mes.',
    organizationId: 'org-acme',
    locale: 'es',
    receivedAt: Date.now(),
    ...overrides,
  };
}

function richMemory(orgId: string): EnterpriseMemorySnapshot {
  return {
    organizationId: orgId, exists: true,
    entries: [
      { key: 'org.sla.responseHours', value: '4h', classification: 'INTERNAL' },
      { key: 'crm.lastOrder.value', value: '€12.400', classification: 'CONFIDENTIAL' },
    ],
  };
}

function mkRequest(overrides: Partial<CompilerIntelligenceRequest> = {}): CompilerIntelligenceRequest {
  const ctxReq = overrides.contextRequest ?? mkContextRequest();
  return {
    contextRequest: ctxReq,
    memory: richMemory(ctxReq.organizationId),
    riskTolerance: 'MEDIUM',
    minimumConfidenceThreshold: 50,
    ...overrides,
  };
}

async function run(): Promise<void> {

  test('1. write — stores entry with all required fields', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    const entry = engine.write({
      organizationId: 'org-1', type: 'WORKING', content: 'Test content',
      source: 'test', confidence: 80, relevance: 70, sensitivity: 'INTERNAL',
      consentGranted: true, tags: ['test'],
    });
    assert.ok(entry.memoryId.length > 0);
    assert.equal(entry.organizationId, 'org-1');
    assert.equal(entry.type, 'WORKING');
    assert.equal(entry.content, 'Test content');
    assert.equal(entry.confidence, 80);
    assert.equal(entry.relevance, 70);
    assert.equal(entry.sensitivity, 'INTERNAL');
    assert.equal(entry.consentGranted, true);
    assert.ok(entry.createdAt.length > 0);
    assert.ok(entry.version.length > 0);
    assert.ok(entry.contentHash.length > 0);
  });

  test('2. retrieve — returns entries for organization', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'A', source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'B', source: 'test', confidence: 60, relevance: 50, sensitivity: 'PUBLIC', consentGranted: true });
    const result = engine.retrieve({ organizationId: 'org-1' });
    assert.equal(result.entries.length, 2);
  });

  test('3. ranking — higher confidence+relevance ranked first', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'low', source: 'test', confidence: 30, relevance: 40, sensitivity: 'PUBLIC', consentGranted: true });
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'high', source: 'test', confidence: 90, relevance: 95, sensitivity: 'PUBLIC', consentGranted: true });
    const result = engine.retrieve({ organizationId: 'org-1' });
    assert.equal(result.entries[0].content, 'high');
    assert.equal(result.entries[1].content, 'low');
  });

  test('4. tenant isolation — org-A cannot see org-B entries', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-A', type: 'ORGANIZATION', content: 'secret A', source: 'test', confidence: 80, relevance: 70, sensitivity: 'INTERNAL', consentGranted: true });
    engine.write({ organizationId: 'org-B', type: 'ORGANIZATION', content: 'secret B', source: 'test', confidence: 80, relevance: 70, sensitivity: 'INTERNAL', consentGranted: true });
    const resultA = engine.retrieve({ organizationId: 'org-A' });
    const resultB = engine.retrieve({ organizationId: 'org-B' });
    assert.equal(resultA.entries.length, 1);
    assert.equal(resultB.entries.length, 1);
    assert.equal(resultA.entries[0].content, 'secret A');
    assert.equal(resultB.entries[0].content, 'secret B');
  });

  test('5. expiration — expired entries removed by lifecycle', () => {
    let clockVal = '2026-01-01T00:00:00.000Z';
    const repo = new InMemoryMemoryRepository(() => clockVal);
    const deps = { idGenerator: () => `mem-${(++idCounter).toString().padStart(4, '0')}`, clock: () => clockVal, repository: repo };
    const engine = new MemoryEngine(deps);
    engine.write({ organizationId: 'org-1', type: 'WORKING', content: 'ephemeral', source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    clockVal = '2026-01-01T00:10:00.000Z';
    const result = engine.runLifecycle();
    assert.ok(result.expired > 0, 'should expire at least one entry');
    const after = engine.retrieve({ organizationId: 'org-1' });
    assert.equal(after.entries.length, 0);
  });

  test('6. duplicates — writing same content twice throws', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'WORKING', content: 'duplicate me', source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    assert.throws(() => engine.write({ organizationId: 'org-1', type: 'WORKING', content: 'duplicate me', source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true }), (err: unknown) => err instanceof DuplicateMemoryError);
  });

  test('7. sensitive data — blocked without consent', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    assert.throws(() => engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'confidential data', source: 'test', confidence: 80, relevance: 70, sensitivity: 'CONFIDENTIAL', consentGranted: false }), (err: unknown) => err instanceof SensitiveDataBlockedError);
  });

  test('8. sensitive data — allowed with consent', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    const entry = engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'confidential data', source: 'test', confidence: 80, relevance: 70, sensitivity: 'CONFIDENTIAL', consentGranted: true });
    assert.equal(entry.sensitivity, 'CONFIDENTIAL');
    assert.equal(entry.consentGranted, true);
  });

  test('9. deletion — removes entry by ID', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    const entry = engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'delete me', source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    assert.ok(engine.delete(entry.memoryId));
    assert.equal(engine.retrieve({ organizationId: 'org-1' }).entries.length, 0);
  });

  test('10. filters — by type, sensitivity, minConfidence', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'WORKING', content: 'w', source: 't', confidence: 90, relevance: 80, sensitivity: 'PUBLIC', consentGranted: true });
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 's', source: 't', confidence: 40, relevance: 30, sensitivity: 'INTERNAL', consentGranted: true });
    const byType = engine.retrieve({ organizationId: 'org-1', types: ['WORKING'] });
    assert.equal(byType.entries.length, 1);
    assert.equal(byType.entries[0].type, 'WORKING');
    const bySensitivity = engine.retrieve({ organizationId: 'org-1', sensitivity: ['PUBLIC'] });
    assert.equal(bySensitivity.entries.length, 1);
    const byConfidence = engine.retrieve({ organizationId: 'org-1', minConfidence: 50 });
    assert.equal(byConfidence.entries.length, 1);
    assert.equal(byConfidence.entries[0].content, 'w');
  });

  test('11. events — MemoryWritten and MemoryRetrieved emitted', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'test', source: 't', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    engine.retrieve({ organizationId: 'org-1' });
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'MemoryWritten'));
    assert.ok(events.some(e => e.eventType === 'MemoryRetrieved'));
  });

  test('12. determinism — same content produces same hash', () => {
    const hash1 = computeContentHash('org-1', 'WORKING', 'test content');
    const hash2 = computeContentHash('org-1', 'WORKING', 'test content');
    assert.equal(hash1, hash2);
    const hash3 = computeContentHash('org-2', 'WORKING', 'test content');
    assert.notEqual(hash1, hash3, 'different org should produce different hash');
  });

  test('13. consolidation — duplicates removed', () => {
    const consolidator = new MemoryConsolidator();
    const makeEntry = (id: string, content: string) => ({
      memoryId: id, organizationId: 'org-1', executionId: null, type: 'WORKING' as const,
      content, source: 'test', confidence: 80, relevance: 70, sensitivity: 'PUBLIC' as const,
      consentGranted: true, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null,
      version: '1.0.0', contentHash: computeContentHash('org-1', 'WORKING', content),
      tags: [], metadata: {},
    });
    const entries = [makeEntry('1', 'dup'), makeEntry('2', 'dup'), makeEntry('3', 'unique')];
    const result = consolidator.consolidate(entries);
    assert.equal(result.consolidated.length, 2);
    assert.equal(result.removed.length, 1);
  });

  test('14. extractor — produces write requests from prompt', () => {
    const extractor = new MemoryExtractor();
    const requests = extractor.extract({ prompt: 'Analiza el margen', organizationId: 'org-1', executionId: 'exec-1' });
    assert.ok(requests.length > 0);
    assert.ok(requests.some(r => r.type === 'WORKING'));
  });

  test('15. extractor — sanitizes sensitive patterns', () => {
    const extractor = new MemoryExtractor();
    const requests = extractor.extract({ prompt: 'Analiza con password=secret123', organizationId: 'org-1' });
    const working = requests.find(r => r.type === 'WORKING')!;
    assert.ok(!working.content.includes('secret123'), 'password must be redacted');
    assert.ok(working.content.includes('[REDACTED]'));
  });

  test('16. validator — rejects invalid entries', () => {
    const validator = new MemoryValidator();
    const badEntry = {
      memoryId: '', organizationId: 'org-1', executionId: null, type: 'WORKING' as const,
      content: '', source: 'test', confidence: 150, relevance: -10, sensitivity: 'PUBLIC' as const,
      consentGranted: true, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null,
      version: '1.0.0', contentHash: '', tags: [], metadata: {},
    };
    const result = validator.validate(badEntry);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  test('17. orchestrator with memory — writes execution memory on finalize', async () => {
    const memDeps = makeMemoryDeps();
    const memory = new MemoryEngine(memDeps);
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), memory });
    await orchestrator.execute(mkRequest());
    const execMemories = memory.retrieve({ organizationId: 'org-acme', types: ['EXECUTION'] });
    assert.ok(execMemories.entries.length > 0, 'should have execution memory');
    assert.ok(execMemories.entries[0].content.includes('Execution'));
  });

  test('18. orchestrator without memory — backward compatible', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeOrchestratorDeps());
    const r = await orchestrator.execute(mkRequest());
    assert.ok(r.executionId.length > 0);
    assert.ok(r.trace.length >= 5);
  });

  test('19. lifecycle stats — counts by type', () => {
    const engine = new MemoryEngine(makeMemoryDeps());
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'a', source: 't', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    engine.write({ organizationId: 'org-1', type: 'ORGANIZATION', content: 'b', source: 't', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true });
    const stats = engine.getLifecycleManager().getStats();
    assert.ok(stats.total >= 2);
    assert.ok(stats.byType['ORGANIZATION'] >= 2);
  });

  test('20. TTL — WORKING gets 5min, ORGANIZATION gets null', () => {
    const now = '2026-01-01T00:00:00.000Z';
    const workingExpiry = computeExpiry('WORKING', now, () => now);
    assert.ok(workingExpiry !== null);
    const orgExpiry = computeExpiry('ORGANIZATION', now, () => now);
    assert.equal(orgExpiry, null);
  });

  test('21. isExpired — checks correctly', () => {
    assert.ok(isExpired({ expiresAt: '2026-01-01T00:00:00.000Z' }, '2026-01-01T00:01:00.000Z'));
    assert.ok(!isExpired({ expiresAt: '2026-01-01T00:10:00.000Z' }, '2026-01-01T00:05:00.000Z'));
    assert.ok(!isExpired({ expiresAt: null }, '2026-01-01T00:00:00.000Z'));
  });

  test('22. isSensitive — classifies correctly', () => {
    assert.ok(isSensitive('CONFIDENTIAL'));
    assert.ok(isSensitive('RESTRICTED'));
    assert.ok(!isSensitive('PUBLIC'));
    assert.ok(!isSensitive('INTERNAL'));
  });

  test('23. repository — deleteByOrganization removes all', () => {
    const repo = new InMemoryMemoryRepository(FIXED_CLOCK);
    repo.save({ memoryId: '1', organizationId: 'org-1', executionId: null, type: 'ORGANIZATION', content: 'test', source: 't', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null, version: '1.0.0', contentHash: computeContentHash('org-1', 'ORGANIZATION', 'test'), tags: [], metadata: {} });
    repo.save({ memoryId: '2', organizationId: 'org-1', executionId: null, type: 'ORGANIZATION', content: 'test2', source: 't', confidence: 80, relevance: 70, sensitivity: 'PUBLIC', consentGranted: true, createdAt: '2026-01-01T00:00:00.000Z', expiresAt: null, version: '1.0.0', contentHash: computeContentHash('org-1', 'ORGANIZATION', 'test2'), tags: [], metadata: {} });
    assert.equal(repo.deleteByOrganization('org-1'), 2);
    assert.equal(repo.findByOrganization('org-1').length, 0);
  });

  test('24. ranker — deterministic ordering with tiebreaker', () => {
    const ranker = new MemoryRanker();
    const makeEntry = (id: string, conf: number, rel: number, created: string) => ({
      memoryId: id, organizationId: 'org-1', executionId: null, type: 'WORKING' as const,
      content: id, source: 't', confidence: conf, relevance: rel, sensitivity: 'PUBLIC' as const,
      consentGranted: true, createdAt: created, expiresAt: null,
      version: '1.0.0', contentHash: id, tags: [], metadata: {},
    });
    const entries = [makeEntry('A', 80, 80, '2026-01-01T00:00:02.000Z'), makeEntry('B', 80, 80, '2026-01-01T00:00:01.000Z')];
    const ranked = ranker.rank(entries);
    assert.equal(ranked[0].memoryId, 'B', 'tiebreaker should prefer earlier createdAt');
  });

  test('25. orchestrator with memory — sensitive data not stored', async () => {
    const memDeps = makeMemoryDeps();
    const memory = new MemoryEngine(memDeps);
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), memory });
    await orchestrator.execute(mkRequest({ contextRequest: mkContextRequest({ prompt: 'Analiza con password=secret123' }) }));
    const allEntries = memory.retrieve({ organizationId: 'org-acme' });
    const serialized = JSON.stringify(allEntries.entries);
    assert.ok(!serialized.includes('secret123'), 'sensitive data must not appear in memory');
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
