// ─── Learning Engine — unit tests ───────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/learning/tests/LearningEngine.test.ts

import assert from 'node:assert/strict';
import { LearningEngine } from '../services/LearningEngine';
import { OutcomeEvaluator } from '../services/OutcomeEvaluator';
import { FeedbackProcessor } from '../services/FeedbackProcessor';
import { PatternExtractor } from '../services/PatternExtractor';
import { RecommendationGenerator } from '../services/RecommendationGenerator';
import { LearningValidator } from '../services/LearningValidator';
import { InMemoryLearningRepository } from '../services/InMemoryLearningRepository';
import {
  RecommendationNotApprovedError, RecommendationAlreadyProcessedError,
} from '../errors/LearningErrors';
import {
  requiresHumanApproval, checkTenantIsolation, canApprove,
  isValidStatusTransition, isRegression, nextVersion,
} from '../policies/LearningPolicies';
import type { LearningInput } from '../models/LearningInput';
import type { LearningRecord } from '../models/LearningRecord';

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
function makeDeps() {
  return {
    idGenerator: () => `lid-${(++idCounter).toString().padStart(4, '0')}`,
    clock: FIXED_CLOCK,
  };
}

function makeInput(overrides: Partial<LearningInput> = {}): LearningInput {
  return {
    inputId: `in-${++idCounter}`,
    organizationId: 'org-acme',
    source: 'EXECUTION_RESULT',
    triggerId: `exec-${idCounter}`,
    data: { success: true, stepsSucceeded: 3, stepsFailed: 0 },
    feedbackText: null,
    feedbackRating: null,
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function run(): Promise<void> {

  // ── Feedback processing ───────────────────────────────────────────────────────

  test('1. feedback — processes positive feedback', () => {
    const processor = new FeedbackProcessor(() => `fid-${++idCounter}`, FIXED_CLOCK);
    const entry = processor.process({
      organizationId: 'org-1', triggerId: 'exec-1',
      text: 'This was excellent and very helpful', rating: 'positive',
    });
    assert.equal(entry.rating, 'positive');
    assert.ok(entry.sentimentScore > 0, 'positive feedback should have positive sentiment');
    assert.ok(entry.keywords.length > 0);
    assert.ok(entry.keywords.includes('excellent'));
  });

  test('2. feedback — processes negative feedback', () => {
    const processor = new FeedbackProcessor(() => `fid-${++idCounter}`, FIXED_CLOCK);
    const entry = processor.process({
      organizationId: 'org-1', triggerId: 'exec-1',
      text: 'This was terrible and wrong', rating: 'negative',
    });
    assert.equal(entry.rating, 'negative');
    assert.ok(entry.sentimentScore < 0, 'negative feedback should have negative sentiment');
  });

  test('3. feedback — extracts keywords, excludes stop words', () => {
    const processor = new FeedbackProcessor(() => `fid-${++idCounter}`, FIXED_CLOCK);
    const entry = processor.process({
      organizationId: 'org-1', triggerId: 'exec-1',
      text: 'the result was accurate and helpful', rating: 'positive',
    });
    assert.ok(!entry.keywords.includes('the'), 'stop words should be excluded');
    assert.ok(entry.keywords.includes('accurate'));
    assert.ok(entry.keywords.includes('helpful'));
  });

  // ── Outcome evaluation ────────────────────────────────────────────────────────

  test('4. outcome — evaluates successful execution', () => {
    const evaluator = new OutcomeEvaluator(() => `oid-${++idCounter}`, FIXED_CLOCK);
    const eval_ = evaluator.evaluate({
      executionId: 'exec-1', organizationId: 'org-1',
      success: true, stepsSucceeded: 3, stepsFailed: 0,
      rollbackTriggered: false, durationMs: 5000,
    });
    assert.equal(eval_.success, true);
    assert.equal(eval_.completionRatio, 1);
    assert.ok(eval_.learnings.length > 0);
  });

  test('5. outcome — evaluates partial failure', () => {
    const evaluator = new OutcomeEvaluator(() => `oid-${++idCounter}`, FIXED_CLOCK);
    const eval_ = evaluator.evaluate({
      executionId: 'exec-1', organizationId: 'org-1',
      success: false, stepsSucceeded: 2, stepsFailed: 1,
      rollbackTriggered: true, durationMs: 8000,
    });
    assert.equal(eval_.success, false);
    assert.ok(eval_.completionRatio < 1);
    assert.ok(eval_.learnings.some(l => l.includes('Partial failure')));
    assert.ok(eval_.learnings.some(l => l.includes('Rollback')));
  });

  test('6. outcome — evaluates complete failure', () => {
    const evaluator = new OutcomeEvaluator(() => `oid-${++idCounter}`, FIXED_CLOCK);
    const eval_ = evaluator.evaluate({
      executionId: 'exec-1', organizationId: 'org-1',
      success: false, stepsSucceeded: 0, stepsFailed: 3,
      rollbackTriggered: false, durationMs: 3000,
    });
    assert.equal(eval_.success, false);
    assert.ok(eval_.learnings.some(l => l.includes('Complete failure')));
  });

  // ── Pattern extraction ────────────────────────────────────────────────────────

  test('7. patterns — detects success pattern', () => {
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', data: { success: true } }),
      makeInput({ inputId: 'i2', data: { success: true } }),
      makeInput({ inputId: 'i3', data: { success: true } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    assert.ok(patterns.some(p => p.type === 'SUCCESS'), 'should detect success pattern');
  });

  test('8. patterns — detects failure pattern', () => {
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    assert.ok(patterns.some(p => p.type === 'FAILURE'), 'should detect failure pattern');
  });

  test('9. patterns — detects regression from confidence trend', () => {
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', source: 'CONFIDENCE', data: { score: 80 } }),
      makeInput({ inputId: 'i2', source: 'CONFIDENCE', data: { score: 60 } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    assert.ok(patterns.some(p => p.type === 'REGRESSION'), 'should detect confidence regression');
  });

  test('10. patterns — detects improvement from confidence trend', () => {
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', source: 'CONFIDENCE', data: { score: 50 } }),
      makeInput({ inputId: 'i2', source: 'CONFIDENCE', data: { score: 80 } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    assert.ok(patterns.some(p => p.type === 'IMPROVEMENT'), 'should detect improvement');
  });

  // ── Recommendation generation ─────────────────────────────────────────────────

  test('11. recommendations — all start as PENDING', () => {
    const gen = new RecommendationGenerator(() => `rid-${++idCounter}`, FIXED_CLOCK);
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    const recs = gen.generate(patterns, 'org-acme');
    assert.ok(recs.length > 0);
    for (const rec of recs) {
      assert.equal(rec.status, 'PENDING', 'all recommendations must start as PENDING');
    }
  });

  test('12. recommendations — failure generates HIGH priority', () => {
    const gen = new RecommendationGenerator(() => `rid-${++idCounter}`, FIXED_CLOCK);
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    const recs = gen.generate(patterns, 'org-acme');
    const failureRec = recs.find(r => r.title.includes('failure'));
    assert.ok(failureRec);
    assert.equal(failureRec!.priority, 'HIGH');
  });

  test('13. recommendations — regression generates CRITICAL priority', () => {
    const gen = new RecommendationGenerator(() => `rid-${++idCounter}`, FIXED_CLOCK);
    const extractor = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', source: 'CONFIDENCE', data: { score: 80 } }),
      makeInput({ inputId: 'i2', source: 'CONFIDENCE', data: { score: 60 } }),
    ];
    const patterns = extractor.extract(inputs, 'org-acme');
    const recs = gen.generate(patterns, 'org-acme');
    const regressionRec = recs.find(r => r.title.includes('regression'));
    assert.ok(regressionRec);
    assert.equal(regressionRec!.priority, 'CRITICAL');
  });

  // ── Approval workflow ─────────────────────────────────────────────────────────

  test('14. approval — approve changes status to APPROVED', () => {
    const engine = new LearningEngine(makeDeps());
    const record = engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    assert.ok(record.recommendations.length > 0);
    const recId = record.recommendations[0].recommendationId;
    const approved = engine.approveRecommendation(recId, 'reviewer-1', 'Looks good');
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.reviewedBy, 'reviewer-1');
    assert.equal(approved.reviewComment, 'Looks good');
  });

  test('15. rejection — reject changes status to REJECTED', () => {
    const engine = new LearningEngine(makeDeps());
    const record = engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    const recId = record.recommendations[0].recommendationId;
    const rejected = engine.rejectRecommendation(recId, 'reviewer-1', 'Not applicable');
    assert.equal(rejected.status, 'REJECTED');
  });

  test('16. rejection — cannot approve already approved recommendation', () => {
    const engine = new LearningEngine(makeDeps());
    const record = engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    const recId = record.recommendations[0].recommendationId;
    engine.approveRecommendation(recId, 'reviewer-1', 'Approved');
    assert.throws(
      () => engine.approveRecommendation(recId, 'reviewer-2', 'Try again'),
      (err: unknown) => err instanceof RecommendationAlreadyProcessedError,
    );
  });

  test('17. approval — approving non-existent recommendation throws', () => {
    const engine = new LearningEngine(makeDeps());
    assert.throws(
      () => engine.approveRecommendation('nonexistent', 'reviewer-1', 'comment'),
      (err: unknown) => err instanceof RecommendationNotApprovedError,
    );
  });

  // ── Tenant isolation ──────────────────────────────────────────────────────────

  test('18. isolation — org A cannot see org B records', () => {
    const engine = new LearningEngine(makeDeps());
    engine.learn([makeInput({ inputId: 'i1', organizationId: 'org-A' })]);
    engine.learn([makeInput({ inputId: 'i2', organizationId: 'org-B' })]);
    const recordsA = engine.getRecords('org-A');
    const recordsB = engine.getRecords('org-B');
    assert.ok(recordsA.every(r => r.organizationId === 'org-A'));
    assert.ok(recordsB.every(r => r.organizationId === 'org-B'));
    assert.equal(recordsA.length, 1);
    assert.equal(recordsB.length, 1);
  });

  test('19. isolation — checkTenantIsolation policy', () => {
    const record: LearningRecord = {
      recordId: 'r1', organizationId: 'org-A', source: 'EXECUTION_RESULT',
      triggerId: 't1', patterns: [], recommendations: [], status: 'PENDING',
      createdAt: '2026-01-01', updatedAt: '2026-01-01', version: 1, metadata: {},
    };
    assert.ok(checkTenantIsolation(record, 'org-A'));
    assert.ok(!checkTenantIsolation(record, 'org-B'));
  });

  // ── Versioning ────────────────────────────────────────────────────────────────

  test('20. versioning — record version increments on approval', () => {
    const engine = new LearningEngine(makeDeps());
    const record = engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    const initialVersion = record.version;
    engine.approveRecommendation(record.recommendations[0].recommendationId, 'reviewer-1', 'ok');
    const updated = engine.getRecords('org-acme').find(r => r.recordId === record.recordId)!;
    assert.ok(updated.version > initialVersion, 'version should increment');
  });

  test('21. versioning — nextVersion increments by 1', () => {
    assert.equal(nextVersion(1), 2);
    assert.equal(nextVersion(5), 6);
  });

  // ── Determinism ───────────────────────────────────────────────────────────────

  test('22. determinism — same inputs produce same pattern types', () => {
    const extractor1 = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const extractor2 = new PatternExtractor(() => `pid-${++idCounter}`, FIXED_CLOCK);
    const inputs = [
      makeInput({ inputId: 'i1', data: { success: true } }),
      makeInput({ inputId: 'i2', data: { success: true } }),
    ];
    const p1 = extractor1.extract(inputs, 'org-acme');
    const p2 = extractor2.extract(inputs, 'org-acme');
    assert.equal(p1.length, p2.length);
    assert.equal(p1[0].type, p2[0].type);
  });

  // ── Policies ──────────────────────────────────────────────────────────────────

  test('23. policy — requiresHumanApproval for PENDING', () => {
    const rec = { recommendationId: 'r1', status: 'PENDING' } as never;
    assert.ok(requiresHumanApproval(rec));
  });

  test('24. policy — canApprove only for PENDING', () => {
    assert.ok(canApprove({ status: 'PENDING' } as never));
    assert.ok(!canApprove({ status: 'APPROVED' } as never));
  });

  test('25. policy — isValidStatusTransition', () => {
    assert.ok(isValidStatusTransition('PENDING', 'APPROVED'));
    assert.ok(isValidStatusTransition('PENDING', 'REJECTED'));
    assert.ok(isValidStatusTransition('APPROVED', 'APPLIED'));
    assert.ok(!isValidStatusTransition('APPLIED', 'PENDING'));
    assert.ok(!isValidStatusTransition('REJECTED', 'APPROVED'));
  });

  test('26. policy — isRegression detects confidence drop', () => {
    assert.ok(isRegression(60, 80, 10));
    assert.ok(!isRegression(75, 80, 10));
    assert.ok(!isRegression(80, 60, 10));
  });

  // ── No auto-modification of models ────────────────────────────────────────────

  test('27. no auto-modification — recommendations are proposals only', () => {
    const engine = new LearningEngine(makeDeps());
    const record = engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    for (const rec of record.recommendations) {
      assert.equal(rec.status, 'PENDING', 'recommendations must not be auto-applied');
      assert.ok(rec.proposedChange, 'must have proposedChange');
      assert.ok(typeof rec.proposedChange === 'object');
    }
  });

  // ── Events ────────────────────────────────────────────────────────────────────

  test('28. events — PatternDetected and RecommendationGenerated emitted', () => {
    const engine = new LearningEngine(makeDeps());
    engine.learn([
      makeInput({ inputId: 'i1', data: { success: false } }),
      makeInput({ inputId: 'i2', data: { success: false } }),
    ]);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'PatternDetected'));
    assert.ok(events.some(e => e.eventType === 'RecommendationGenerated'));
    assert.ok(events.some(e => e.eventType === 'LearningRecordStored'));
  });

  // ── Repository ────────────────────────────────────────────────────────────────

  test('29. repository — save and find by ID', () => {
    const repo = new InMemoryLearningRepository();
    const record: LearningRecord = {
      recordId: 'r1', organizationId: 'org-1', source: 'EXECUTION_RESULT',
      triggerId: 't1', patterns: [], recommendations: [], status: 'PENDING',
      createdAt: '2026-01-01', updatedAt: '2026-01-01', version: 1, metadata: {},
    };
    repo.save(record);
    assert.equal(repo.findById('r1')?.recordId, 'r1');
  });

  test('30. repository — findByStatus filters correctly', () => {
    const repo = new InMemoryLearningRepository();
    repo.save({ recordId: 'r1', organizationId: 'org-1', source: 'EXECUTION_RESULT', triggerId: 't1', patterns: [], recommendations: [], status: 'PENDING', createdAt: '', updatedAt: '', version: 1, metadata: {} });
    repo.save({ recordId: 'r2', organizationId: 'org-1', source: 'EXECUTION_RESULT', triggerId: 't2', patterns: [], recommendations: [], status: 'APPROVED', createdAt: '', updatedAt: '', version: 1, metadata: {} });
    assert.equal(repo.findByStatus('org-1', 'PENDING').length, 1);
    assert.equal(repo.findByStatus('org-1', 'APPROVED').length, 1);
  });

  // ── Validator ─────────────────────────────────────────────────────────────────

  test('31. validator — rejects invalid recommendation', () => {
    const validator = new LearningValidator();
    const result = validator.validateRecommendation({
      recommendationId: '', organizationId: '', type: 'PROCESS_IMPROVEMENT',
      priority: 'HIGH', title: '', description: '', sourcePatterns: [],
      proposedChange: {}, expectedImpact: '', rationale: '', status: 'PENDING',
      reviewedBy: null, reviewedAt: null, reviewComment: null,
      createdAt: '', version: '', schemaVersion: 1,
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  });

  // ── Multiple sources ──────────────────────────────────────────────────────────

  test('32. multi-source — learns from execution, feedback, and errors', () => {
    const engine = new LearningEngine(makeDeps());
    const inputs = [
      makeInput({ inputId: 'i1', source: 'EXECUTION_RESULT', data: { success: false } }),
      makeInput({ inputId: 'i2', source: 'HUMAN_FEEDBACK', feedbackText: 'This was wrong and terrible', feedbackRating: 'negative' }),
      makeInput({ inputId: 'i3', source: 'ERROR', data: { error: 'timeout', toolId: 't1' } }),
      makeInput({ inputId: 'i4', source: 'ERROR', data: { error: 'timeout', toolId: 't1' } }),
    ];
    const record = engine.learn(inputs);
    assert.ok(record.patterns.length > 0, 'should detect patterns from multiple sources');
    assert.ok(record.recommendations.length > 0, 'should generate recommendations');
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
