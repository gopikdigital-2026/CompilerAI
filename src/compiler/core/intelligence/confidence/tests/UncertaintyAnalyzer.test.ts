// ─── Uncertainty Analyzer — unit tests ──────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/confidence/tests/UncertaintyAnalyzer.test.ts

import assert from 'node:assert/strict';
import { UncertaintyAnalyzer } from '../services/UncertaintyAnalyzer';
import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';

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
    classificationReasons: [], assumptions: [],
    requiresClarification: false, clarificationQuestions: [],
    requiresHumanApproval: false, status: 'READY',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    planId: 'plan-1', requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1',
    title: '', objective: '', summary: '',
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
    confidenceScore: 70, generatedAt: '2026-01-01T00:00:00.000Z', version: '1.0',
    ...overrides,
  };
}

function mkDecision(overrides: Partial<DecisionResult> = {}): DecisionResult {
  return {
    decisionResultId: 'dec-1', planId: 'plan-1', requestId: 'req-1',
    organizationId: 'org-1', intentId: 'intent-1',
    status: 'READY', decisions: [],
    selectedStrategy: null, rejectedAlternatives: [],
    unresolvedConflicts: [], assumptions: [], risks: [],
    humanApprovalRequirements: [],
    requiresReplanning: false, replanningReasons: [],
    requiresMoreData: false, missingData: [],
    requiresClarification: false, clarificationQuestions: [],
    overallConfidenceScore: 70, overallRiskLevel: 'LOW',
    rationaleSummary: '', createdAt: '2026-01-01T00:00:00.000Z', version: '1.0',
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

const analyzer = new UncertaintyAnalyzer();

test('no uncertainties for clean results', () => {
  const r = analyzer.analyze(mkRequest({
    contextResult: mkContext(),
    intentResult: mkIntent(),
    executionPlan: mkPlan(),
    decisionResult: mkDecision(),
  }));
  assert.ok(r.length === 0 || r.every(u => u.type !== 'MISSING_DATA'),
    'should not have missing data uncertainties for clean results');
});

test('detects missing data from context', () => {
  const r = analyzer.analyze(mkRequest({
    contextResult: mkContext({
      status: 'NEEDS_DATA',
      missingInformation: [
        { kind: 'missing_data_source', description: 'No CRM', question: 'Connect?', severity: 'high', resolvableBy: [] },
      ],
    }),
  }));
  assert.ok(r.some(u => u.type === 'MISSING_DATA'), 'should detect missing data');
});

test('detects ambiguous objective from intent', () => {
  const r = analyzer.analyze(mkRequest({
    intentResult: mkIntent({
      ambiguityScore: 80, requiresClarification: true,
      clarificationQuestions: ['What?'],
    }),
  }));
  assert.ok(r.some(u => u.type === 'AMBIGUOUS_OBJECTIVE'), 'should detect ambiguity');
});

test('detects external dependency from plan', () => {
  const r = analyzer.analyze(mkRequest({
    executionPlan: mkPlan({ requiredDataSources: ['crm', 'erp'] }),
  }));
  assert.ok(r.some(u => u.type === 'EXTERNAL_DEPENDENCY'), 'should detect external dependency');
});

test('detects unresolved conflicts from decision', () => {
  const r = analyzer.analyze(mkRequest({
    decisionResult: mkDecision({
      unresolvedConflicts: [
        { conflictId: 'c1', type: 'CONTRADICTORY_OBJECTIVES', description: 'A vs B',
          involvedDecisionIds: [], severity: 'HIGH', resolvable: false, suggestedResolution: '' },
      ],
    }),
  }));
  assert.ok(r.some(u => u.type === 'UNRESOLVED_CONFLICT'), 'should detect conflicts');
});

test('detects unvalidated assumptions', () => {
  const r = analyzer.analyze(mkRequest({
    intentResult: mkIntent({ assumptions: ['Assumption 1'] }),
    executionPlan: mkPlan({ assumptions: ['Plan assumption'] }),
  }));
  assert.ok(r.some(u => u.type === 'UNVALIDATED_ASSUMPTION'), 'should detect assumptions');
});

test('uncertainties have resolvable flag', () => {
  const r = analyzer.analyze(mkRequest({
    contextResult: mkContext({
      missingInformation: [
        { kind: 'missing_data_source', description: 'No CRM', question: 'Connect?', severity: 'high', resolvableBy: ['crm'] },
      ],
    }),
  }));
  const missing = r.filter(u => u.type === 'MISSING_DATA');
  assert.ok(missing.length > 0);
  assert.ok(missing.some(u => u.resolvable), 'should be resolvable when resolvableBy is non-empty');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
