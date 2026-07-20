// ─── Plan Validator — unit tests ───────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/planning/tests/PlanValidator.test.ts

import assert from 'node:assert/strict';
import { PlanValidator } from '../services/PlanValidator';
import { ExecutionGraphBuilder } from '../services/ExecutionGraphBuilder';
import { PlanGenerator } from '../services/PlanGenerator';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { PlanEdge } from '../models/PlanEdge';

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

function makeIntent(overrides: Partial<IntentResult> = {}): IntentResult {
  return {
    intentId: 'intent-1', requestId: 'req-1', organizationId: 'org-1',
    primaryIntent: 'ANALYZE', secondaryIntents: [],
    businessArea: 'FINANCE', decisionLevel: 'OPERATIONAL',
    urgency: 'normal', impact: 'MEDIUM', complexity: 'MEDIUM',
    objectives: [{ label: 'Analyze margin', detail: 'Analyze margin drop' }],
    expectedOutcome: 'Understand margin drop',
    affectedEntities: [{ type: 'finance', classification: 'CONFIDENTIAL' }],
    constraints: [],
    requiredCapabilities: ['DATA_ANALYSIS', 'REASONING'],
    suggestedAgentTypes: ['FINANCIAL_ANALYST_AGENT'],
    suggestedToolCategories: ['DATA_ANALYSIS_TOOLS'],
    confidenceScore: 70, ambiguityScore: 30,
    classificationReasons: ['test'], assumptions: [],
    requiresClarification: false, clarificationQuestions: [],
    requiresHumanApproval: false, status: 'READY', createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const validator = new PlanValidator();
const graphBuilder = new ExecutionGraphBuilder();
const generator = new PlanGenerator();

test('valid plan passes validation', () => {
  const intent = makeIntent();
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  const result = validator.validate(graph, intent);
  assert.equal(result.isValid, true, `should be valid: ${JSON.stringify(result.errors)}`);
  // Plans with unavailable inputs are NEEDS_DATA, not READY.
  assert.ok(['READY', 'NEEDS_DATA'].includes(result.recommendedStatus),
    `expected READY or NEEDS_DATA, got ${result.recommendedStatus}`);
});

test('plan without FINAL_SYNTHESIS is invalid', () => {
  const intent = makeIntent();
  const gen = generator.generate(intent);
  const nodesWithoutSynthesis = gen.nodes.filter(n => n.type !== 'FINAL_SYNTHESIS');
  const edgesWithoutSynthesis = gen.edges.filter(e =>
    nodesWithoutSynthesis.some(n => n.nodeId === e.sourceNodeId)
    && nodesWithoutSynthesis.some(n => n.nodeId === e.targetNodeId)
  );
  const graph = graphBuilder.build(nodesWithoutSynthesis, edgesWithoutSynthesis);
  const result = validator.validate(graph, intent);
  assert.ok(result.errors.some(e => e.code === 'NO_SYNTHESIS'), 'should flag missing synthesis');
  assert.equal(result.recommendedStatus, 'INVALID');
});

test('plan with non-existent dependency is invalid', () => {
  const intent = makeIntent();
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  // Inject a fake edge referencing a non-existent node.
  const badEdge: PlanEdge = {
    edgeId: 'bad', sourceNodeId: 'nonexistent', targetNodeId: gen.nodes[0].nodeId,
    dependencyType: 'FINISH_TO_START', required: true,
  };
  graph.edges.push(badEdge);
  const result = validator.validate(graph, intent);
  assert.ok(result.errors.some(e => e.code === 'EDGE_INVALID_SOURCE'), 'should flag bad edge');
});

test('blocked intent produces blockers', () => {
  const intent = makeIntent({ status: 'BLOCKED' });
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  const result = validator.validate(graph, intent);
  assert.ok(result.blockers.some(b => b.includes('blocked')), 'should flag blocked intent');
});

test('low confidence produces blockers', () => {
  const intent = makeIntent({ confidenceScore: 30 });
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  const result = validator.validate(graph, intent);
  assert.ok(result.blockers.some(b => b.includes('confidence')), 'should flag low confidence');
});

test('clarification-required intent produces blockers', () => {
  const intent = makeIntent({ requiresClarification: true, status: 'NEEDS_CLARIFICATION' });
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  const result = validator.validate(graph, intent);
  assert.ok(result.blockers.some(b => b.includes('clarification')), 'should flag clarification');
});

test('unavailable inputs produce warnings', () => {
  const intent = makeIntent();
  const gen = generator.generate(intent);
  const graph = graphBuilder.build(gen.nodes, gen.edges);
  const result = validator.validate(graph, intent);
  assert.ok(result.warnings.some(w => w.code === 'UNAVAILABLE_INPUT'), 'should warn about unavailable inputs');
});

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
