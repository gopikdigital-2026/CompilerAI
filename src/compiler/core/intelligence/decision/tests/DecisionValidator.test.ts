// ─── Decision Validator — unit tests ─────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/decision/tests/DecisionValidator.test.ts

import assert from 'node:assert/strict';
import { DecisionValidator } from '../services/DecisionValidator';
import type { DecisionItem } from '../models/DecisionItem';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';

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

const validator = new DecisionValidator();

function mkPlan(status: ExecutionPlan['status'] = 'READY'): ExecutionPlan {
  return {
    planId: 'plan-1', requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1',
    title: 'Test Plan', objective: 'Test', summary: 'Test plan',
    status, graph: {
      nodes: [{ nodeId: 'n1', type: 'FINAL_SYNTHESIS', title: 'Synthesis', description: '',
        objective: '', dependencies: [], inputs: [], expectedOutputs: [],
        requiredCapabilities: [], suggestedAgentType: 'GENERAL_PURPOSE_AGENT',
        suggestedToolCategories: [], requiresHumanApproval: false, riskLevel: 'LOW',
        estimatedComplexity: 'LOW', canRunInParallel: false, executionPriority: 50,
        status: 'DRAFT', metadata: {} }],
      edges: [], entryNodeIds: ['n1'], terminalNodeIds: ['n1'],
      parallelGroups: [], topologicalOrder: ['n1'],
    },
    requiredCapabilities: [], suggestedAgentTypes: [], suggestedToolCategories: [],
    requiredDataSources: [], assumptions: [], risks: [], blockers: [],
    humanApprovalRequirements: [], estimatedComplexity: 'LOW',
    confidenceScore: 70, generatedAt: new Date().toISOString(), version: '1.0',
  };
}

function mkDecision(overrides: Partial<DecisionItem> = {}): DecisionItem {
  return {
    decisionId: 'd1', title: 'Test Decision', description: '', decisionType: 'STRATEGY_SELECTION',
    sourceNodeIds: ['n1'], objective: 'Test objective', criteria: [],
    alternatives: [], recommendedAlternativeId: '',
    rationale: {
      chosenAlternativeId: '', chosenTitle: '', selectionReason: '',
      rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [],
      criteriaSummary: '',
    },
    confidenceScore: 70, riskLevel: 'LOW', conflicts: [], assumptions: [],
    requiresHumanApproval: false, reversible: true, status: 'READY',
    ...overrides,
  };
}

test('valid decisions pass', () => {
  const d = mkDecision({ alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
    expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
    reversibility: 'REVERSIBLE', requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [] }], recommendedAlternativeId: 'a1' });
  const result = validator.validate([d], mkPlan());
  assert.equal(result.isValid, true);
});

test('decision without alternatives is invalid', () => {
  const d = mkDecision();
  const result = validator.validate([d], mkPlan());
  assert.ok(result.errors.some(e => e.code === 'NO_ALTERNATIVES'), 'should flag no alternatives');
});

test('recommended alternative not found is invalid', () => {
  const d = mkDecision({
    alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
      expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
      reversibility: 'REVERSIBLE', requiredCapabilities: [], requiredData: [],
      requiresHumanApproval: false, evaluations: [] }],
    recommendedAlternativeId: 'nonexistent',
  });
  const result = validator.validate([d], mkPlan());
  assert.ok(result.errors.some(e => e.code === 'RECOMMENDED_NOT_FOUND'), 'should flag missing recommended');
});

test('invalid criterion weight is detected', () => {
  const d = mkDecision({
    criteria: [{ kind: 'COST', weight: 1.5, score: 50, explanation: '', evidenceReferences: [], uncertainty: 50 }],
  });
  const result = validator.validate([d], mkPlan());
  assert.ok(result.errors.some(e => e.code === 'INVALID_CRITERION_WEIGHT'), 'should flag invalid weight');
});

test('invalid criterion score is detected', () => {
  const d = mkDecision({
    criteria: [{ kind: 'COST', weight: 0.5, score: 150, explanation: '', evidenceReferences: [], uncertainty: 50 }],
  });
  const result = validator.validate([d], mkPlan());
  assert.ok(result.errors.some(e => e.code === 'INVALID_CRITERION_SCORE'), 'should flag invalid score');
});

test('blocked plan produces blockers', () => {
  const d = mkDecision({ alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
    expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
    reversibility: 'REVERSIBLE', requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [] }], recommendedAlternativeId: 'a1' });
  const result = validator.validate([d], mkPlan('BLOCKED'));
  assert.ok(result.blockers.length > 0, 'should have blockers for blocked plan');
  assert.equal(result.recommendedStatus, 'BLOCKED');
});

test('invalid plan produces errors', () => {
  const d = mkDecision({ alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
    expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
    reversibility: 'REVERSIBLE', requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [] }], recommendedAlternativeId: 'a1' });
  const result = validator.validate([d], mkPlan('INVALID'));
  assert.ok(result.errors.some(e => e.code === 'INVALID_PLAN'), 'should flag invalid plan');
  assert.equal(result.recommendedStatus, 'INVALID');
});

test('source node not in plan produces warning', () => {
  const d = mkDecision({ sourceNodeIds: ['nonexistent'], alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
    expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
    reversibility: 'REVERSIBLE', requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [] }], recommendedAlternativeId: 'a1' });
  const result = validator.validate([d], mkPlan());
  assert.ok(result.warnings.some(w => w.code === 'SOURCE_NODE_NOT_FOUND'), 'should warn about missing source node');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
