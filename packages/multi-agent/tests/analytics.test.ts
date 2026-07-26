import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { AnalyticsEngine } from '../src/analytics/AnalyticsEngine.js';
import type { ExecutionResult, TaskResult } from '../src/models.js';

function makeResult(agentId: string, success: boolean, cost: number, duration: number, confidence: number): TaskResult {
  return {
    taskId: `task-${agentId}-${Math.random()}`,
    agentId,
    status: success ? 'completed' : 'failed',
    output: {},
    confidence,
    reasoning: 'test',
    alternatives: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    cost,
    durationMs: duration,
    retries: 0,
  };
}

function makeExecutionResult(results: TaskResult[], success: boolean): ExecutionResult {
  return {
    workflowId: `wf-${Math.random()}`,
    state: success ? 'completed' : 'failed',
    results,
    timeline: [],
    totalCost: results.reduce((s, r) => s + r.cost, 0),
    totalDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
    completedAt: new Date().toISOString(),
    success,
  };
}

describe('AnalyticsEngine', () => {
  let analytics: AnalyticsEngine;

  beforeEach(() => {
    analytics = new AnalyticsEngine();
  });

  test('records and retrieves agent metrics', () => {
    analytics.recordResult(makeExecutionResult([
      makeResult('finance', true, 0.40, 400, 0.92),
      makeResult('finance', true, 0.40, 300, 0.90),
    ], true));

    const metrics = analytics.getAgentMetrics('finance');
    assert.equal(metrics.agentId, 'finance');
    assert.equal(metrics.tasksCompleted, 2);
    assert.equal(metrics.tasksFailed, 0);
    assert.ok(metrics.averageConfidence > 0);
    assert.ok(metrics.successRate === 1);
  });

  test('tracks failed tasks', () => {
    analytics.recordResult(makeExecutionResult([
      makeResult('developer', true, 0.35, 500, 0.87),
      makeResult('developer', false, 0.35, 100, 0),
    ], false));

    const metrics = analytics.getAgentMetrics('developer');
    assert.equal(metrics.tasksCompleted, 1);
    assert.equal(metrics.tasksFailed, 1);
    assert.ok(metrics.successRate < 1);
  });

  test('getAllAgentMetrics returns metrics for all agents', () => {
    analytics.recordResult(makeExecutionResult([
      makeResult('finance', true, 0.40, 400, 0.92),
      makeResult('support', true, 0.20, 250, 0.85),
    ], true));

    const allMetrics = analytics.getAllAgentMetrics();
    assert.equal(allMetrics.length, 2);
    const agentIds = allMetrics.map((m) => m.agentId);
    assert.ok(agentIds.includes('finance'));
    assert.ok(agentIds.includes('support'));
  });

  test('getWorkflowAnalytics aggregates workflow stats', () => {
    analytics.recordResult(makeExecutionResult([makeResult('a', true, 0.30, 300, 0.90)], true));
    analytics.recordResult(makeExecutionResult([makeResult('a', false, 0.30, 100, 0)], false));

    const stats = analytics.getWorkflowAnalytics();
    assert.equal(stats.totalWorkflows, 2);
    assert.equal(stats.completedWorkflows, 1);
    assert.equal(stats.failedWorkflows, 1);
    assert.ok(stats.averageCost > 0);
  });

  test('computes total cost across all tasks', () => {
    analytics.recordResult(makeExecutionResult([
      makeResult('finance', true, 0.40, 400, 0.92),
      makeResult('support', true, 0.20, 250, 0.85),
    ], true));

    const metrics = analytics.getAgentMetrics('finance');
    assert.equal(metrics.totalCost, 0.40);
  });

  test('computes average duration', () => {
    analytics.recordResult(makeExecutionResult([
      makeResult('dev', true, 0.35, 500, 0.87),
      makeResult('dev', true, 0.35, 300, 0.85),
    ], true));

    const metrics = analytics.getAgentMetrics('dev');
    assert.equal(metrics.averageDurationMs, 400);
  });

  test('clear resets all data', () => {
    analytics.recordResult(makeExecutionResult([makeResult('a', true, 0.30, 300, 0.90)], true));
    analytics.clear();
    assert.equal(analytics.getAllAgentMetrics().length, 0);
    assert.equal(analytics.getWorkflowAnalytics().totalWorkflows, 0);
  });

  test('handles empty data gracefully', () => {
    const metrics = analytics.getAgentMetrics('nonexistent');
    assert.equal(metrics.tasksCompleted, 0);
    assert.equal(metrics.successRate, 0);
    const stats = analytics.getWorkflowAnalytics();
    assert.equal(stats.totalWorkflows, 0);
  });
});
