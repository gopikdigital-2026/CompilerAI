import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import {
  ChaosEngine,
  CHAOS_SCENARIO_TYPES,
  createConnectorFailureScenario,
  createMemoryPressureScenario,
  createAgentTimeoutScenario,
  createDataCorruptionScenario,
  createHighLatencyScenario,
  createServiceInterruptionScenario,
} from '../src/index.js';

describe('ChaosEngine', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = new ChaosEngine();
  });

  test('registers a scenario', () => {
    engine.registerScenario(createConnectorFailureScenario());
    assert.equal(engine.count(), 1);
  });

  test('runs a scenario and returns result', () => {
    engine.registerScenario(createMemoryPressureScenario());
    const result = engine.runScenario(engine.getScenarios()[0].id);
    assert.equal(result.executed, true);
    assert.ok(result.detectedIssues.length > 0);
  });

  test('all 6 scenario types run correctly', () => {
    const factories = [
      createConnectorFailureScenario,
      createMemoryPressureScenario,
      createAgentTimeoutScenario,
      createDataCorruptionScenario,
      createHighLatencyScenario,
      createServiceInterruptionScenario,
    ];
    for (const factory of factories) {
      engine.registerScenario(factory());
    }
    const results = engine.runAllScenarios();
    assert.equal(results.length, 6);
    assert.ok(results.every((r) => r.executed));
  });

  test('runScenario for missing scenario returns failure', () => {
    const result = engine.runScenario('nonexistent');
    assert.equal(result.executed, false);
    assert.equal(result.passed, false);
  });

  test('generateReport produces resilience report', () => {
    engine.registerAllDefaults();
    engine.runAllScenarios();
    const report = engine.generateReport();
    assert.equal(report.totalScenarios, 6);
    assert.equal(report.passed + report.failed, 6);
    assert.ok(report.overallResilienceScore >= 0);
    assert.ok(report.overallResilienceScore <= 100);
    assert.ok(report.recommendations.length > 0);
  });

  test('report recommendations when all pass', () => {
    engine.registerAllDefaults();
    engine.runAllScenarios();
    const report = engine.generateReport();
    assert.ok(report.recommendations.some((r) => r.includes('resilient')));
  });

  test('each scenario type detects specific issues', () => {
    engine.registerScenario(createConnectorFailureScenario());
    engine.registerScenario(createMemoryPressureScenario());
    engine.registerScenario(createAgentTimeoutScenario());
    engine.registerScenario(createDataCorruptionScenario());
    engine.registerScenario(createHighLatencyScenario());
    engine.registerScenario(createServiceInterruptionScenario());
    const results = engine.runAllScenarios();

    assert.ok(results.find((r) => r.scenarioType === 'connector_failure')!.detectedIssues.some((i) => i.includes('Connector')));
    assert.ok(results.find((r) => r.scenarioType === 'memory_pressure')!.detectedIssues.some((i) => i.includes('Memory')));
    assert.ok(results.find((r) => r.scenarioType === 'agent_timeout')!.detectedIssues.some((i) => i.includes('timeout')));
    assert.ok(results.find((r) => r.scenarioType === 'data_corruption')!.detectedIssues.some((i) => i.includes('Checksum')));
    assert.ok(results.find((r) => r.scenarioType === 'high_latency')!.detectedIssues.some((i) => i.includes('latency')));
    assert.ok(results.find((r) => r.scenarioType === 'service_interruption')!.detectedIssues.some((i) => i.includes('Failover')));
  });

  test('registerAllDefaults registers all 6 scenarios', () => {
    engine.registerAllDefaults();
    assert.equal(engine.count(), 6);
    assert.equal(engine.getScenarios().length, 6);
  });

  test('all results are recovered', () => {
    engine.registerAllDefaults();
    const results = engine.runAllScenarios();
    assert.ok(results.every((r) => r.recovered));
  });

  test('CHAOS_SCENARIO_TYPES contains all 6 types', () => {
    assert.equal(CHAOS_SCENARIO_TYPES.length, 6);
    assert.ok(CHAOS_SCENARIO_TYPES.includes('connector_failure'));
    assert.ok(CHAOS_SCENARIO_TYPES.includes('memory_pressure'));
    assert.ok(CHAOS_SCENARIO_TYPES.includes('agent_timeout'));
    assert.ok(CHAOS_SCENARIO_TYPES.includes('data_corruption'));
    assert.ok(CHAOS_SCENARIO_TYPES.includes('high_latency'));
    assert.ok(CHAOS_SCENARIO_TYPES.includes('service_interruption'));
  });
});
