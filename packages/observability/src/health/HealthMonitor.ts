import type { HealthCheck, HealthCheckResult, HealthStatus, IHealthMonitor, ComponentName } from '../models.js';

interface RegisteredCheck {
  name: string;
  component: ComponentName;
  checker: () => Promise<HealthCheckResult>;
  lastResult?: HealthCheck;
}

export class HealthMonitor implements IHealthMonitor {
  private readonly checks = new Map<string, RegisteredCheck>();

  registerCheck(name: string, component: ComponentName, checker: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, { name, component, checker });
  }

  async runCheck(name: string): Promise<HealthCheck> {
    const registered = this.checks.get(name);
    if (!registered) {
      return {
        id: name,
        name,
        component: 'observability',
        status: 'critical',
        message: `Health check '${name}' not found`,
        lastCheckedAt: new Date().toISOString(),
        details: {},
      };
    }

    try {
      const result = await registered.checker();
      const check: HealthCheck = {
        id: name,
        name,
        component: registered.component,
        status: result.status,
        message: result.message,
        lastCheckedAt: new Date().toISOString(),
        details: result.details ?? {},
      };
      registered.lastResult = check;
      return check;
    } catch (err) {
      const check: HealthCheck = {
        id: name,
        name,
        component: registered.component,
        status: 'critical',
        message: `Check failed: ${err instanceof Error ? err.message : 'unknown error'}`,
        lastCheckedAt: new Date().toISOString(),
        details: {},
      };
      registered.lastResult = check;
      return check;
    }
  }

  async runAllChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];
    for (const name of this.checks.keys()) {
      results.push(await this.runCheck(name));
    }
    return results;
  }

  getOverallStatus(): HealthStatus {
    const checks = this.getChecks();
    if (checks.length === 0) return 'healthy';
    if (checks.some((c) => c.status === 'critical')) return 'critical';
    if (checks.some((c) => c.status === 'warning')) return 'warning';
    return 'healthy';
  }

  getChecks(): HealthCheck[] {
    return Array.from(this.checks.values())
      .map((c) => c.lastResult)
      .filter((c): c is HealthCheck => c !== undefined);
  }

  getRegisteredNames(): string[] {
    return Array.from(this.checks.keys());
  }

  count(): number {
    return this.checks.size;
  }
}

// Pre-built health check factories for the 8 required checks
export function createAvailabilityCheck(component: ComponentName, isUp: () => boolean): () => Promise<HealthCheckResult> {
  return async () => ({
    status: isUp() ? 'healthy' : 'critical',
    message: isUp() ? 'Component is available' : 'Component is down',
    details: { component },
  });
}

export function createMemoryCheck(getUsagePercent: () => number): () => Promise<HealthCheckResult> {
  return async () => {
    const usage = getUsagePercent();
    return {
      status: usage > 90 ? 'critical' : usage > 75 ? 'warning' : 'healthy',
      message: `Memory usage at ${usage}%`,
      details: { usagePercent: usage },
    };
  };
}

export function createQueueCheck(getQueueDepth: () => number, maxDepth = 1000): () => Promise<HealthCheckResult> {
  return async () => {
    const depth = getQueueDepth();
    return {
      status: depth > maxDepth ? 'critical' : depth > maxDepth * 0.7 ? 'warning' : 'healthy',
      message: `Queue depth: ${depth}`,
      details: { depth, maxDepth },
    };
  };
}

export function createConnectorCheck(getActiveConnectors: () => number, minExpected = 1): () => Promise<HealthCheckResult> {
  return async () => {
    const active = getActiveConnectors();
    return {
      status: active < minExpected ? 'critical' : active < minExpected * 2 ? 'warning' : 'healthy',
      message: `${active} active connectors`,
      details: { active, minExpected },
    };
  };
}

export function createRagIndexCheck(getIndexSize: () => number): () => Promise<HealthCheckResult> {
  return async () => {
    const size = getIndexSize();
    return {
      status: size === 0 ? 'critical' : size < 10 ? 'warning' : 'healthy',
      message: `RAG index contains ${size} documents`,
      details: { indexSize: size },
    };
  };
}

export function createKnowledgeGraphCheck(getNodeCount: () => number): () => Promise<HealthCheckResult> {
  return async () => {
    const count = getNodeCount();
    return {
      status: count === 0 ? 'critical' : 'healthy',
      message: `Knowledge graph has ${count} nodes`,
      details: { nodeCount: count },
    };
  };
}

export function createSkillsCheck(getInstalledCount: () => number): () => Promise<HealthCheckResult> {
  return async () => {
    const count = getInstalledCount();
    return {
      status: count === 0 ? 'warning' : 'healthy',
      message: `${count} skills installed`,
      details: { installedCount: count },
    };
  };
}

export function createAuthCheck(getAuthSuccessRate: () => number): () => Promise<HealthCheckResult> {
  return async () => {
    const rate = getAuthSuccessRate();
    return {
      status: rate < 90 ? 'critical' : rate < 98 ? 'warning' : 'healthy',
      message: `Authentication success rate: ${rate}%`,
      details: { successRate: rate },
    };
  };
}
