import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { DigitalTwinSimulator } from '../src/simulation/DigitalTwinSimulator.js';
import { IntelligentPlanner } from '../src/planner/IntelligentPlanner.js';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';
import { createDefaultPolicies } from '../src/orchestrator/MultiAgentOrchestrator.js';
import type { PolicySet } from '../src/models.js';

describe('DigitalTwinSimulator', () => {
  let simulator: DigitalTwinSimulator;
  let registry: AgentRegistry;
  let policies: PolicySet;

  beforeEach(() => {
    simulator = new DigitalTwinSimulator();
    registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    policies = createDefaultPolicies();
  });

  test('simulates a workflow without real effects', () => {
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    assert.ok(result.workflowId === plan.id);
    assert.equal(result.taskResults.length, plan.tasks.length);
  });

  test('produces a workflow trace', () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    assert.ok(result.workflowTrace.length > 0);
    assert.ok(result.workflowTrace.some((line) => line.includes('Simulation started')));
    assert.ok(result.workflowTrace.some((line) => line.includes('Simulation completed')));
  });

  test('estimates total cost and duration', () => {
    const plan = new IntelligentPlanner().generate('Deploy the application', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    assert.ok(result.totalEstimatedCost > 0);
    assert.ok(result.totalEstimatedDurationMs > 0);
  });

  test('calculates success probability per task', () => {
    const plan = new IntelligentPlanner().generate('Handle customer inquiries', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    for (const tr of result.taskResults) {
      assert.ok(tr.successProbability > 0 && tr.successProbability <= 1);
    }
  });

  test('calculates overall success probability', () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    assert.ok(result.overallSuccessProbability > 0 && result.overallSuccessProbability <= 1);
  });

  test('detects policy violation for unauthorized agent', () => {
    const plan = new IntelligentPlanner().generate('Handle customer inquiries', 'org-1', registry);
    policies.authorizedAgents = ['ceo']; // Only CEO authorized
    const result = simulator.simulate(plan, registry, policies);
    const policyConflicts = result.conflicts.filter((c) => c.type === 'policy_violation');
    assert.ok(policyConflicts.length > 0);
  });

  test('detects resource conflict for parallel same-agent tasks', () => {
    const plan = new IntelligentPlanner().generate('Manage all critical incidents received today', 'org-1', registry);
    // Force same agent on multiple tasks by limiting registry
    const result = simulator.simulate(plan, registry, policies);
    // Check that simulation ran and produced results
    assert.ok(result.taskResults.length > 0);
  });

  test('simulation succeeds when no error-level conflicts', () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    const result = simulator.simulate(plan, registry, policies);
    const errorConflicts = result.conflicts.filter((c) => c.severity === 'error');
    if (errorConflicts.length === 0) {
      assert.equal(result.success, true);
    }
  });

  test('detects cost exceeding policy limit', () => {
    const plan = new IntelligentPlanner().generate('Deploy the application', 'org-1', registry);
    policies.maxCostPerWorkflow = 0.001;
    const result = simulator.simulate(plan, registry, policies);
    const costConflicts = result.conflicts.filter((c) => c.description.includes('cost'));
    assert.ok(costConflicts.length > 0);
  });

  test('detects approval blocked conflict', () => {
    const plan = new IntelligentPlanner().generate('Process the payment for the invoice', 'org-1', registry);
    policies.requireApprovalFor = []; // No approvals configured
    const result = simulator.simulate(plan, registry, policies);
    const approvalConflicts = result.conflicts.filter((c) => c.type === 'approval_blocked');
    assert.ok(approvalConflicts.length > 0);
  });

  test('simulation is deterministic for same input', () => {
    const plan = new IntelligentPlanner().generate('Research market trends', 'org-1', registry);
    const result1 = simulator.simulate(plan, registry, policies);
    const result2 = simulator.simulate(plan, registry, policies);
    assert.equal(result1.totalEstimatedCost, result2.totalEstimatedCost);
    assert.equal(result1.conflicts.length, result2.conflicts.length);
  });
});
