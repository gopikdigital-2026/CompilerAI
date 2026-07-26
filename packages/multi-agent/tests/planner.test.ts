import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { IntelligentPlanner } from '../src/planner/IntelligentPlanner.js';
import { AgentRegistry } from '../src/registry/AgentRegistry.js';
import { createAllAgents } from '../src/agents/AgentDefinitions.js';

describe('IntelligentPlanner', () => {
  function setupRegistry(): AgentRegistry {
    const r = new AgentRegistry();
    for (const a of createAllAgents()) r.register(a);
    return r;
  }

  test('generates a plan for incident request (EN)', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Manage all critical incidents received today', 'org-1', registry);
    assert.ok(plan.id.startsWith('plan-'));
    assert.equal(plan.organizationId, 'org-1');
    assert.ok(plan.objectives.length >= 2);
    assert.ok(plan.tasks.length >= 3);
    assert.equal(plan.language, 'en');
  });

  test('generates a plan for incident request (ES)', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Gestiona todas las incidencias críticas recibidas hoy', 'org-1', registry);
    assert.ok(plan.tasks.length >= 3);
    assert.equal(plan.language, 'es');
    assert.ok(plan.objectives.every((o) => o.length > 0));
  });

  test('generates a plan for payment request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Process the payment for the latest invoice', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
    const hasApproval = plan.tasks.some((t) => t.approval.required);
    assert.ok(hasApproval, 'Payment plan should require approval');
  });

  test('generates a plan for deployment request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Deploy the new version to production', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
    const deployTask = plan.tasks.find((t) => t.name.toLowerCase().includes('deploy') || t.name.toLowerCase().includes('desplegar'));
    assert.ok(deployTask?.approval.required, 'Deployment should require approval');
  });

  test('generates a plan for campaign request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Launch a new marketing campaign for Q3', 'org-1', registry);
    assert.ok(plan.tasks.length >= 3);
  });

  test('generates a plan for contract request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Draft and sign a new contract with the vendor', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
    const hasApproval = plan.tasks.some((t) => t.approval.required);
    assert.ok(hasApproval, 'Contract plan should require approval');
  });

  test('generates a plan for research request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Research the competitive landscape in our industry', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
  });

  test('generates a plan for code development request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Implement a new feature for the user profile page', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
  });

  test('generates a plan for budget analysis request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Analyze the budget and identify cost savings', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
  });

  test('generates a plan for customer support request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Handle customer support inquiries from today', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
  });

  test('generates a plan for document generation request', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Generate a quarterly report document', 'org-1', registry);
    assert.ok(plan.tasks.length >= 2);
  });

  test('plan has valid task dependencies', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Manage all critical incidents received today', 'org-1', registry);
    const taskIds = new Set(plan.tasks.map((t) => t.id));
    for (const task of plan.tasks) {
      for (const dep of task.dependencies) {
        assert.ok(taskIds.has(dep.taskId), `Dependency ${dep.taskId} not found in tasks`);
      }
    }
  });

  test('plan has positive cost and duration estimates', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Deploy the application', 'org-1', registry);
    assert.ok(plan.totalEstimatedCost > 0);
    assert.ok(plan.totalEstimatedDurationMs > 0);
    for (const task of plan.tasks) {
      assert.ok(task.estimatedCost >= 0);
      assert.ok(task.estimatedDurationMs > 0);
    }
  });

  test('plan has success probability between 0 and 1', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Research market trends', 'org-1', registry);
    assert.ok(plan.estimatedSuccessProbability > 0);
    assert.ok(plan.estimatedSuccessProbability <= 1);
  });

  test('plan has unique task ids', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const plan = planner.generate('Handle critical incidents today', 'org-1', registry);
    const ids = plan.tasks.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('objectives match request language', () => {
    const planner = new IntelligentPlanner();
    const registry = setupRegistry();
    const planES = planner.generate('Gestiona todas las incidencias críticas', 'org-1', registry);
    assert.equal(planES.language, 'es');
    assert.ok(planES.objectives.some((o) => o.includes('Resolver') || o.includes('incidencias')));
  });
});
