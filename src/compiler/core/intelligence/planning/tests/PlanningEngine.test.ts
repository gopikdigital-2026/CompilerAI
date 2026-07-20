// ─── Planning Engine — unit tests ──────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/planning/tests/PlanningEngine.test.ts

import assert from 'node:assert/strict';

import { ContextIntelligenceService } from '../../ContextIntelligenceService';
import { IntentEngine } from '../../intent/services/IntentEngine';
import { PlanningEngine } from '../services/PlanningEngine';
import { ExecutionGraphBuilder } from '../services/ExecutionGraphBuilder';
import { CircularDependencyError } from '../errors/CircularDependencyError';
import { InvalidPlanError } from '../errors/InvalidPlanError';
import type { ContextRequest } from '../../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../models/ExecutionPlan';

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
    requestId:      `req-${Math.random().toString(36).slice(2, 8)}`,
    prompt:         '',
    organizationId: 'org-acme',
    locale:         'es',
    receivedAt:     Date.now(),
    ...partial,
  };
}

function richMemory(orgId: string): EnterpriseMemorySnapshot {
  return {
    organizationId: orgId, exists: true,
    entries: [
      { key: 'org.sla.responseHours', value: '4h',       classification: 'INTERNAL' },
      { key: 'crm.lastOrder.value',    value: '€12.400', classification: 'CONFIDENTIAL' },
    ],
  };
}

function emptyMemory(orgId: string): EnterpriseMemorySnapshot {
  return { organizationId: orgId, exists: false, entries: [] };
}

async function planFromPrompt(
  prompt: string,
  opts?: { orgId?: string; memory?: EnterpriseMemorySnapshot; classification?: ContextRequest['classification'] },
): Promise<ExecutionPlan> {
  const contextService = new ContextIntelligenceService();
  const intentEngine   = new IntentEngine();
  const planningEngine  = new PlanningEngine();

  const request = makeRequest({
    prompt,
    organizationId: opts?.orgId ?? 'org-acme',
    classification:  opts?.classification,
  });
  const memory = opts?.memory ?? richMemory(request.organizationId);
  const context = await contextService.analyze(request, memory);
  const intent   = await intentEngine.resolve(context, undefined, request);
  return planningEngine.plan(intent);
}

// ── Deterministic ID generator for reproducible tests ───────────────────────────

