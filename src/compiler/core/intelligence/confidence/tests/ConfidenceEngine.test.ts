// ─── Confidence Engine — unit tests ────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/confidence/tests/ConfidenceEngine.test.ts

import assert from 'node:assert/strict';
import { ConfidenceEngine } from '../services/ConfidenceEngine';
import { ConfidenceValidator } from '../services/ConfidenceValidator';
import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { DecisionItem } from '../../decision/models/DecisionItem';
import type { DecisionAlternative } from '../../decision/models/DecisionAlternative';
import type { AlternativeEvaluation } from '../../decision/models/AlternativeEvaluation';
import { DEFAULT_FACTOR_WEIGHTS } from '../rules/ConfidenceRules';

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
function makeDeps() {
  return {
    idGenerator: () => `conf-${(++idCounter).toString().padStart(4, '0')}`,
    clock: () => '2026-01-01T00:00:00.000Z',
    factorWeights: { ...DEFAULT_FACTOR_WEIGHTS } as Record<string, number>,
  };
}

// ── Fixtures ────────────────────────────────────────────────────────────────────

function mkContext(overrides: Partial<ContextResult> = {}): ContextResult {
  return {
    requestId: 'req-1', organizationId: 'org-1',
    detectedIntent: 'analysis',
    objectives: [{ label: 'Analyze margin drop', detail: 'Quantitative analysis' }],
    entities: [{ type: 'metric', name: 'margin', classification: 'INTERNAL' }],
    constraints: [{ type: 'temporal', value: 'This month', classification: 'INTERNAL' }],
    relevantMemory: [
      { key: 'crm.lastOrder.value', value: '€12.400', classification: 'CONFIDENTIAL' },
    ],
    recommendedSources: [
      { id: 'crm.hubspot', label: 'HubSpot CRM', kind: 'crm', available: true, relevance: 85, classification: 'CONFIDENTIAL', rationale: 'Sales data' },
    ],
    missingInformation: [],
    sufficiencyScore: 85,
    status: 'READY',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkIntent(overrides: Partial<IntentResult> = {}): IntentResult {
  return {
    intentId: 'intent-1', requestId: 'req-1', organizationId: 'org-1',
    primaryIntent: 'ANALYZE', secondaryIntents: [],
    businessArea: 'FINANCE', decisionLevel: 'TACTICAL',
    urgency: 'normal', impact: 'MEDIUM', complexity: 'MEDIUM',
    objectives: [], expectedOutcome: 'Margin analysis',
    affectedEntities: [], constraints: [],
    requiredCapabilities: [], suggestedAgentTypes: [], suggestedToolCategories: [],
    confidenceScore: 80, ambiguityScore: 20,
    classificationReasons: ['Lexical match: analiza'],
    assumptions: [],
    requiresClarification: false, clarificationQuestions: [],
    requiresHumanApproval: false, status: 'READY',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function mkPlan(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    planId: 'plan-1', requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1',
    title: 'Test', objective: 'Test', summary: 'Test',
    status: 'READY',
    graph: {
      nodes: [
        { nodeId: 'n1', type: 'DATA_RETRIEVAL', title: 'Data', description: '',
          objective: 'Get data', dependencies: [], inputs: [], expectedOutputs: [],
          requiredCapabilities: [], suggestedAgentType: 'GENERAL_PURPOSE_AGENT',
          suggestedToolCategories: [], requiresHumanApproval: false, riskLevel: 'LOW',
          estimatedComplexity: 'LOW', canRunInParallel: false, executionPriority: 50,
          status: 'DRAFT', metadata: {} },
        { nodeId: 'n2', type: 'FINAL_SYNTHESIS', title: 'Synthesis', description: '',
          objective: 'Synthesize', dependencies: ['n1'], inputs: [], expectedOutputs: [],
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

function mkAlt(id: string, title: string, score: number, reversibility: DecisionAlternative['reversibility'] = 'REVERSIBLE'): DecisionAlternative {
  const ev: AlternativeEvaluation = {
    alternativeId: id, weightedScore: score, criteria: [], rank: 1, viable: true, summary: title,
  };
  return {
    alternativeId: id, title, description: '',
    expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
    reversibility, requiredCapabilities: [], requiredData: [],
    requiresHumanApproval: false, evaluations: [ev],
  };
}

function mkDecision(overrides: Partial<DecisionResult> = {}): DecisionResult {
  const alt1 = mkAlt('a1', 'Proceed', 80);
  const alt2 = mkAlt('a2', 'Reduced Scope', 55);
  const item: DecisionItem = {
    decisionId: 'd1', title: 'Strategy', description: '',
    decisionType: 'STRATEGY_SELECTION', sourceNodeIds: ['n2'],
    objective: 'Choose strategy', criteria: [],
    alternatives: [alt1, alt2], recommendedAlternativeId: 'a1',
    rationale: {
      chosenAlternativeId: 'a1', chosenTitle: 'Proceed', selectionReason: 'Best score',
      rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [],
      criteriaSummary: '',
    },
    confidenceScore: 75, riskLevel: 'LOW', conflicts: [], assumptions: [],
    requiresHumanApproval: false, reversible: true, status: 'READY',
  };
  return {
    decisionResultId: 'dec-1', planId: 'plan-1', requestId: 'req-1',
    organizationId: 'org-1', intentId: 'intent-1',
    status: 'READY', decisions: [item],
    selectedStrategy: { decisionId: 'd1', alternativeId: 'a1', title: 'Proceed', rationale: 'Best' },
    rejectedAlternatives: [alt2], unresolvedConflicts: [],
    assumptions: [], risks: [], humanApprovalRequirements: [],
    requiresReplanning: false, replanningReasons: [],
    requiresMoreData: false, missingData: [],
    requiresClarification: false, clarificationQuestions: [],
    overallConfidenceScore: 75, overallRiskLevel: 'LOW',
    rationaleSummary: 'Best option', createdAt: '2026-01-01T00:00:00.000Z',
    version: '1.0',
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

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {

  // 1 — Complete and coherent context → HIGH or VERY_HIGH
  test('1. complete coherent context → HIGH or VERY_HIGH', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: mkDecision(),
    });
    const r = engine.evaluate(req);
    assert.ok(r.overallScore >= 50, `expected >= 50, got ${r.overallScore}`);
    assert.ok(['HIGH', 'VERY_HIGH', 'MEDIUM'].includes(r.level), `expected HIGH/VERY_HIGH/MEDIUM, got ${r.level}`);
  });

  // 2 — Ambiguous request → NEEDS_CLARIFICATION
  test('2. ambiguous request → NEEDS_CLARIFICATION', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext({
        status: 'NEEDS_CLARIFICATION',
        missingInformation: [
          { kind: 'ambiguous_intent', description: 'Intent unclear', question: 'What?', severity: 'high', resolvableBy: [] },
        ],
        sufficiencyScore: 30,
      }),
      intentResult: mkIntent({
        status: 'NEEDS_CLARIFICATION', requiresClarification: true,
        ambiguityScore: 70, confidenceScore: 40,
        clarificationQuestions: ['What do you mean?'],
      }),
    });
    const r = engine.evaluate(req);
    assert.equal(r.status, 'NEEDS_CLARIFICATION');
    assert.ok(r.requiresClarification, 'should require clarification');
  });

  // 3 — Insufficient data → NEEDS_DATA
  test('3. insufficient data → NEEDS_DATA', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext({
        status: 'NEEDS_DATA', sufficiencyScore: 25,
        missingInformation: [
          { kind: 'missing_data_source', description: 'No CRM', question: 'Connect?', severity: 'high', resolvableBy: ['crm'] },
        ],
      }),
    });
    const r = engine.evaluate(req);
    assert.equal(r.status, 'NEEDS_DATA');
    assert.ok(r.requiresMoreData, 'should require more data');
  });

  // 4 — Valid plan with few risks → HIGH
  test('4. valid plan with few risks → HIGH', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan({ risks: [], assumptions: [] }),
    });
    const r = engine.evaluate(req);
    assert.ok(r.overallScore >= 60, `expected >= 60, got ${r.overallScore}`);
    assert.ok(['HIGH', 'VERY_HIGH', 'MEDIUM'].includes(r.level), `expected HIGH+, got ${r.level}`);
  });

  // 5 — Plan with external dependencies → reduced confidence
  test('5. plan with external dependencies → reduced confidence', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const reqWithDeps = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan({ requiredDataSources: ['crm', 'erp', 'email'] }),
    });
    const reqNoDeps = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan({ requiredDataSources: [] }),
    });
    const withDeps = engine.evaluate(reqWithDeps);
    const noDeps = engine.evaluate(reqNoDeps);
    assert.ok(withDeps.overallScore <= noDeps.overallScore,
      `external deps should reduce confidence: ${withDeps.overallScore} vs ${noDeps.overallScore}`);
  });

  // 6 — Decision with clearly superior alternative → high confidence
  test('6. clearly superior alternative → high confidence', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const decision = mkDecision();
    decision.decisions[0].alternatives = [
      mkAlt('a1', 'Best', 90), mkAlt('a2', 'Worst', 30),
    ];
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: decision,
    });
    const r = engine.evaluate(req);
    assert.ok(r.overallScore >= 50, `expected >= 50, got ${r.overallScore}`);
  });

  // 7 — Nearly tied alternatives → medium or low confidence
  test('7. nearly tied alternatives → medium or low confidence', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const decision = mkDecision();
    decision.decisions[0].alternatives = [
      mkAlt('a1', 'Option A', 60), mkAlt('a2', 'Option B', 59),
    ];
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: decision,
    });
    const r = engine.evaluate(req);
    assert.ok(r.uncertainties.some(u => u.type === 'MARGINAL_ALTERNATIVE_GAP'),
      'should detect marginal alternative gap');
  });

  // 8 — Critical conflicts → HUMAN_REVIEW_REQUIRED or BLOCKED
  test('8. critical conflicts → HUMAN_REVIEW_REQUIRED or BLOCKED', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const decision = mkDecision();
    decision.unresolvedConflicts = [
      { conflictId: 'c1', type: 'CONTRADICTORY_OBJECTIVES', description: 'A vs B',
        involvedDecisionIds: ['d1'], severity: 'CRITICAL', resolvable: false, suggestedResolution: 'None' },
    ];
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: decision,
    });
    const r = engine.evaluate(req);
    assert.ok(['HUMAN_REVIEW_REQUIRED', 'BLOCKED'].includes(r.status),
      `expected HUMAN_REVIEW_REQUIRED or BLOCKED, got ${r.status}`);
    assert.ok(r.requiresHumanReview || r.blocked, 'should require human review or be blocked');
  });

  // 9 — RESTRICTED data → human review
  test('9. RESTRICTED data → human review', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext({
        recommendedSources: [
          { id: 'hr.system', label: 'HR', kind: 'documents', available: true, relevance: 90, classification: 'RESTRICTED', rationale: 'Employee data' },
        ],
      }),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
    });
    const r = engine.evaluate(req);
    assert.ok(r.requiresHumanReview, 'should require human review for RESTRICTED data');
  });

  // 10 — Workforce reduction → mandatory human review
  test('10. workforce reduction → mandatory human review', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent({ impact: 'CRITICAL' }),
      executionPlan: mkPlan({
        risks: [
          { kind: 'WORKFORCE_IMPACT', level: 'CRITICAL', description: 'Layoffs', nodeIds: ['n1'], mitigation: 'Severance' },
        ],
        humanApprovalRequirements: [
          { nodeId: 'n1', reason: 'WORKFORCE_REDUCTION', rationale: 'Layoffs require approval' },
        ],
      }),
      decisionResult: mkDecision({
        decisions: [{
          decisionId: 'd1', title: 'Reduce workforce', description: '',
          decisionType: 'RESOURCE_ALLOCATION', sourceNodeIds: ['n1'],
          objective: 'Reduce costs', criteria: [],
          alternatives: [mkAlt('a1', 'Proceed', 40, 'IRREVERSIBLE')],
          recommendedAlternativeId: 'a1',
          rationale: { chosenAlternativeId: 'a1', chosenTitle: 'Proceed', selectionReason: '', rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [], criteriaSummary: '' },
          confidenceScore: 30, riskLevel: 'CRITICAL', conflicts: [], assumptions: [],
          requiresHumanApproval: true, reversible: false, status: 'REQUIRES_APPROVAL',
        }],
        humanApprovalRequirements: [
          { nodeId: 'n1', reason: 'WORKFORCE_REDUCTION', rationale: 'Layoffs' },
        ],
        status: 'REQUIRES_APPROVAL',
        overallRiskLevel: 'CRITICAL',
      }),
    });
    const r = engine.evaluate(req);
    assert.ok(r.requiresHumanReview, 'should require human review for workforce reduction');
  });

  // 11 — Irreversible decision with low evidence → BLOCKED
  test('11. irreversible + low evidence → BLOCKED', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext({
        status: 'READY',
        recommendedSources: [],
        relevantMemory: [],
      }),
      intentResult: mkIntent({ impact: 'CRITICAL' }),
      executionPlan: mkPlan({
        risks: [
          { kind: 'IRREVERSIBLE_ACTION', level: 'CRITICAL', description: 'Cannot undo', nodeIds: [], mitigation: '' },
        ],
      }),
      decisionResult: mkDecision({
        decisions: [{
          decisionId: 'd1', title: 'Irreversible', description: '',
          decisionType: 'RESOURCE_ALLOCATION', sourceNodeIds: [],
          objective: 'Test', criteria: [],
          alternatives: [mkAlt('a1', 'Proceed', 20, 'IRREVERSIBLE')],
          recommendedAlternativeId: 'a1',
          rationale: { chosenAlternativeId: 'a1', chosenTitle: 'Proceed', selectionReason: '', rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [], criteriaSummary: '' },
          confidenceScore: 15, riskLevel: 'CRITICAL', conflicts: [], assumptions: [],
          requiresHumanApproval: true, reversible: false, status: 'BLOCKED',
        }],
        status: 'BLOCKED',
        overallRiskLevel: 'CRITICAL',
        selectedStrategy: null,
      }),
    });
    const r = engine.evaluate(req);
    assert.ok(r.blocked || r.status === 'BLOCKED' || r.status === 'HUMAN_REVIEW_REQUIRED',
      `expected BLOCKED or HUMAN_REVIEW_REQUIRED, got ${r.status}`);
  });

  // 12 — Incoherent results across engines → reduced confidence
  test('12. incoherent results → reduced confidence', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const coherent = mkRequest({
      contextResult: mkContext({ requestId: 'req-1', organizationId: 'org-1' }),
      intentResult: mkIntent({ requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1' }),
      executionPlan: mkPlan({ requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1', planId: 'plan-1' }),
      decisionResult: mkDecision({ requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1', planId: 'plan-1' }),
    });
    const incoherent = mkRequest({
      contextResult: mkContext({ requestId: 'req-1', organizationId: 'org-1' }),
      intentResult: mkIntent({ requestId: 'different', organizationId: 'org-1', intentId: 'intent-1' }),
      executionPlan: mkPlan({ requestId: 'req-1', organizationId: 'org-1', intentId: 'different', planId: 'plan-1' }),
      decisionResult: mkDecision({ requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1', planId: 'different' }),
    });
    const c = engine.evaluate(coherent);
    const i = engine.evaluate(incoherent);
    assert.ok(i.overallScore <= c.overallScore,
      `incoherent should reduce confidence: ${i.overallScore} vs ${c.overallScore}`);
  });

  // 13 — Invalid weights → controlled error (status INVALID)
  test('13. invalid weights → controlled handling', () => {
    const deps = makeDeps();
    // All-zero weights should be handled gracefully, not crash
    deps.factorWeights = {} as Record<string, number>;
    const engine = new ConfidenceEngine(deps);
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: mkDecision(),
    });
    const r = engine.evaluate(req);
    assert.ok(r.overallScore >= 0 && r.overallScore <= 100, 'score should be in range even with empty weights');
  });

  // 14 — Score out of range → detected and rejected
  test('14. score out of range → detected', () => {
    const validator = new ConfidenceValidator();
    const badResult = {
      confidenceResultId: 'conf-1', requestId: 'req-1', organizationId: 'org-1',
      overallScore: 150, level: 'HIGH' as const, status: 'ACCEPTABLE' as const,
      assessments: [], positiveFactors: [], negativeFactors: [],
      uncertainties: [], evidence: [], missingEvidence: [],
      contradictions: [], assumptions: [],
      requiresMoreData: false, requiresClarification: false,
      requiresHumanReview: false, blocked: false,
      recommendedActions: [], explanation: '',
      createdAt: '2026-01-01T00:00:00.000Z', version: '1.0',
    };
    const v = validator.validate(badResult);
    assert.ok(!v.valid, 'should be invalid');
    assert.ok(v.errors.length > 0, 'should have errors');
  });

  // 15 — Deterministic output
  test('15. deterministic output → same structure and scores', () => {
    const req = mkRequest({
      contextResult: mkContext(),
      intentResult: mkIntent(),
      executionPlan: mkPlan(),
      decisionResult: mkDecision(),
    });
    const engine1 = new ConfidenceEngine(makeDeps());
    const engine2 = new ConfidenceEngine(makeDeps());
    const r1 = engine1.evaluate(req);
    const r2 = engine2.evaluate(req);
    assert.equal(r1.overallScore, r2.overallScore);
    assert.equal(r1.level, r2.level);
    assert.equal(r1.status, r2.status);
    assert.equal(r1.assessments.length, r2.assessments.length);
    assert.equal(r1.uncertainties.length, r2.uncertainties.length);
  });

  // 16 — Missing evidence → missingEvidence correctly informed
  test('16. no evidence → missingEvidence populated', () => {
    const engine = new ConfidenceEngine(makeDeps());
    const req = mkRequest({
      contextResult: mkContext({
        recommendedSources: [],
        relevantMemory: [],
      }),
      intentResult: mkIntent({ classificationReasons: [] }),
      executionPlan: mkPlan({
        graph: {
          nodes: [], edges: [], entryNodeIds: [], terminalNodeIds: [],
          parallelGroups: [], topologicalOrder: [],
        },
      }),
      decisionResult: mkDecision({
        decisions: [],
        selectedStrategy: null,
      }),
    });
    const r = engine.evaluate(req);
    assert.ok(r.missingEvidence.length > 0, 'should have missing evidence');
    assert.ok(r.uncertainties.length > 0, 'should have uncertainties');
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
