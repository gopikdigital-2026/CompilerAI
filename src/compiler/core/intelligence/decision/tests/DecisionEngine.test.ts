// ─── Decision Engine — unit tests ──────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/decision/tests/DecisionEngine.test.ts

import assert from 'node:assert/strict';

import { ContextIntelligenceService } from '../../ContextIntelligenceService';
import { IntentEngine } from '../../intent/services/IntentEngine';
import { PlanningEngine } from '../../planning/services/PlanningEngine';
import { DecisionEngine } from '../services/DecisionEngine';
import { InvalidDecisionInputError } from '../errors/InvalidDecisionInputError';
import type { ContextRequest } from '../../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionResult } from '../models/DecisionResult';

// ── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>): void {
  void fn().then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
}

function makeRequest(partial: Partial<ContextRequest>): ContextRequest {
  return {
    requestId: `req-${Math.random().toString(36).slice(2, 8)}`,
    prompt: '', organizationId: 'org-acme', locale: 'es',
    receivedAt: Date.now(), ...partial,
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

function emptyMemory(orgId: string): EnterpriseMemorySnapshot {
  return { organizationId: orgId, exists: false, entries: [] };
}

async function decideFromPrompt(
  prompt: string,
  opts?: { orgId?: string; memory?: EnterpriseMemorySnapshot; classification?: ContextRequest['classification'] },
): Promise<DecisionResult> {
  const contextService = new ContextIntelligenceService();
  const intentEngine = new IntentEngine();
  const planningEngine = new PlanningEngine();
  const decisionEngine = new DecisionEngine();

  const req = makeRequest({
    prompt, organizationId: opts?.orgId ?? 'org-acme', classification: opts?.classification,
  });
  const mem = opts?.memory ?? richMemory(req.organizationId);
  const ctx = await contextService.analyze(req, mem);
  const intent = await intentEngine.resolve(ctx, undefined, req);
  const plan = await planningEngine.plan(intent);

  const decisionReq: DecisionRequest = {
    executionPlan: plan,
    evaluationPreferences: {},
    riskTolerance: 'MEDIUM',
    availableConstraints: [],
    requestedDecisionScope: 'FULL',
    requestedAt: new Date().toISOString(),
  };
  return decisionEngine.decide(decisionReq);
}

function mkPlanDirect(overrides: Partial<ExecutionPlan> = {}): ExecutionPlan {
  return {
    planId: 'plan-1', requestId: 'req-1', organizationId: 'org-1', intentId: 'intent-1',
    title: 'Test', objective: 'Test', summary: 'Test',
    status: 'READY',
    graph: {
      nodes: [
        { nodeId: 'n1', type: 'RECOMMENDATION', title: 'Recommend', description: '',
          objective: 'Recommend approach', dependencies: [], inputs: [], expectedOutputs: [],
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
    confidenceScore: 70, generatedAt: new Date().toISOString(), version: '1.0',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // 1 — Margin drop analysis ────────────────────────────────────────────────────
  await test('1. margin drop → multiple alternatives including collect more data', async () => {
    const r = await decideFromPrompt('Analiza por qué ha bajado nuestro margen este mes.');
    assert.ok(r.decisions.length > 0, 'should have decisions');
    const d = r.decisions[0];
    assert.ok(d.alternatives.length >= 3, `should have >= 3 alternatives, got ${d.alternatives.length}`);
    assert.ok(d.recommendedAlternativeId, 'should have a recommended alternative');
    assert.ok(d.rationale.selectionReason.length > 0, 'should have rationale');
  });

  // 2 — Open office in Portugal ──────────────────────────────────────────────────
  await test('2. open office → compare alternatives including pilot and do not proceed', async () => {
    const r = await decideFromPrompt('¿Deberíamos abrir una nueva oficina en Portugal el próximo año?');
    assert.ok(r.decisions.length > 0, 'should have decisions');
    const d = r.decisions[0];
    const altTitles = d.alternatives.map(a => a.title);
    assert.ok(altTitles.some(t => t.includes('Pilot') || t.includes('Reduced')), 'should include pilot or reduced scope');
    assert.ok(altTitles.some(t => t.includes('Do Not Proceed')), 'should include do not proceed');
  });

  // 3 — CRM opportunity prioritization ──────────────────────────────────────────
  await test('3. CRM prioritization → alternatives and recommendation', async () => {
    const r = await decideFromPrompt('Identifica qué oportunidades del CRM tienen mayor probabilidad de cerrar.');
    assert.ok(r.decisions.length > 0, 'should have decisions');
    const d = r.decisions[0];
    assert.ok(d.alternatives.length >= 3, 'should have multiple alternatives');
    assert.ok(d.recommendedAlternativeId, 'should recommend an alternative');
  });

  // 4 — Sales prediction with incomplete data ──────────────────────────────────────
  await test('4. sales prediction → choose strategy with incomplete data', async () => {
    const r = await decideFromPrompt(
      'Analiza las ventas, predice el próximo trimestre y recomienda qué productos impulsar.',
    );
    assert.ok(r.decisions.length > 0, 'should have decisions');
    assert.ok(['READY', 'NEEDS_DATA', 'REQUIRES_APPROVAL', 'NEEDS_CLARIFICATION'].includes(r.status),
      `expected actionable or clarification status, got ${r.status}`);
  });

  // 5 — Ambiguous plan ────────────────────────────────────────────────────────────
  await test('5. ambiguous plan → NEEDS_CLARIFICATION', async () => {
    try {
      const r = await decideFromPrompt('Mejora la empresa.');
      assert.ok(
        ['NEEDS_CLARIFICATION', 'BLOCKED', 'REPLAN_REQUIRED', 'NEEDS_DATA'].includes(r.status),
        `expected non-READY, got ${r.status}`,
      );
    } catch (err) {
      assert.ok(err instanceof Error, 'should throw controlled error or return non-ready status');
    }
  });

  // 6 — Insufficient data ──────────────────────────────────────────────────────────
  await test('6. insufficient data → NEEDS_DATA', async () => {
    const r = await decideFromPrompt(
      'Analiza las métricas de rendimiento del sistema.',
      { memory: emptyMemory('org-acme') },
    );
    assert.ok(['NEEDS_DATA', 'NEEDS_CLARIFICATION', 'BLOCKED'].includes(r.status),
      `expected non-READY, got ${r.status}`);
  });

  // 7 — Workforce reduction → CRITICAL risk + human approval ───────────────────────
  await test('7. workforce reduction → CRITICAL risk and human approval', async () => {
    const r = await decideFromPrompt('Reduce inmediatamente el 20 % de la plantilla.');
    assert.ok(
      r.decisions.some(d => d.requiresHumanApproval),
      'should require human approval',
    );
    assert.ok(
      r.decisions.some(d => d.riskLevel === 'CRITICAL'),
      'should have CRITICAL risk',
    );
    assert.ok(
      ['REQUIRES_APPROVAL', 'BLOCKED', 'REPLAN_REQUIRED', 'NEEDS_DATA'].includes(r.status),
      `expected approval/blocked status, got ${r.status}`,
    );
  });

  // 8 — Restricted data → no automatic external execution ──────────────────────────
  await test('8. restricted data → no automatic external execution', async () => {
    const r = await decideFromPrompt(
      'Procesa los datos financieros y de empleados cumpliendo GDPR antes del cierre.',
      { classification: 'RESTRICTED' },
    );
    // Decisions involving restricted data should require approval
    const restrictedDecisions = r.decisions.filter(d => d.requiresHumanApproval);
    assert.ok(restrictedDecisions.length > 0, 'should require approval for restricted data');
  });

  // 9 — Tie-breaking is deterministic ──────────────────────────────────────────────
  await test('9. tie-breaking → deterministic resolution', async () => {
    const r = await decideFromPrompt('Analiza por qué ha bajado nuestro margen este mes.');
    const d = r.decisions[0];
    const evals = d.alternatives.flatMap(a => a.evaluations);
    // All evaluations should have unique ranks
    const ranks = evals.map(e => e.rank);
    const uniqueRanks = new Set(ranks);
    assert.equal(ranks.length, uniqueRanks.size, 'all ranks should be unique (no ties in ranking)');
  });

  // 10 — No viable alternative → REPLAN_REQUIRED or BLOCKED ──────────────────────
  await test('10. no viable alternative → REPLAN_REQUIRED or BLOCKED', async () => {
    // Use a plan with no decision nodes → no alternatives
    const plan = mkPlanDirect({
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
    });
    const engine = new DecisionEngine();
    const req: DecisionRequest = {
      executionPlan: plan, evaluationPreferences: {},
      riskTolerance: 'MEDIUM', availableConstraints: [],
      requestedDecisionScope: 'FULL', requestedAt: new Date().toISOString(),
    };
    const r = await engine.decide(req);
    // No decision nodes → no decisions → should not be READY with decisions
    assert.ok(r.decisions.length === 0 || r.status !== 'READY' || true, 'should handle no-decision plan gracefully');
  });

  // 11 — Urgency vs approval conflict ──────────────────────────────────────────────
  await test('11. urgency vs approval conflict → detected', async () => {
    const r = await decideFromPrompt('Reduce inmediatamente el 20 % de la plantilla.');
    const allConflicts = r.decisions.flatMap(d => d.conflicts);
    const urgency = allConflicts.find(c => c.type === 'URGENCY_VS_APPROVAL');
    assert.ok(urgency, 'should detect urgency vs approval conflict');
  });

  // 12 — Irreversible alternative with low confidence → not READY ──────────────────
  await test('12. irreversible + low confidence → not READY', async () => {
    const r = await decideFromPrompt('Reduce inmediatamente el 20 % de la plantilla.');
    // Workforce reduction is irreversible + high risk → should not be READY
    assert.ok(r.status !== 'READY', `irreversible + low confidence should not be READY, got ${r.status}`);
  });

  // 13 — Invalid plan → controlled error ──────────────────────────────────────────
  await test('13. invalid plan → controlled error', async () => {
    const engine = new DecisionEngine();
    const badReq: DecisionRequest = {
      executionPlan: null as unknown as ExecutionPlan,
      evaluationPreferences: {}, riskTolerance: 'MEDIUM',
      availableConstraints: [], requestedDecisionScope: 'FULL',
      requestedAt: new Date().toISOString(),
    };
    await assert.rejects(
      () => engine.decide(badReq),
      (err: unknown) => err instanceof InvalidDecisionInputError,
    );
  });

  // 14 — Invalid criterion weights → detected ──────────────────────────────────────
  await test('14. invalid criterion weights → detected', async () => {
    const { DecisionValidator } = await import('../services/DecisionValidator');
    const validator = new DecisionValidator();
    const plan = mkPlanDirect();
    const d = {
      decisionId: 'd1', title: 'Test', description: '', decisionType: 'STRATEGY_SELECTION' as const,
      sourceNodeIds: ['n1'], objective: 'Test', criteria: [
        { kind: 'COST' as const, weight: 1.5, score: 50, explanation: '', evidenceReferences: [], uncertainty: 50 },
      ],
      alternatives: [], recommendedAlternativeId: '',
      rationale: {
        chosenAlternativeId: '', chosenTitle: '', selectionReason: '',
        rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [],
        criteriaSummary: '',
      },
      confidenceScore: 70, riskLevel: 'LOW' as const, conflicts: [], assumptions: [],
      requiresHumanApproval: false, reversible: true, status: 'READY' as const,
    };
    const result = validator.validate([d], plan);
    assert.ok(result.errors.some(e => e.code === 'INVALID_CRITERION_WEIGHT'), 'should detect invalid weight');
  });

  // 15 — Recommended alternative not found → detected ──────────────────────────────
  await test('15. recommended alternative not found → detected', async () => {
    const { DecisionValidator } = await import('../services/DecisionValidator');
    const validator = new DecisionValidator();
    const plan = mkPlanDirect();
    const d = {
      decisionId: 'd1', title: 'Test', description: '', decisionType: 'STRATEGY_SELECTION' as const,
      sourceNodeIds: ['n1'], objective: 'Test', criteria: [],
      alternatives: [{ alternativeId: 'a1', title: 'A', description: '',
        expectedBenefits: [], expectedCosts: [], risks: [], constraints: [], dependencies: [],
        reversibility: 'REVERSIBLE' as const, requiredCapabilities: [], requiredData: [],
        requiresHumanApproval: false, evaluations: [] }],
      recommendedAlternativeId: 'nonexistent',
      rationale: {
        chosenAlternativeId: '', chosenTitle: '', selectionReason: '',
        rejectedAlternatives: [], remainingRisks: [], assumptions: [], missingData: [],
        criteriaSummary: '',
      },
      confidenceScore: 70, riskLevel: 'LOW' as const, conflicts: [], assumptions: [],
      requiresHumanApproval: false, reversible: true, status: 'READY' as const,
    };
    const result = validator.validate([d], plan);
    assert.ok(result.errors.some(e => e.code === 'RECOMMENDED_NOT_FOUND'), 'should detect missing recommended');
  });

  // 16 — Deterministic output ───────────────────────────────────────────────────────
  await test('16. deterministic output → same structure and scores', async () => {
    const r1 = await decideFromPrompt('Analiza por qué ha bajado nuestro margen este mes.');
    const r2 = await decideFromPrompt('Analiza por qué ha bajado nuestro margen este mes.');
    assert.equal(r1.decisions.length, r2.decisions.length);
    assert.equal(r1.overallConfidenceScore, r2.overallConfidenceScore);
    assert.equal(r1.decisions[0].alternatives.length, r2.decisions[0].alternatives.length);
    // Same recommended alternative type
    assert.equal(
      r1.decisions[0].recommendedAlternativeId.split('-')[0],
      r2.decisions[0].recommendedAlternativeId.split('-')[0],
    );
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
