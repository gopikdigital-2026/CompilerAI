import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { MultiAgentOrchestrator, createDefaultPolicies } from '../src/orchestrator/MultiAgentOrchestrator.js';
import { MockAgentExecutor } from '../src/agents/MockAgentExecutor.js';
import type { AgentDeclaration } from '../src/models.js';

describe('MultiAgentOrchestrator — Integration', () => {
  let orchestrator: MultiAgentOrchestrator;

  beforeEach(() => {
    orchestrator = new MultiAgentOrchestrator({
      organizationId: 'org-1',
      policies: createDefaultPolicies(),
      executor: new MockAgentExecutor(),
    });
  });

  test('initializes with 10 agents', () => {
    assert.equal(orchestrator.listAgents().length, 10);
  });

  test('executes a full workflow end-to-end', async () => {
    const result = await orchestrator.executeWorkflow('Manage all critical incidents received today');
    assert.equal(result.state, 'completed');
    assert.ok(result.results.length > 0);
    assert.ok(result.timeline.length > 0);
  });

  test('simulates a workflow via Digital Twin', () => {
    const result = orchestrator.simulateWorkflow('Deploy the new version to production');
    assert.ok(result.workflowTrace.length > 0);
    assert.ok(result.totalEstimatedCost > 0);
    assert.equal(result.taskResults.length > 0, true);
  });

  test('registers a custom agent', () => {
    const customAgent: AgentDeclaration = {
      id: 'custom-analytics', name: 'Custom Analytics', role: 'Data Analyst',
      description: 'Custom analytics agent',
      capabilities: ['data-analysis', 'trend-analysis'],
      tools: ['custom-tool'], connectors: ['google'],
      estimatedCostPerTask: 0.15, averageExecutionTimeMs: 200,
      confidence: 0.85, priority: 'normal', version: '1.0.0',
    };
    orchestrator.registerAgent(customAgent);
    assert.equal(orchestrator.listAgents().length, 11);
  });

  test('unregisters an agent', () => {
    const removed = orchestrator.unregisterAgent('research');
    assert.equal(removed, true);
    assert.equal(orchestrator.listAgents().length, 9);
  });

  test('cancels a running workflow', async () => {
    const promise = orchestrator.executeWorkflow('Deploy the application to production');
    const plan = orchestrator.generatePlan('Deploy the application to production');
    orchestrator.cancelWorkflow(plan.id);
    await promise;
  });

  test('gets execution status', async () => {
    const result = await orchestrator.executeWorkflow('Research market trends');
    const status = orchestrator.getExecutionStatus(result.workflowId);
    assert.ok(status !== undefined);
  });

  test('gets workflow timeline', async () => {
    const result = await orchestrator.executeWorkflow('Generate a report document');
    const timeline = orchestrator.getWorkflowTimeline(result.workflowId);
    assert.ok(timeline.length > 0);
  });

  test('gets agent metrics after execution', async () => {
    await orchestrator.executeWorkflow('Handle customer support inquiries');
    const metrics = orchestrator.getAgentMetrics('support');
    assert.ok(metrics.tasksCompleted > 0 || metrics.tasksFailed > 0);
  });

  test('generates valid plan via public API', () => {
    const plan = orchestrator.generatePlan('Process the payment for the invoice');
    assert.ok(plan.id.startsWith('plan-'));
    assert.ok(plan.tasks.length > 0);
    assert.ok(plan.objectives.length > 0);
  });

  test('emits telemetry events during workflow execution', async () => {
    await orchestrator.executeWorkflow('Manage all critical incidents received today');
    const events = orchestrator.telemetry.getEvents();
    assert.ok(events.length > 0);
    assert.ok(events.some((e) => e.type === 'agent.started'));
    assert.ok(events.some((e) => e.type === 'agent.completed'));
  });

  test('emits simulation.finished event on simulate', () => {
    orchestrator.simulateWorkflow('Research market trends');
    const simEvents = orchestrator.telemetry.getEventsByType('simulation.finished');
    assert.equal(simEvents.length, 1);
  });

  test('records analytics after workflow execution', async () => {
    await orchestrator.executeWorkflow('Handle customer support inquiries');
    await orchestrator.executeWorkflow('Generate a report document');
    const analytics = orchestrator.getWorkflowAnalytics();
    assert.equal(analytics.totalWorkflows, 2);
    assert.ok(analytics.completedWorkflows >= 1);
  });

  test('bilingual support: EN and ES requests both work', async () => {
    const resultEN = await orchestrator.executeWorkflow('Manage all critical incidents received today');
    assert.equal(resultEN.state, 'completed');

    // Reset for second workflow
    orchestrator = new MultiAgentOrchestrator({
      organizationId: 'org-1',
      policies: createDefaultPolicies(),
      executor: new MockAgentExecutor(),
    });
    const resultES = await orchestrator.executeWorkflow('Gestiona todas las incidencias críticas recibidas hoy');
    assert.equal(resultES.state, 'completed');
  });

  test('approvals are requested for payment workflows', async () => {
    await orchestrator.executeWorkflow('Process the payment for the latest invoice');
    const approvalEvents = orchestrator.telemetry.getEventsByType('approval.requested');
    assert.ok(approvalEvents.length > 0);
  });

  test('requestApproval via public API', () => {
    const approval = orchestrator.requestApproval('wf-1', 'task-1', 'finance', 'payment', 'Process $5000', 'high');
    assert.equal(approval.state, 'pending');
    assert.ok(approval.id.startsWith('approval-'));
  });

  test('decision history contains reasoning and alternatives', async () => {
    await orchestrator.executeWorkflow('Research the competitive landscape');
    const history = orchestrator.memory.getDecisionHistory();
    assert.ok(history.length > 0);
    assert.ok(history.every((h) => h.decision.reasoning.length > 0));
    assert.ok(history.every((h) => h.decision.alternatives.length > 0));
    assert.ok(history.every((h) => h.decision.confidence > 0));
  });

  test('shared memory stores results during execution', async () => {
    await orchestrator.executeWorkflow('Generate a report document');
    const results = orchestrator.memory.list('result');
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => !r.isSecret));
  });

  test('communication bus records messages during execution', async () => {
    await orchestrator.executeWorkflow('Handle customer support inquiries');
    const messages = orchestrator.communication.getMessages();
    assert.ok(messages.length > 0);
    assert.ok(messages.some((m) => m.type === 'request'));
    assert.ok(messages.some((m) => m.type === 'response'));
  });

  test('all public API methods are accessible', () => {
    assert.equal(typeof orchestrator.registerAgent, 'function');
    assert.equal(typeof orchestrator.unregisterAgent, 'function');
    assert.equal(typeof orchestrator.executeWorkflow, 'function');
    assert.equal(typeof orchestrator.simulateWorkflow, 'function');
    assert.equal(typeof orchestrator.requestApproval, 'function');
    assert.equal(typeof orchestrator.resumeWorkflow, 'function');
    assert.equal(typeof orchestrator.cancelWorkflow, 'function');
    assert.equal(typeof orchestrator.getExecutionStatus, 'function');
    assert.equal(typeof orchestrator.getWorkflowTimeline, 'function');
    assert.equal(typeof orchestrator.getAgentMetrics, 'function');
  });
});