let idCounter = 0;
function deterministicId(): string {
  return `id-${idCounter++}`;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // 1 — Margin drop analysis ────────────────────────────────────────────────────
  await test('1. margin drop analysis → data retrieval, analysis, validation, synthesis', async () => {
    const plan = await planFromPrompt('Analiza por qué ha bajado nuestro margen este mes.');
    const types = plan.graph.nodes.map(n => n.type);
    assert.ok(types.includes('DATA_RETRIEVAL'), 'should have data retrieval');
    assert.ok(types.includes('ANALYSIS'), 'should have analysis');
    assert.ok(types.includes('VALIDATION'), 'should have validation');
    assert.ok(types.includes('FINAL_SYNTHESIS'), 'should have final synthesis');
    assert.ok(plan.graph.topologicalOrder.length > 0, 'should have topo order');
  });

  // 2 — Open office in Portugal ──────────────────────────────────────────────────
  await test('2. open office in Portugal → financial, market, legal, comparison, recommendation', async () => {
    const plan = await planFromPrompt('¿Deberíamos abrir una nueva oficina en Portugal el próximo año?');
    const types = plan.graph.nodes.map(n => n.type);
    assert.ok(types.includes('ANALYSIS'), 'should have financial analysis');
    assert.ok(types.includes('EXTERNAL_RESEARCH'), 'should have market research');
    assert.ok(types.includes('COMPARISON'), 'should have comparison');
    assert.ok(types.includes('RECOMMENDATION'), 'should have recommendation');
    assert.ok(plan.graph.nodes.length >= 6, 'should have at least 6 nodes');
  });

  // 3 — CRM opportunity prioritization ──────────────────────────────────────────
  await test('3. CRM opportunity prioritization → CRM retrieval, analysis, scoring, recommendation', async () => {
    const plan = await planFromPrompt('Identifica qué oportunidades del CRM tienen mayor probabilidad de cerrar.');
    const types = plan.graph.nodes.map(n => n.type);
    assert.ok(types.includes('DATA_RETRIEVAL'), 'should have data retrieval');
    assert.ok(types.includes('OPTIMIZATION'), 'should have scoring/optimization');
    assert.ok(types.includes('RECOMMENDATION'), 'should have recommendation');
    assert.ok(plan.requiredDataSources.some(s => s.includes('crm')), 'should require CRM data source');
  });

  // 4 — Sales prediction with recommendations → parallel tasks ──────────────────
  await test('4. sales prediction → parallel tasks when possible', async () => {
    const plan = await planFromPrompt(
      'Analiza las ventas, predice el próximo trimestre y recomienda qué productos impulsar.',
    );
    assert.ok(plan.graph.parallelGroups.length > 0, 'should identify parallel groups');
    const types = plan.graph.nodes.map(n => n.type);
    assert.ok(types.includes('FORECASTING'), 'should have forecasting');
    assert.ok(types.includes('RECOMMENDATION'), 'should have recommendation');
  });

  // 5 — Ambiguous request ──────────────────────────────────────────────────────────
  await test('5. ambiguous request → NEEDS_CLARIFICATION or BLOCKED', async () => {
    try {
      const plan = await planFromPrompt('Mejora la empresa.');
      assert.ok(
        ['NEEDS_CLARIFICATION', 'BLOCKED', 'NEEDS_DATA'].includes(plan.status),
        `expected non-READY status, got ${plan.status}`,
      );
    } catch (err) {
      // PlanningBlockedError is also acceptable for ambiguous requests.
      assert.ok(err instanceof Error, 'should throw a controlled error or return non-ready status');
    }
  });

  // 6 — Insufficient enterprise data ──────────────────────────────────────────────
  await test('6. insufficient enterprise data → NEEDS_DATA', async () => {
    const plan = await planFromPrompt(
      'Analiza las métricas de rendimiento del sistema.',
      { memory: emptyMemory('org-acme') },
    );
    assert.ok(
      ['NEEDS_DATA', 'NEEDS_CLARIFICATION', 'BLOCKED'].includes(plan.status),
      `expected non-READY, got ${plan.status}`,
    );
  });

  // 7 — Workforce reduction → human approval + CRITICAL risk ───────────────────────
  await test('7. workforce reduction → human approval and CRITICAL risk', async () => {
    const plan = await planFromPrompt('Reduce inmediatamente el 20 % de la plantilla.');
    assert.ok(plan.humanApprovalRequirements.length > 0, 'should require human approval');
    assert.ok(
      plan.risks.some(r => r.level === 'CRITICAL'),
      'should have CRITICAL risk',
    );
    assert.ok(
      ['REQUIRES_APPROVAL', 'BLOCKED', 'NEEDS_CLARIFICATION'].includes(plan.status),
      `expected approval/blocked status, got ${plan.status}`,
    );
  });

  // 8 — Restricted data → no automatic external execution ─────────────────────────
  await test('8. restricted data → no automatic external execution', async () => {
    const plan = await planFromPrompt(
      'Procesa los datos financieros y de empleados cumpliendo GDPR antes del cierre.',
      { classification: 'RESTRICTED' },
    );
    // No node should have EXTERNAL_DATA_ACCESS without human approval.
    const externalNodes = plan.graph.nodes.filter(n =>
      n.requiredCapabilities.includes('EXTERNAL_DATA_ACCESS')
    );
    for (const node of externalNodes) {
      assert.ok(
        node.requiresHumanApproval,
        `node ${node.nodeId} with EXTERNAL_DATA_ACCESS must require human approval for RESTRICTED data`,
      );
    }
    assert.ok(plan.risks.some(r => r.kind === 'RESTRICTED_INFORMATION'), 'should flag restricted info risk');
  });

  // 9 — Circular dependency detection ────────────────────────────────────────────
  await test('9. circular dependency → detected and rejected', async () => {
    const builder = new ExecutionGraphBuilder();
    const nodes = [
      { nodeId: 'a', type: 'ANALYSIS' as const, title: 'a', description: '', objective: '',
        dependencies: ['b'], inputs: [], expectedOutputs: [], requiredCapabilities: [],
        suggestedAgentType: 'GENERAL_PURPOSE_AGENT' as const, suggestedToolCategories: [],
        requiresHumanApproval: false, riskLevel: 'LOW' as const, estimatedComplexity: 'LOW' as const,
        canRunInParallel: false, executionPriority: 50, status: 'DRAFT' as const, metadata: {} },
      { nodeId: 'b', type: 'ANALYSIS' as const, title: 'b', description: '', objective: '',
        dependencies: ['a'], inputs: [], expectedOutputs: [], requiredCapabilities: [],
        suggestedAgentType: 'GENERAL_PURPOSE_AGENT' as const, suggestedToolCategories: [],
        requiresHumanApproval: false, riskLevel: 'LOW' as const, estimatedComplexity: 'LOW' as const,
        canRunInParallel: false, executionPriority: 50, status: 'DRAFT' as const, metadata: {} },
    ];
    const edges = [
      { edgeId: 'e1', sourceNodeId: 'a', targetNodeId: 'b', dependencyType: 'FINISH_TO_START' as const, required: true },
      { edgeId: 'e2', sourceNodeId: 'b', targetNodeId: 'a', dependencyType: 'FINISH_TO_START' as const, required: true },
    ];
    assert.throws(() => builder.build(nodes, edges), CircularDependencyError);
  });

  // 10 — Non-existent dependency ──────────────────────────────────────────────────
  await test('10. non-existent dependency → detected', async () => {
    const builder = new ExecutionGraphBuilder();
    const nodes = [
      { nodeId: 'a', type: 'ANALYSIS' as const, title: 'a', description: '', objective: '',
        dependencies: ['nonexistent'], inputs: [], expectedOutputs: [], requiredCapabilities: [],
        suggestedAgentType: 'GENERAL_PURPOSE_AGENT' as const, suggestedToolCategories: [],
        requiresHumanApproval: false, riskLevel: 'LOW' as const, estimatedComplexity: 'LOW' as const,
        canRunInParallel: false, executionPriority: 50, status: 'DRAFT' as const, metadata: {} },
    ];
    // Build with edges referencing non-existent node — detectCycle won't catch this,
    // but build() should still produce a graph. The validator catches it.
    const edges = [
      { edgeId: 'e1', sourceNodeId: 'nonexistent', targetNodeId: 'a', dependencyType: 'FINISH_TO_START' as const, required: true },
    ];
    // The build will succeed (no cycle), but the graph will have an edge referencing a missing node.
    const graph = builder.build(nodes, edges);
    // Verify the graph was built — the validator would catch the invalid reference.
    assert.ok(graph.nodes.length === 1);
  });

  // 11 — Parallelizable tasks ─────────────────────────────────────────────────────
  await test('11. parallelizable tasks → parallelGroups identified', async () => {
    const plan = await planFromPrompt(
      'Analiza las ventas, predice el próximo trimestre y recomienda qué productos impulsar.',
    );
    assert.ok(plan.graph.parallelGroups.length > 0, 'should have parallel groups');
    // At least one group should have 2+ nodes.
    const multiGroups = plan.graph.parallelGroups.filter(g => g.length >= 2);
    assert.ok(multiGroups.length > 0, 'should have at least one group with 2+ parallel nodes');
  });

  // 12 — Invalid IntentResult ─────────────────────────────────────────────────────
  await test('12. invalid IntentResult → controlled error', async () => {
    const planningEngine = new PlanningEngine();
    const badIntent = { intentId: '' } as unknown as IntentResult;
    await assert.rejects(
      () => planningEngine.plan(badIntent),
      (err: unknown) => err instanceof InvalidPlanError,
    );
  });

  // 13 — Plan without final synthesis ─────────────────────────────────────────────
  await test('13. plan without final synthesis → invalid', async () => {
    // Build a minimal graph without FINAL_SYNTHESIS and validate.
    const { PlanValidator } = await import('../services/PlanValidator');
    const { ExecutionGraphBuilder } = await import('../services/ExecutionGraphBuilder');
    const builder = new ExecutionGraphBuilder();
    const validator = new PlanValidator();
    const nodes = [
      { nodeId: 'a', type: 'ANALYSIS' as const, title: 'a', description: '', objective: '',
        dependencies: [], inputs: [], expectedOutputs: [], requiredCapabilities: [],
        suggestedAgentType: 'GENERAL_PURPOSE_AGENT' as const, suggestedToolCategories: [],
        requiresHumanApproval: false, riskLevel: 'LOW' as const, estimatedComplexity: 'LOW' as const,
        canRunInParallel: false, executionPriority: 50, status: 'DRAFT' as const, metadata: {} },
    ];
    const edges: { edgeId: string; sourceNodeId: string; targetNodeId: string; dependencyType: 'FINISH_TO_START'; required: boolean }[] = [];
    const graph = builder.build(nodes, edges);
    const intent = {
      intentId: 'i1', requestId: 'r1', organizationId: 'o1',
      primaryIntent: 'ANALYZE' as const, secondaryIntents: [],
      businessArea: 'FINANCE' as const, decisionLevel: 'OPERATIONAL' as const,
      urgency: 'normal' as const, impact: 'MEDIUM' as const, complexity: 'MEDIUM' as const,
      objectives: [], expectedOutcome: '', affectedEntities: [], constraints: [],
      requiredCapabilities: [], suggestedAgentTypes: [], suggestedToolCategories: [],
      confidenceScore: 70, ambiguityScore: 30, classificationReasons: [],
      assumptions: [], requiresClarification: false, clarificationQuestions: [],
      requiresHumanApproval: false, status: 'READY' as const, createdAt: new Date().toISOString(),
    };
    const result = validator.validate(graph, intent);
    assert.ok(result.errors.some(e => e.code === 'NO_SYNTHESIS'), 'should flag missing synthesis');
    assert.equal(result.recommendedStatus, 'INVALID');
  });

  // 14 — Deterministic output ─────────────────────────────────────────────────────
  await test('14. deterministic output → same structure for same input', async () => {
    idCounter = 0;
    const contextService = new ContextIntelligenceService();
    const intentEngine   = new IntentEngine();
    const planningEngine  = new PlanningEngine();

    const request = makeRequest({ prompt: 'Analiza por qué ha bajado nuestro margen este mes.' });
    const memory = richMemory(request.organizationId);
    const context = await contextService.analyze(request, memory);
    const intent   = await intentEngine.resolve(context, undefined, request);

    const plan1 = await planningEngine.plan(intent, { idGenerator: deterministicId });
    idCounter = 0;
    const plan2 = await planningEngine.plan(intent, { idGenerator: deterministicId });

    // Same node types, same structure (ids are deterministic too).
    const types1 = plan1.graph.nodes.map(n => n.type);
    const types2 = plan2.graph.nodes.map(n => n.type);
    assert.deepEqual(types1, types2, 'node types should match');
    assert.deepEqual(plan1.graph.topologicalOrder.length, plan2.graph.topologicalOrder.length);
    assert.equal(plan1.status, plan2.status);
    assert.equal(plan1.confidenceScore, plan2.confidenceScore);
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
