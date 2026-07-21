// ─── Conflict Detector — unit tests ────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/decision/tests/ConflictDetector.test.ts

import assert from 'node:assert/strict';
import { ConflictDetector } from '../services/ConflictDetector';
import type { DecisionItem } from '../models/DecisionItem';

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

const detector = new ConflictDetector();

function mkDecision(id: string, title: string, objective: string, riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW', requiresApproval = false, confidence = 70): DecisionItem {
  return {
    decisionId: id, title, description: '', decisionType: 'STRATEGY_SELECTION',
    sourceNodeIds: [], objective, criteria: [],
    alternatives: [], recommendedAlternativeId: '',
    rationale: {
      chosenAlternativeId: '', chosenTitle: '', selectionReason: '',
      rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [],
      criteriaSummary: '',
    },
    confidenceScore: confidence, riskLevel, conflicts: [],
    assumptions: [], requiresHumanApproval: requiresApproval,
    reversible: !requiresApproval, status: 'READY',
  };
}

test('detects urgency vs approval conflict', () => {
  const d = mkDecision('d1', 'Reduce workforce immediately', 'Reduce workforce', 'CRITICAL', true, 30);
  const conflicts = detector.detect([d]);
  assert.ok(conflicts.some(c => c.type === 'URGENCY_VS_APPROVAL'), 'should detect urgency vs approval');
});

test('detects high impact vs low confidence conflict', () => {
  const d = mkDecision('d1', 'Major decision', 'Major strategic move', 'HIGH', false, 30);
  const conflicts = detector.detect([d]);
  assert.ok(conflicts.some(c => c.type === 'HIGH_IMPACT_VS_LOW_CONFIDENCE'), 'should detect high impact low confidence');
});

test('detects contradictory objectives', () => {
  const a = mkDecision('d1', 'Reduce costs', 'Reduce operational costs significantly');
  const b = mkDecision('d2', 'Expand team', 'Increase headcount to grow revenue');
  const conflicts = detector.detect([a, b]);
  assert.ok(conflicts.some(c => c.type === 'CONTRADICTORY_OBJECTIVES'), 'should detect contradictory objectives');
});

test('no conflicts for compatible decisions', () => {
  const a = mkDecision('d1', 'Analyze data', 'Analyze sales data');
  const b = mkDecision('d2', 'Generate report', 'Generate quarterly report');
  const conflicts = detector.detect([a, b]);
  assert.equal(conflicts.length, 0);
});

test('conflicts include resolvable flag and suggested resolution', () => {
  const d = mkDecision('d1', 'Cut workforce immediately', 'Reduce workforce', 'CRITICAL', true, 25);
  const conflicts = detector.detect([d]);
  const urgency = conflicts.find(c => c.type === 'URGENCY_VS_APPROVAL');
  assert.ok(urgency, 'should have urgency conflict');
  assert.ok(urgency!.resolvable, 'should be resolvable');
  assert.ok(urgency!.suggestedResolution.length > 0, 'should have suggested resolution');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
