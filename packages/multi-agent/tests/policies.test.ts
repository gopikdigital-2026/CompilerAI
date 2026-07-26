import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { PolicyEngine } from '../src/policies/PolicyEngine.js';
import { IntelligentPlanner } from '../src/planner/IntelligentPlanner.js';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';
import { createDefaultPolicies } from '../src/orchestrator/MultiAgentOrchestrator.js';
import type { PolicySet, AgentDeclaration } from '../src/models.js';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;
  let policies: PolicySet;

  beforeEach(() => {
    engine = new PolicyEngine();
    policies = createDefaultPolicies();
  });

  test('validates a compliant plan', () => {
    const registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    const result = engine.validatePlan(plan, policies);
    assert.equal(result.valid, true);
    assert.equal(result.violations.filter((v) => v.severity === 'error').length, 0);
  });

  test('detects cost exceeding maximum', () => {
    const registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    policies.maxCostPerWorkflow = 0.01;
    const result = engine.validatePlan(plan, policies);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.rule === 'max_cost'));
  });

  test('detects duration exceeding maximum', () => {
    const registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    policies.maxDurationMs = 1;
    const result = engine.validatePlan(plan, policies);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.rule === 'max_duration'));
  });

  test('detects unauthorized agent', () => {
    const registry = new AgentRegistry();
    for (const a of createAllAgents()) registry.register(a);
    const plan = new IntelligentPlanner().generate('Handle customer support inquiries', 'org-1', registry);
    policies.authorizedAgents = ['ceo'];
    const result = engine.validatePlan(plan, policies);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.rule === 'authorized_agents'));
  });

  test('validates agent with authorized connectors', () => {
    const agent = createAllAgents()[0]; // CEO with salesforce, hubspot
    policies.authorizedConnectors = ['salesforce', 'hubspot'];
    const result = engine.validateAgent(agent, policies);
    assert.equal(result.valid, true);
  });

  test('detects unauthorized connector on agent', () => {
    const agent = createAllAgents()[0];
    policies.authorizedConnectors = [];
    const result = engine.validateAgent(agent, policies);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.rule === 'authorized_connectors'));
  });

  test('validates unrestricted operation', () => {
    const result = engine.validateOperation('read_data', policies);
    assert.equal(result.valid, true);
  });

  test('detects restricted operation', () => {
    const result = engine.validateOperation('delete_production_data', policies);
    assert.equal(result.valid, false);
    assert.ok(result.violations.some((v) => v.rule === 'restricted_operations'));
  });

  test('isWithinExecutionWindow returns true when no windows configured', () => {
    assert.equal(engine.isWithinExecutionWindow(new Date(), policies), true);
  });

  test('isWithinExecutionWindow respects configured window', () => {
    policies.executionWindows = [{ startHour: 9, endHour: 17, daysOfWeek: [1, 2, 3, 4, 5] }];
    const wednesday = new Date('2024-01-03T12:00:00Z'); // Wednesday 12:00 UTC
    const result = engine.isWithinExecutionWindow(wednesday, policies);
    assert.ok(typeof result === 'boolean');
  });

  test('validates custom agent not in authorized list', () => {
    const customAgent: AgentDeclaration = {
      id: 'custom-agent', name: 'Custom', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github'],
      estimatedCostPerTask: 0.10, averageExecutionTimeMs: 100, confidence: 0.80,
      priority: 'normal', version: '1.0.0',
    };
    const result = engine.validateAgent(customAgent, policies);
    assert.equal(result.valid, false);
  });

  test('validates custom agent added to authorized list', () => {
    const customAgent: AgentDeclaration = {
      id: 'custom-agent', name: 'Custom', role: 'r', description: 'd',
      capabilities: ['testing'], tools: [], connectors: ['github'],
      estimatedCostPerTask: 0.10, averageExecutionTimeMs: 100, confidence: 0.80,
      priority: 'normal', version: '1.0.0',
    };
    policies.authorizedAgents.push('custom-agent');
    const result = engine.validateAgent(customAgent, policies);
    assert.equal(result.valid, true);
  });
});
