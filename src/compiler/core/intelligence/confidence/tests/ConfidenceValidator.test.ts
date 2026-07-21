// ─── Confidence Validator — unit tests ──────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/confidence/tests/ConfidenceValidator.test.ts

import assert from 'node:assert/strict';
import { ConfidenceValidator } from '../services/ConfidenceValidator';
import type { ConfidenceResult } from '../models/ConfidenceResult';
import type { ConfidenceAssessment } from '../models/ConfidenceAssessment';
import type { ConfidenceFactor } from '../models/ConfidenceFactor';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  \u2713 ${name}`); }
  catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  \u2717 ${name}\n      ${msg}`);
  }
}

const validator = new ConfidenceValidator();

function mkResult(overrides: Partial<ConfidenceResult> = {}): ConfidenceResult {
  return {
    confidenceResultId: 'conf-1', requestId: 'req-1', organizationId: 'org-1',
    overallScore: 75, level: 'HIGH', status: 'ACCEPTABLE',
    assessments: [], positiveFactors: [], negativeFactors: [],
    uncertainties: [], evidence: [], missingEvidence: [],
    contradictions: [], assumptions: [],
    requiresMoreData: false, requiresClarification: false,
    requiresHumanReview: false, blocked: false,
    recommendedActions: [], explanation: '',
    createdAt: '2026-01-01T00:00:00.000Z', version: '1.0',
    ...overrides,
  };
}

test('valid result passes', () => {
  const v = validator.validate(mkResult());
  assert.ok(v.valid, 'should be valid');
  assert.equal(v.errors.length, 0);
});

test('score out of range fails', () => {
  const v = validator.validate(mkResult({ overallScore: 150 }));
  assert.ok(!v.valid);
  assert.ok(v.errors.some(e => e.includes('0 and 100')));
});

test('negative score fails', () => {
  const v = validator.validate(mkResult({ overallScore: -5 }));
  assert.ok(!v.valid);
});

test('empty result id fails', () => {
  const v = validator.validate(mkResult({ confidenceResultId: '' }));
  assert.ok(!v.valid);
});

test('blocked but not BLOCKED status fails', () => {
  const v = validator.validate(mkResult({ blocked: true, status: 'ACCEPTABLE' }));
  assert.ok(!v.valid);
  assert.ok(v.errors.some(e => e.includes('blocked')));
});

test('human review but ACCEPTABLE warns', () => {
  const v = validator.validate(mkResult({ requiresHumanReview: true, status: 'ACCEPTABLE' }));
  assert.ok(v.valid, 'warnings do not invalidate');
  assert.ok(v.warnings.some(w => w.includes('human review')));
});

test('assessment with out-of-range factor score fails', () => {
  const factor: ConfidenceFactor = {
    factorId: 'f1', kind: 'CONTEXT_COMPLETENESS', direction: 'POSITIVE',
    weight: 0.5, score: 150, contribution: 0.5, description: '', evidenceRefs: [],
  };
  const assessment: ConfidenceAssessment = {
    sourceType: 'CONTEXT', sourceId: 's1', score: 70, level: 'MEDIUM',
    factors: [factor], uncertainties: [], evidence: [],
    contradictions: [], assumptions: [], explanation: '',
  };
  const v = validator.validate(mkResult({ assessments: [assessment] }));
  assert.ok(!v.valid);
  assert.ok(v.errors.some(e => e.includes('out of range')));
});

test('requiresMoreData but ACCEPTABLE warns', () => {
  const v = validator.validate(mkResult({ requiresMoreData: true, status: 'ACCEPTABLE' }));
  assert.ok(v.valid);
  assert.ok(v.warnings.length > 0);
});

test('factor negative weight fails', () => {
  const factor: ConfidenceFactor = {
    factorId: 'f1', kind: 'CONTEXT_COMPLETENESS', direction: 'POSITIVE',
    weight: -0.5, score: 50, contribution: 0.5, description: '', evidenceRefs: [],
  };
  const assessment: ConfidenceAssessment = {
    sourceType: 'CONTEXT', sourceId: 's1', score: 70, level: 'MEDIUM',
    factors: [factor], uncertainties: [], evidence: [],
    contradictions: [], assumptions: [], explanation: '',
  };
  const v = validator.validate(mkResult({ assessments: [assessment] }));
  assert.ok(!v.valid);
  assert.ok(v.errors.some(e => e.includes('weight')));
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
