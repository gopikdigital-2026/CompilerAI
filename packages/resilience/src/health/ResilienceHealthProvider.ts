import type { ResilienceHealth, CircuitState } from '../models.js';

export interface IResilienceHealthProvider {
  getHealth(): ResilienceHealth;
}

export class ResilienceHealthProvider implements IResilienceHealthProvider {
  constructor(
    private readonly getCircuitBreakerStates: () => { name: string; state: CircuitState; healthy: boolean }[],
    private readonly getActiveInstanceCount: () => number,
    private readonly getTotalInstanceCount: () => number,
    private readonly getPendingQueueCount: () => number,
    private readonly getLastBackupAt: () => string | undefined,
    private readonly getLastReplicationAt: () => string | undefined,
  ) {}

  getHealth(): ResilienceHealth {
    const circuitBreakers = this.getCircuitBreakerStates();
    const activeInstances = this.getActiveInstanceCount();
    const totalInstances = this.getTotalInstanceCount();
    const pendingQueueItems = this.getPendingQueueCount();

    const anyCircuitOpen = circuitBreakers.some((cb) => cb.state === 'open');
    const noActiveInstances = activeInstances === 0;
    const highQueueBacklog = pendingQueueItems > 100;

    let overallStatus: ResilienceHealth['overallStatus'] = 'healthy';
    if (noActiveInstances || anyCircuitOpen) {
      overallStatus = 'critical';
    } else if (highQueueBacklog || activeInstances < totalInstances) {
      overallStatus = 'degraded';
    }

    return {
      circuitBreakers,
      activeInstances,
      totalInstances,
      pendingQueueItems,
      lastBackupAt: this.getLastBackupAt(),
      lastReplicationAt: this.getLastReplicationAt(),
      overallStatus,
    };
  }
}
