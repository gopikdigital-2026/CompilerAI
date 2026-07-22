// ─── Tool Intelligence Engine — unit tests ──────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/tools/tests/ToolIntelligenceEngine.test.ts

import assert from 'node:assert/strict';
import { ToolIntelligenceEngine } from '../services/ToolIntelligenceEngine';
import { ToolRegistry } from '../registry/ToolRegistry';
import { ToolRiskAnalyzer } from '../services/ToolRiskAnalyzer';
import { ToolRegistryError } from '../errors/ToolErrors';
import {
  isToolAllowed, hasRequiredPermissions, findIncompatibleTools, meetsConfidenceThreshold,
} from '../policies/ToolPolicies';
import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolPolicy } from '../models/ToolPolicy';
import type { ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';

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
    idGenerator: () => `tid-${(++idCounter).toString().padStart(4, '0')}`,
    clock: FIXED_CLOCK,
    registry: new ToolRegistry(),
  };
}

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    toolId: `tool-${++idCounter}`,
    name: 'Test Tool',
    description: 'A test tool',
    category: 'ANALYSIS',
    version: '1.0.0',
    status: 'ACTIVE',
    capabilities: [{ capabilityId: `cap-${idCounter}`, requiredCapability: 'DATA_ANALYSIS', proficiency: 80, specialization: null }],
    requirements: {
      requiredPermissions: ['READ_PUBLIC'],
      maxDataSensitivity: 'PUBLIC',
      requiresConsent: false,
      requiredOrgTiers: [],
      incompatibleWith: [],
      minConfidenceThreshold: 0,
    },
    priorityWeight: 50,
    canFallback: false,
    fallbackFor: [],
    tags: [],
    metadata: {},
    ...overrides,
  };
}

function makePolicy(overrides: Partial<ToolPolicy> = {}): ToolPolicy {
  return {
    policyId: `pol-${++idCounter}`,
    organizationId: 'org-acme',
    allowedToolIds: [],
    deniedToolIds: [],
    grantedPermissions: ['READ_PUBLIC', 'READ_INTERNAL', 'EXECUTE'],
    maxDataSensitivity: 'INTERNAL',
    consentGranted: true,
    orgTier: 'enterprise',
    allowFallback: true,
    ...overrides,
  };
}

