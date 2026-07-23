import type { AgentHealthStatus, AgentHealthState } from '../models/AgentModels';
import { AgentUnhealthyError } from '../errors/AgentErrors';

export interface IAgentHealthMonitor {
  recordHeartbeat(agentId: string): void;
  recordFailure(agentId: string, error: string): void;
  recordSuccess(agentId: string): void;
  getHealth(agentId: string): AgentHealthStatus | null;
  getAllHealth(): AgentHealthStatus[];
  isHealthy(agentId: string): boolean;
  assertHealthy(agentId: string): void;
  markDead(agentId: string): void;
  incrementActiveTasks(agentId: string): void;
  decrementActiveTasks(agentId: string): void;
  clear(): void;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const HEARTBEAT_TIMEOUT_MS = 30_000;

export class AgentHealthMonitor implements IAgentHealthMonitor {
  private readonly healthMap = new Map<string, AgentHealthStatus>();
  private readonly startTimes = new Map<string, number>();

  constructor(private readonly clock: () => string) {}

  recordHeartbeat(agentId: string): void {
    const health = this.getOrCreate(agentId);
    health.lastHeartbeat = this.clock();
    health.consecutiveFailures = 0;
    health.lastError = null;
    if (health.state === 'dead') return;
    health.state = 'healthy';
  }

  recordFailure(agentId: string, error: string): void {
    const health = this.getOrCreate(agentId);
    health.consecutiveFailures++;
    health.lastError = error;
    if (health.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      health.state = 'dead';
    } else if (health.consecutiveFailures > 0) {
      health.state = health.consecutiveFailures >= 2 ? 'unhealthy' : 'degraded';
    }
  }

  recordSuccess(agentId: string): void {
    const health = this.getOrCreate(agentId);
    health.consecutiveFailures = 0;
    health.lastError = null;
    health.activeTasks = Math.max(0, health.activeTasks - 1);
    if (health.state !== 'dead') health.state = 'healthy';
  }

  getHealth(agentId: string): AgentHealthStatus | null {
    return this.healthMap.get(agentId) ?? null;
  }

  getAllHealth(): AgentHealthStatus[] {
    return Array.from(this.healthMap.values());
  }

  isHealthy(agentId: string): boolean {
    const health = this.healthMap.get(agentId);
    if (!health) return false;
    return health.state === 'healthy' || health.state === 'degraded';
  }

  assertHealthy(agentId: string): void {
    if (!this.isHealthy(agentId)) {
      const health = this.healthMap.get(agentId);
      const state = health?.state ?? 'unknown';
      throw new AgentUnhealthyError(`Agent ${agentId} is ${state} and cannot accept tasks`);
    }
  }

  markDead(agentId: string): void {
    const health = this.getOrCreate(agentId);
    health.state = 'dead';
  }

  incrementActiveTasks(agentId: string): void {
    const health = this.getOrCreate(agentId);
    health.activeTasks++;
  }

  decrementActiveTasks(agentId: string): void {
    const health = this.getOrCreate(agentId);
    health.activeTasks = Math.max(0, health.activeTasks - 1);
  }

  setStartTime(agentId: string): void {
    this.startTimes.set(agentId, Date.now());
  }

  clear(): void {
    this.healthMap.clear();
    this.startTimes.clear();
  }

  private getOrCreate(agentId: string): AgentHealthStatus {
    let health = this.healthMap.get(agentId);
    if (!health) {
      const startTime = this.startTimes.get(agentId) ?? Date.now();
      this.startTimes.set(agentId, startTime);
      health = {
        agentId,
        state: 'healthy' as AgentHealthState,
        lastHeartbeat: this.clock(),
        consecutiveFailures: 0,
        lastError: null,
        uptimeMs: 0,
        memoryUsageMb: 0,
        activeTasks: 0,
      };
      this.healthMap.set(agentId, health);
    }
    health.uptimeMs = Date.now() - (this.startTimes.get(agentId) ?? Date.now());
    return health;
  }
}

export { HEARTBEAT_TIMEOUT_MS, MAX_CONSECUTIVE_FAILURES };
