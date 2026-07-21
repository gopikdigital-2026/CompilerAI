// ─── Confidence Calculator — unit tests ───────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/confidence/tests/ConfidenceCalculator.test.ts

import assert from 'node:assert/strict';
import { ConfidenceCalculator } from '../services/ConfidenceCalculator';
import { DEFAULT_FACTOR_WEIGHTS, levelFromScore, clampScore } from '../rules/ConfidenceRules';
import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
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

function mkContext(overrides: Partial<ContextResult> = {}): ContextResult {
  return {
    requestId: 'req-1', organizationId: 'org-1',
    detectedIntent: 'analysis',
    objectives: [], entities: [], constraints: [],
    relevantMemory: [], recommendedSources: [],
    missingInformation: [], sufficiencyScore: 80,
    status: 'READY', createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkIntent(overrides: Partial<IntentResult> = {}): IntentResult {
  return {
    intentId: 'intent-1', requestId: 'req-1', organizationId: 'org-1',
    primaryIntent: 'ANALYZE', secondaryIntents: [],
    businessArea: 'FINANCE', decisionLevel: 'TACTICAL',
    urgency: 'normal', impact: 'MEDIUM', complexity: 'MEDIUM',
    objectives: [], expectedOutcome: '', affectedEntities: [], constraints: [],
    requiredCapabilities: [], suggestedAgentTypes: [], suggestedToolCategories: [],
    confidenceScore: 80, ambiguityScore: 20,
    classificationReasons: ['reason'], assumptions: [],
    requiresClarification: false, clarificationQuestions: [],
    requiresHumanApproval: false, status: 'READY',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    planId: 'plan-1', requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1',
    title: 'Test', objective: '', summary: '',
    status: 'READY',
    graph: {
      nodes: [
        { nodeId: 'n1', type: 'DATA_RETRIEVAL', title: 'Data', description: '',
          objective: '', dependencies: [], inputs: [], expectedOutputs: [],
          requiredCapabilities: [], suggestedAgentType: 'GENERAL_PURPOSE_AGENT',
          suggestedToolCategories: [], requiresHumanApproval: false, riskLevel: 'LOW',
          estimatedComplexity: 'LOW', canRunInParallel: false, executionPriority: 50,
          status: 'DRAFT', metadata: {} },
        { nodeId: 'n2', type: 'FINAL_SYNTHESIS', title: 'Synthesis', description: '',
          objective: '', dependencies: ['n1'], inputs: [], expectedOutputs: [],
          requiredCapabilities: [], suggestedAgentType: 'GENERAL_PURPOSE_AGENT',
          suggestedToolCategories: [], requiresHumanApproval: false, riskLevel: 'LOW',
          estimatedComplexity: 'LOW', canRunInParallel: false, executionPriority: 90,
          status: 'DRAFT', metadata: {} },
      ],
      edges: [{ edgeId: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', dependencyType: 'DATA_DEPENDENCY', required: true }],
      entryNodeIds: ['n1'], terminalNodeIds: ['n2'],
      parallelGroups: [], topologicalOrder: ['n1', 'n2'],
    },
    requiredCapabilities: [], suggestedAgentTypes: [], suggestedToolCategories: [],
    requiredDataSources: [], assumptions: [], risks: [], blockers: [],
    humanApprovalRequirements: [], estimatedComplexity: 'LOW',
    confidenceScore: 75, generatedAt: '2026-01-01T00:00:00.000Z', version: '1.0',
    ...overrides,
  };
}

function mkRequest(overrides: Partial<ConfidenceRequest> = {}): ConfidenceRequest {
  return {
    requestId: 'req-1', organizationId: 'org-1',
    assessmentScope: 'FULL_PIPELINE',
    minimumConfidenceThreshold: 60,
    riskTolerance: 'MEDIUM',
    requestedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const calculator = new ConfidenceCalculator({ factorWeights: { ...DEFAULT_FACTOR_WEIGHTS } });

test('assessContext returns null when no context', () => {
  const r = calculator.assessContext(mkRequest());
  assert.equal(r, null);
});

test('assessContext returns assessment for ready context', () => {
  const r = calculator.assessContext(mkRequest({ contextResult: mkContext() }));
  assert.ok(r !== null);
  assert.equal(r.sourceType, 'CONTEXT');
  assert.ok(r.score >= 0 && r.score <= 100);
  assert.ok(r.factors.length > 0);
});

test('assessIntent returns assessment for ready intent', () => {
  const r = calculator.assessIntent(mkRequest({ intentResult: mkIntent() }));
  assert.ok(r !== null);
  assert.equal(r.sourceType, 'INTENT');
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('assessPlan returns assessment for valid plan', () => {
  const r = calculator.assessPlan(mkRequest({ executionPlan: mkPlan() }));
  assert.ok(r !== null);
  assert.equal(r.sourceType, 'PLAN');
  assert.ok(r.score >= 0 && r.score <= 100);
});

test('aggregate produces overall score in range', () => {
  const req = mkRequest({
    contextResult: mkContext(),
    intentResult: mkIntent(),
    executionPlan: mkPlan(),
  });
  const assessments = [
    calculator.assessContext(req),
    calculator.assessIntent(req),
    calculator.assessPlan(req),
  ].filter((a): a is NonNullable<typeof a> => a !== null);
  const { overallScore } = calculator.aggregate(assessments, req);
  assert.ok(overallScore >= 0 && overallScore <= 100, `score ${overallScore} out of range`);
});

test('levelFromScore maps correctly', () => {
  assert.equal(levelFromScore(95), 'VERY_HIGH');
  assert.equal(levelFromScore(80), 'HIGH');
  assert.equal(levelFromScore(60), 'MEDIUM');
  assert.equal(levelFromScore(30), 'LOW');
  assert.equal(levelFromScore(10), 'VERY_LOW');
});

test('clampScore enforces 0-100', () => {
  assert.equal(clampScore(-10), 0);
  assert.equal(clampScore(50), 50);
  assert.equal(clampScore(150), 100);
  assert.equal(clampScore(NaN), 0);
});

test('blocked plan reduces score', () => {
  const ready = calculator.assessPlan(mkRequest({ executionPlan: mkPlan({ status: 'READY' }) }));
  const blocked = calculator.assessPlan(mkRequest({ executionPlan: mkPlan({ status: 'BLOCKED' }) }));
  assert.ok(ready !== null && blocked !== null);
  assert.ok(blocked.score < ready.score, `blocked ${blocked.score} should be < ready ${ready.score}`);
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
