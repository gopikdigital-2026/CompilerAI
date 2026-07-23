import type {
  AgentExecution,
  AgentResult,
  AgentCheckpoint,
  AgentHealthStatus,
} from '../models/AgentModels';

export interface ITelemetryAdapter {
  recordEvent(eventType: string, payload: Record<string, unknown>): void;
  recordStageStart(executionId: string, stageName: string, agentId?: string): void;
  recordStageComplete(executionId: string, stageName: string, durationMs: number): void;
  recordStageFailure(executionId: string, stageName: string, error: string): void;
  recordAgentMetric(agentId: string, metricName: string, value: number): void;
  flush(): void;
}

export interface IMemoryAdapter {
  write(executionId: string, key: string, value: unknown): void;
  read(executionId: string, key: string): unknown | null;
  readAll(executionId: string): Record<string, unknown>;
  delete(executionId: string, key: string): boolean;
}

export interface IMarketplaceAdapter {
  getInstalledTools(organizationId: string): Array<{
    id: string;
    name: string;
    version: string;
    capabilities: string[];
  }>;
  checkToolAvailability(toolId: string, organizationId: string): boolean;
  getToolCapabilities(toolId: string, organizationId: string): string[];
}

export interface IExecutionAdapter {
  notifyExecutionStart(execution: AgentExecution): void;
  notifyExecutionComplete(executionId: string, success: boolean, results: AgentResult[]): void;
  notifyTaskDispatched(taskId: string, agentId: string, executionId: string): void;
  notifyTaskComplete(taskId: string, agentId: string, result: AgentResult): void;
  notifyCheckpointSaved(checkpoint: AgentCheckpoint): void;
  notifyAgentHealth(health: AgentHealthStatus): void;
}

export class NullTelemetryAdapter implements ITelemetryAdapter {
  recordEvent(_eventType: string, _payload: Record<string, unknown>): void {}
  recordStageStart(_executionId: string, _stageName: string, _agentId?: string): void {}
  recordStageComplete(_executionId: string, _stageName: string, _durationMs: number): void {}
  recordStageFailure(_executionId: string, _stageName: string, _error: string): void {}
  recordAgentMetric(_agentId: string, _metricName: string, _value: number): void {}
  flush(): void {}
}

export class NullMemoryAdapter implements IMemoryAdapter {
  private readonly store = new Map<string, Map<string, unknown>>();
  write(executionId: string, key: string, value: unknown): void {
    let map = this.store.get(executionId);
    if (!map) {
      map = new Map();
      this.store.set(executionId, map);
    }
    map.set(key, value);
  }
  read(executionId: string, key: string): unknown | null {
    return this.store.get(executionId)?.get(key) ?? null;
  }
  readAll(executionId: string): Record<string, unknown> {
    const map = this.store.get(executionId);
    if (!map) return {};
    return Object.fromEntries(map);
  }
  delete(executionId: string, key: string): boolean {
    return this.store.get(executionId)?.delete(key) ?? false;
  }
}

export class NullMarketplaceAdapter implements IMarketplaceAdapter {
  getInstalledTools(_organizationId: string): Array<{
    id: string; name: string; version: string; capabilities: string[];
  }> {
    return [];
  }
  checkToolAvailability(_toolId: string, _organizationId: string): boolean {
    return false;
  }
  getToolCapabilities(_toolId: string, _organizationId: string): string[] {
    return [];
  }
}

export class NullExecutionAdapter implements IExecutionAdapter {
  notifyExecutionStart(_execution: AgentExecution): void {}
  notifyExecutionComplete(_executionId: string, _success: boolean, _results: AgentResult[]): void {}
  notifyTaskDispatched(_taskId: string, _agentId: string, _executionId: string): void {}
  notifyTaskComplete(_taskId: string, _agentId: string, _result: AgentResult): void {}
  notifyCheckpointSaved(_checkpoint: AgentCheckpoint): void {}
  notifyAgentHealth(_health: AgentHealthStatus): void {}
}
