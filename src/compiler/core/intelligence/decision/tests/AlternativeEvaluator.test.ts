// ─── Alternative Evaluator — unit tests ────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/decision/tests/AlternativeEvaluator.test.ts

import assert from 'node:assert/strict';
import { AlternativeEvaluator } from '../services/AlternativeEvaluator';
import type { DecisionAlternative } from '../models/DecisionAlternative';
import type { EvaluationPreferences } from '../models/DecisionRequest';

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

const evaluator = new AlternativeEvaluator();
const prefs: EvaluationPreferences = {};

function mkAlt(id: string, title: string, risks: string[] = [], reversibility: DecisionAlternative['reversibility'] = 'REVERSIBLE'): DecisionAlternative {
  return {
    alternativeId: id, title, description: `Alt ${title}`,
    expectedBenefits: ['Benefit A'], expectedCosts: ['Cost A'],
    risks, constraints: [], dependencies: [],
    reversibility, requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [],
  };
}

test('evaluates and ranks alternatives deterministically', () => {
  const alts = [mkAlt('a1', 'Option A'), mkAlt('a2', 'Option B')];
  const evals = evaluator.evaluate(alts, prefs, 'MEDIUM');
  assert.equal(evals.length, 2);
  assert.equal(evals[0].rank, 1);
  assert.equal(evals[1].rank, 2);
  assert.ok(evals[0].weightedScore >= evals[1].weightedScore, 'rank 1 should have >= score');
});

test('penalizes irreversible alternatives', () => {
  const reversible = mkAlt('r1', 'Reversible', [], 'REVERSIBLE');
  const irreversible = mkAlt('r2', 'Irreversible', [], 'IRREVERSIBLE');
  const evals = evaluator.evaluate([reversible, irreversible], prefs, 'MEDIUM');
  const revScore = evals.find(e => e.alternativeId === 'r1')!.weightedScore;
  const irrevScore = evals.find(e => e.alternativeId === 'r2')!.weightedScore;
  assert.ok(revScore > irrevScore, 'reversible should score higher than irreversible');
});

test('penalizes high-risk alternatives', () => {
  const lowRisk = mkAlt('lr', 'Low Risk', ['minor delay']);
  const highRisk = mkAlt('hr', 'High Risk', ['critical financial loss', 'severe operational impact']);
  const evals = evaluator.evaluate([lowRisk, highRisk], prefs, 'MEDIUM');
  const lrScore = evals.find(e => e.alternativeId === 'lr')!.weightedScore;
  const hrScore = evals.find(e => e.alternativeId === 'hr')!.weightedScore;
  assert.ok(lrScore > hrScore, 'low risk should score higher than high risk');
});

test('resolves ties deterministically', () => {
  const a = mkAlt('a1', 'Tie A', [], 'REVERSIBLE');
  const b = mkAlt('a2', 'Tie B', [], 'REVERSIBLE');
  // Make them identical in scoring
  const evals = evaluator.evaluate([a, b], prefs, 'MEDIUM');
  // Both should have the same score; tie-break by alternativeId
  assert.equal(evals[0].rank, 1);
  assert.equal(evals[1].rank, 2);
  // a1 < a2 lexicographically, so a1 should rank first on tie
  assert.equal(evals[0].alternativeId, 'a1');
});

test('all scores are between 0 and 100', () => {
  const alts = [mkAlt('x1', 'X1', ['risk']), mkAlt('x2', 'X2', [], 'IRREVERSIBLE')];
  const evals = evaluator.evaluate(alts, prefs, 'LOW');
  for (const e of evals) {
    assert.ok(e.weightedScore >= 0 && e.weightedScore <= 100, `score ${e.weightedScore} out of range`);
    for (const c of e.criteria) {
      assert.ok(c.score >= 0 && c.score <= 100, `criterion score ${c.score} out of range`);
    }
  }
});

test('same input produces same output', () => {
  const alts = [mkAlt('d1', 'D1'), mkAlt('d2', 'D2')];
  const e1 = evaluator.evaluate(alts, prefs, 'MEDIUM');
  const e2 = evaluator.evaluate(alts, prefs, 'MEDIUM');
  assert.equal(e1[0].weightedScore, e2[0].weightedScore);
  assert.equal(e1[1].weightedScore, e2[1].weightedScore);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