function makeIntent(): IntentResult {
  return {
    intentId: 'intent-1', requestId: 'req-1', organizationId: 'org-acme',
    primaryIntent: 'ANALYZE', secondaryIntents: [],
    businessArea: 'FINANCE', decisionLevel: 'STRATEGIC',
    urgency: 'normal', impact: 'MEDIUM', complexity: 'MEDIUM',
    objectives: [], expectedOutcome: '', affectedEntities: [], constraints: [],
    requiredCapabilities: ['DATA_ANALYSIS'],
    suggestedAgentTypes: [], suggestedToolCategories: [],
    confidenceScore: 80, ambiguityScore: 20,
    classificationReasons: [], assumptions: [],
    requiresClarification: false, clarificationQuestions: [],
    requiresHumanApproval: false, status: 'READY',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeConfidence(score = 75): ConfidenceResult {
  return {
    confidenceResultId: 'conf-1', requestId: 'req-1', organizationId: 'org-acme',
    overallScore: score, level: 'HIGH', status: 'ACCEPTABLE',
    assessments: [], positiveFactors: [], negativeFactors: [],
    uncertainties: [], evidence: [], missingEvidence: [],
    contradictions: [], assumptions: [],
    requiresMoreData: false, requiresClarification: false,
    requiresHumanReview: false, blocked: false,
    recommendedActions: [], explanation: '',
    createdAt: '2026-01-01T00:00:00.000Z', version: '1.0.0',
  };
}

function makeContext(overrides: Partial<ToolSelectionContext> = {}): ToolSelectionContext {
  return {
    organizationId: 'org-acme',
    intentResult: makeIntent(),
    confidenceResult: makeConfidence(),
    ...overrides,
  };
}

async function run(): Promise<void> {

  // ── Registry ──────────────────────────────────────────────────────────────────

  test('1. registry — register and find by ID', () => {
    const registry = new ToolRegistry();
    const tool = makeTool({ toolId: 't1' });
    registry.register(tool);
    assert.equal(registry.findById('t1')?.toolId, 't1');
  });

  test('2. registry — duplicate registration throws', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ toolId: 't1' }));
    assert.throws(() => registry.register(makeTool({ toolId: 't1' })), (err: unknown) => err instanceof ToolRegistryError);
  });

  test('3. registry — findByCapability', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ toolId: 't1', capabilities: [{ capabilityId: 'c1', requiredCapability: 'DATA_ANALYSIS', proficiency: 90, specialization: null }] }));
    registry.register(makeTool({ toolId: 't2', capabilities: [{ capabilityId: 'c2', requiredCapability: 'FORECASTING', proficiency: 70, specialization: null }] }));
    const found = registry.findByCapability('DATA_ANALYSIS');
    assert.equal(found.length, 1);
    assert.equal(found[0].toolId, 't1');
  });

  test('4. registry — findById returns null for unknown', () => {
    const registry = new ToolRegistry();
    assert.equal(registry.findById('nonexistent'), null);
  });

  test('5. registry — unregister removes tool', () => {
    const registry = new ToolRegistry();
    registry.register(makeTool({ toolId: 't1' }));
    assert.ok(registry.unregister('t1'));
    assert.equal(registry.findById('t1'), null);
  });

  // ── Selection ─────────────────────────────────────────────────────────────────

  test('6. selection — selects tools matching required capabilities', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', priorityWeight: 80 }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.ok(plan.steps.length > 0, 'should select at least one tool');
    assert.equal(plan.steps[0].toolId, 't1');
  });

  test('7. selection — ranking is explainable with rationales', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', priorityWeight: 90, capabilities: [{ capabilityId: 'c1', requiredCapability: 'DATA_ANALYSIS', proficiency: 95, specialization: null }] }));
    deps.registry.register(makeTool({ toolId: 't2', priorityWeight: 50, capabilities: [{ capabilityId: 'c2', requiredCapability: 'DATA_ANALYSIS', proficiency: 60, specialization: null }] }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.equal(plan.steps[0].toolId, 't1', 'higher proficiency+priority should rank first');
    assert.ok(plan.steps[0].selection.rationales.length > 0);
    const factors = plan.steps[0].selection.rationales.map(r => r.factor);
    assert.ok(factors.includes('coverage'));
    assert.ok(factors.includes('proficiency'));
    assert.ok(factors.includes('priority'));
    assert.ok(factors.includes('confidence'));
  });

  test('8. selection — deterministic ordering (same input = same output)', () => {
    const deps1 = makeDeps();
    deps1.registry.register(makeTool({ toolId: 't1', priorityWeight: 70 }));
    deps1.registry.register(makeTool({ toolId: 't2', priorityWeight: 70 }));
    const deps2 = makeDeps();
    deps2.registry.register(makeTool({ toolId: 't1', priorityWeight: 70 }));
    deps2.registry.register(makeTool({ toolId: 't2', priorityWeight: 70 }));
    const engine1 = new ToolIntelligenceEngine(deps1);
    const engine2 = new ToolIntelligenceEngine(deps2);
    const ctx = makeContext();
    const pol = makePolicy();
    const plan1 = engine1.selectTools(ctx, pol);
    const plan2 = engine2.selectTools(ctx, pol);
    assert.equal(plan1.steps.length, plan2.steps.length);
    assert.equal(plan1.steps[0].toolId, plan2.steps[0].toolId);
  });

  // ── Rejection ─────────────────────────────────────────────────────────────────

  test('9. rejection — tool with insufficient permissions rejected', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, requiredPermissions: ['ADMIN'] } }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy({ grantedPermissions: ['READ_PUBLIC'] }));
    assert.equal(plan.status, 'EMPTY', 'should be empty when no tools pass permission check');
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'ToolRejected'));
  });

  test('10. rejection — tool denied by org policy', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1' }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy({ deniedToolIds: ['t1'] }));
    assert.equal(plan.status, 'EMPTY');
  });

  test('11. rejection — tool below confidence threshold rejected', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, minConfidenceThreshold: 90 } }));
    const engine = new ToolIntelligenceEngine(deps);
    const ctx = makeContext({ confidenceResult: makeConfidence(50) });
    const plan = engine.selectTools(ctx, makePolicy());
    assert.equal(plan.status, 'EMPTY');
  });

  // ── Permissions ───────────────────────────────────────────────────────────────

  test('12. permissions — hasRequiredPermissions checks all required', () => {
    assert.ok(hasRequiredPermissions(['READ_PUBLIC'], ['READ_PUBLIC', 'EXECUTE']));
    assert.ok(!hasRequiredPermissions(['ADMIN'], ['READ_PUBLIC']));
  });

  test('13. permissions — isToolAllowed respects deny list', () => {
    const tool = makeTool({ toolId: 't1' });
    assert.ok(!isToolAllowed(tool, makePolicy({ deniedToolIds: ['t1'] })));
    assert.ok(isToolAllowed(tool, makePolicy({ deniedToolIds: [], allowedToolIds: [] })));
  });

  test('14. permissions — isToolAllowed respects allow list', () => {
    const tool = makeTool({ toolId: 't1' });
    assert.ok(!isToolAllowed(tool, makePolicy({ allowedToolIds: ['t2'] })));
    assert.ok(isToolAllowed(tool, makePolicy({ allowedToolIds: ['t1'] })));
  });

  // ── Risk ──────────────────────────────────────────────────────────────────────

  test('15. risk — incompatibility detected', () => {
    const analyzer = new ToolRiskAnalyzer(() => 'rid-1');
    const t1 = makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, incompatibleWith: ['t2'] } });
    const t2 = makeTool({ toolId: 't2' });
    const assessment = analyzer.analyze([t1, t2], makeContext());
    assert.ok(assessment.incompatibleTools.length > 0);
    assert.equal(assessment.overallRiskLevel, 'HIGH');
  });

  test('16. risk — sensitive data exposure flagged', () => {
    const analyzer = new ToolRiskAnalyzer(() => 'rid-1');
    const tool = makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, maxDataSensitivity: 'CONFIDENTIAL' } });
    const assessment = analyzer.analyze([tool], makeContext());
    assert.ok(assessment.sensitiveDataExposure);
  });

  test('17. risk — low confidence increases risk', () => {
    const analyzer = new ToolRiskAnalyzer(() => 'rid-1');
    const assessment = analyzer.analyze([makeTool()], makeContext({ confidenceResult: makeConfidence(30) }));
    assert.equal(assessment.overallRiskLevel, 'HIGH');
    assert.ok(assessment.riskFactors.some(f => f.description.includes('Low pipeline confidence')));
  });

  test('18. risk — human approval flagged', () => {
    const analyzer = new ToolRiskAnalyzer(() => 'rid-1');
    const tool = makeTool({ toolId: 't1', capabilities: [{ capabilityId: 'c1', requiredCapability: 'HUMAN_APPROVAL', proficiency: 90, specialization: null }] });
    const assessment = analyzer.analyze([tool], makeContext());
    assert.ok(assessment.requiresHumanApproval);
  });

  // ── Fallback ──────────────────────────────────────────────────────────────────

  test('19. fallback — incompatible tool replaced by fallback', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({
      toolId: 't1',
      requirements: { ...makeTool().requirements, incompatibleWith: ['t2'] },
      capabilities: [{ capabilityId: 'c1', requiredCapability: 'DATA_ANALYSIS', proficiency: 90, specialization: null }],
    }));
    deps.registry.register(makeTool({
      toolId: 't2',
      capabilities: [{ capabilityId: 'c2', requiredCapability: 'DATA_ANALYSIS', proficiency: 80, specialization: null }],
    }));
    deps.registry.register(makeTool({
      toolId: 't3-fallback',
      canFallback: true,
      fallbackFor: ['t1'],
      capabilities: [{ capabilityId: 'c3', requiredCapability: 'DATA_ANALYSIS', proficiency: 70, specialization: null }],
    }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.ok(plan.warnings.some(w => w.includes('incompatibility')), 'should warn about incompatibility');
  });

  test('20. fallback — no fallback available produces warning', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({
      toolId: 't1',
      requirements: { ...makeTool().requirements, incompatibleWith: ['t2'] },
      capabilities: [{ capabilityId: 'c1', requiredCapability: 'DATA_ANALYSIS', proficiency: 90, specialization: null }],
    }));
    deps.registry.register(makeTool({
      toolId: 't2',
      capabilities: [{ capabilityId: 'c2', requiredCapability: 'DATA_ANALYSIS', proficiency: 80, specialization: null }],
    }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.ok(plan.warnings.some(w => w.includes('No fallback')), 'should warn about missing fallback');
  });

  // ── Isolation ─────────────────────────────────────────────────────────────────

  test('21. isolation — org A policy cannot select tools denied for org B', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1' }));
    const engine = new ToolIntelligenceEngine(deps);
    const planA = engine.selectTools(makeContext({ organizationId: 'org-A' }), makePolicy({ organizationId: 'org-A', deniedToolIds: ['t1'] }));
    assert.equal(planA.status, 'EMPTY', 'org-A should not get t1');
    const planB = engine.selectTools(makeContext({ organizationId: 'org-B' }), makePolicy({ organizationId: 'org-B', deniedToolIds: [] }));
    assert.ok(planB.steps.length > 0, 'org-B should get t1');
  });

  test('22. isolation — sensitivity limit blocks tool for lower-tier org', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, maxDataSensitivity: 'CONFIDENTIAL' } }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy({ maxDataSensitivity: 'PUBLIC' }));
    assert.equal(plan.status, 'EMPTY', 'tool requiring CONFIDENTIAL should be blocked for PUBLIC-only org');
  });

  // ── No tools available ────────────────────────────────────────────────────────

  test('23. no tools — empty registry produces EMPTY plan', () => {
    const deps = makeDeps();
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.equal(plan.status, 'EMPTY');
    assert.equal(plan.totalTools, 0);
    assert.ok(plan.warnings.length > 0);
  });

  test('24. no tools — no matching capabilities produces EMPTY plan', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1', capabilities: [{ capabilityId: 'c1', requiredCapability: 'FORECASTING', proficiency: 90, specialization: null }] }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    assert.equal(plan.status, 'EMPTY');
  });

  // ── Events ────────────────────────────────────────────────────────────────────

  test('25. events — ToolSelected and ToolPlanBuilt emitted', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1' }));
    const engine = new ToolIntelligenceEngine(deps);
    engine.selectTools(makeContext(), makePolicy());
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'ToolSelected'));
    assert.ok(events.some(e => e.eventType === 'ToolPlanBuilt'));
  });

  // ── Policies ──────────────────────────────────────────────────────────────────

  test('26. policy — meetsConfidenceThreshold', () => {
    assert.ok(meetsConfidenceThreshold(50, 60));
    assert.ok(!meetsConfidenceThreshold(80, 50));
  });

  test('27. policy — findIncompatibleTools detects bidirectional', () => {
    const t1 = makeTool({ toolId: 't1', requirements: { ...makeTool().requirements, incompatibleWith: ['t2'] } });
    const t2 = makeTool({ toolId: 't2', requirements: { ...makeTool().requirements, incompatibleWith: ['t1'] } });
    const conflicts = findIncompatibleTools([t1, t2]);
    assert.ok(conflicts.length > 0);
  });

  // ── Tool does not execute ─────────────────────────────────────────────────────

  test('28. no execution — plan contains only descriptions, no side effects', () => {
    const deps = makeDeps();
    deps.registry.register(makeTool({ toolId: 't1' }));
    const engine = new ToolIntelligenceEngine(deps);
    const plan = engine.selectTools(makeContext(), makePolicy());
    for (const step of plan.steps) {
      assert.ok(typeof step.toolId === 'string');
      assert.ok(typeof step.toolName === 'string');
      assert.ok(Array.isArray(step.expectedCapabilities));
    }
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
