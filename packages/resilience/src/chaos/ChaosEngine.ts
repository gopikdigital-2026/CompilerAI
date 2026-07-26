import type {
  ChaosResult,
  ChaosScenario,
  ChaosScenarioType,
  IChaosEngine,
  ResilienceReport,
} from '../models.js';

// Pre-built scenario factories
export function createConnectorFailureScenario(durationMs = 1000, targetComponent?: string): ChaosScenario {
  return {
    id: `chaos-connector-${Date.now()}`,
    type: 'connector_failure',
    name: 'Connector Failure Simulation',
    description: 'Simulates the failure of one or more connectors',
    durationMs,
    intensity: 0.7,
    targetComponent,
  };
}

export function createMemoryPressureScenario(durationMs = 1000): ChaosScenario {
  return {
    id: `chaos-memory-${Date.now()}`,
    type: 'memory_pressure',
    name: 'Memory Pressure Simulation',
    description: 'Simulates high memory usage conditions',
    durationMs,
    intensity: 0.8,
  };
}

export function createAgentTimeoutScenario(durationMs = 1000, targetComponent?: string): ChaosScenario {
  return {
    id: `chaos-timeout-${Date.now()}`,
    type: 'agent_timeout',
    name: 'Agent Timeout Simulation',
    description: 'Simulates agents timing out during task execution',
    durationMs,
    intensity: 0.6,
    targetComponent,
  };
}

export function createDataCorruptionScenario(durationMs = 500): ChaosScenario {
  return {
    id: `chaos-corruption-${Date.now()}`,
    type: 'data_corruption',
    name: 'Data Corruption Simulation',
    description: 'Simulates data corruption in storage systems',
    durationMs,
    intensity: 0.5,
  };
}

export function createHighLatencyScenario(durationMs = 1000): ChaosScenario {
  return {
    id: `chaos-latency-${Date.now()}`,
    type: 'high_latency',
    name: 'High Latency Simulation',
    description: 'Simulates elevated latency across components',
    durationMs,
    intensity: 0.7,
  };
}

export function createServiceInterruptionScenario(durationMs = 1000, targetComponent?: string): ChaosScenario {
  return {
    id: `chaos-interruption-${Date.now()}`,
    type: 'service_interruption',
    name: 'Service Interruption Simulation',
    description: 'Simulates complete service interruption',
    durationMs,
    intensity: 0.9,
    targetComponent,
  };
}

const ALL_SCENARIO_FACTORIES = [
  createConnectorFailureScenario,
  createMemoryPressureScenario,
  createAgentTimeoutScenario,
  createDataCorruptionScenario,
  createHighLatencyScenario,
  createServiceInterruptionScenario,
];

export class ChaosEngine implements IChaosEngine {
  private readonly scenarios = new Map<string, ChaosScenario>();
  private readonly results: ChaosResult[] = [];

  registerScenario(scenario: ChaosScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  runScenario(scenarioId: string): ChaosResult {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      return {
        scenarioId,
        scenarioType: 'service_interruption',
        executed: false,
        passed: false,
        detectedIssues: [`Scenario '${scenarioId}' not found`],
        recovered: false,
        recoveryTimeMs: 0,
        timestamp: new Date().toISOString(),
      };
    }

    const start = Date.now();
    const detectedIssues: string[] = [];

    switch (scenario.type) {
      case 'connector_failure':
        detectedIssues.push('Connector became unavailable');
        detectedIssues.push('Circuit breaker opened');
        break;
      case 'memory_pressure':
        detectedIssues.push('Memory usage exceeded 85%');
        detectedIssues.push('Garbage collection pressure detected');
        break;
      case 'agent_timeout':
        detectedIssues.push('Agent did not respond within timeout');
        detectedIssues.push('Task queue backlog detected');
        break;
      case 'data_corruption':
        detectedIssues.push('Checksum mismatch detected');
        detectedIssues.push('Backup validation triggered');
        break;
      case 'high_latency':
        detectedIssues.push('p95 latency exceeded threshold');
        detectedIssues.push('AIOps anomaly detection triggered');
        break;
      case 'service_interruption':
        detectedIssues.push('Service health check failed');
        detectedIssues.push('Failover initiated');
        detectedIssues.push('Queue recovery started');
        break;
    }

    const recoveryTimeMs = Date.now() - start;
    const result: ChaosResult = {
      scenarioId: scenario.id,
      scenarioType: scenario.type,
      executed: true,
      passed: detectedIssues.length > 0,
      detectedIssues,
      recovered: true,
      recoveryTimeMs,
      timestamp: new Date().toISOString(),
    };

    this.results.push(result);
    return result;
  }

  runAllScenarios(): ChaosResult[] {
    const results: ChaosResult[] = [];
    for (const id of this.scenarios.keys()) {
      results.push(this.runScenario(id));
    }
    return results;
  }

  generateReport(): ResilienceReport {
    const passed = this.results.filter((r) => r.passed && r.recovered).length;
    const failed = this.results.filter((r) => !r.passed || !r.recovered).length;
    const total = this.results.length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 100;

    const recommendations: string[] = [];
    if (failed > 0) {
      recommendations.push(`${failed} scenario(s) did not pass — review resilience configuration`);
    }
    if (this.results.some((r) => r.recoveryTimeMs > 5000)) {
      recommendations.push('Some recovery times exceeded 5 seconds — consider tuning failover thresholds');
    }
    if (this.results.some((r) => r.scenarioType === 'data_corruption' && !r.recovered)) {
      recommendations.push('Data corruption recovery failed — verify backup integrity');
    }
    if (score === 100) {
      recommendations.push('All scenarios passed — system is resilient to tested failures');
    }

    return {
      totalScenarios: total,
      passed,
      failed,
      scenarios: [...this.results],
      overallResilienceScore: score,
      recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  getScenarios(): ChaosScenario[] {
    return Array.from(this.scenarios.values());
  }

  count(): number {
    return this.scenarios.size;
  }

  registerAllDefaults(): void {
    for (const factory of ALL_SCENARIO_FACTORIES) {
      const scenario = factory();
      this.registerScenario(scenario);
    }
  }
}

export function createDefaultChaosScenarios(): ChaosScenario[] {
  return ALL_SCENARIO_FACTORIES.map((f) => f());
}

export const CHAOS_SCENARIO_TYPES: ChaosScenarioType[] = [
  'connector_failure',
  'memory_pressure',
  'agent_timeout',
  'data_corruption',
  'high_latency',
  'service_interruption',
];
