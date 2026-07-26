import type { FailoverConfig, FailoverEvent, IFailoverManager, Instance, InstanceStatus } from '../models.js';

export class FailoverManager implements IFailoverManager {
  private instances: Instance[];
  private activeInstanceId?: string;
  private readonly events: FailoverEvent[] = [];
  private roundRobinIndex = 0;
  private readonly strategy: FailoverConfig['loadBalancingStrategy'];

  constructor(config: FailoverConfig) {
    this.instances = config.instances.map((i) => ({ ...i }));
    this.strategy = config.loadBalancingStrategy;
    const active = this.instances.find((i) => i.status === 'active');
    if (active) {
      this.activeInstanceId = active.id;
    } else {
      const first = this.selectByPriority();
      if (first) {
        first.status = 'active';
        this.activeInstanceId = first.id;
      }
    }
  }

  getActiveInstance(): Instance | undefined {
    return this.instances.find((i) => i.id === this.activeInstanceId);
  }

  getAllInstances(): Instance[] {
    return [...this.instances];
  }

  failover(reason: string): FailoverEvent | null {
    const current = this.getActiveInstance();
    if (current) {
      current.status = 'failed';
    }

    const next = this.selectInstance();
    if (!next) {
      return null;
    }

    next.status = 'active';
    const event: FailoverEvent = {
      fromInstanceId: current?.id ?? 'none',
      toInstanceId: next.id,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    this.activeInstanceId = next.id;
    return event;
  }

  markFailed(instanceId: string): void {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (inst) {
      inst.status = 'failed';
      if (instanceId === this.activeInstanceId) {
        this.failover(`Instance ${instanceId} marked as failed`);
      }
    }
  }

  markRecovered(instanceId: string): void {
    const inst = this.instances.find((i) => i.id === instanceId);
    if (inst) {
      inst.status = 'standby';
      inst.healthScore = 100;
      inst.lastCheckedAt = new Date().toISOString();
    }
  }

  getFailoverEvents(): FailoverEvent[] {
    return [...this.events];
  }

  selectInstance(): Instance | undefined {
    switch (this.strategy) {
      case 'round_robin':
        return this.selectRoundRobin();
      case 'least_load':
        return this.selectLeastLoad();
      case 'priority':
      default:
        return this.selectByPriority();
    }
  }

  private selectByPriority(): Instance | undefined {
    return this.instances
      .filter((i) => i.status === 'standby' || i.status === 'active')
      .sort((a, b) => a.priority - b.priority)
      .find((i) => i.status !== 'active');
  }

  private selectRoundRobin(): Instance | undefined {
    const candidates = this.instances.filter((i) => i.status === 'standby');
    if (candidates.length === 0) return undefined;
    const selected = candidates[this.roundRobinIndex % candidates.length];
    this.roundRobinIndex++;
    return selected;
  }

  private selectLeastLoad(): Instance | undefined {
    const candidates = this.instances.filter((i) => i.status === 'standby');
    if (candidates.length === 0) return undefined;
    return candidates.sort((a, b) => b.healthScore - a.healthScore)[0];
  }

  countActive(): number {
    return this.instances.filter((i) => i.status === 'active').length;
  }

  countByStatus(status: InstanceStatus): number {
    return this.instances.filter((i) => i.status === status).length;
  }
}

export function createInstance(id: string, name: string, endpoint: string, priority: number): Instance {
  return {
    id,
    name,
    status: 'standby',
    endpoint,
    priority,
    healthScore: 100,
  };
}

export function createFailoverConfig(instances: Instance[], options?: Partial<FailoverConfig>): FailoverConfig {
  return {
    instances,
    healthCheckIntervalMs: options?.healthCheckIntervalMs ?? 5000,
    failoverThreshold: options?.failoverThreshold ?? 3,
    loadBalancingStrategy: options?.loadBalancingStrategy ?? 'priority',
  };
}
