import type { SimulationResult } from '../models/SimulationModels';
import type { MonitorEvent } from '../models/MonitorModels';
import type { ComponentDescriptor, ComponentLibraryCategory } from '../models/ComponentModels';

export interface IRuntimeAdapter {
  deploy(workflowId: string, version: number, snapshot: unknown): Promise<string>;
  undeploy(deploymentId: string): Promise<void>;
  execute(workflowId: string, version: number, input: Record<string, unknown>): Promise<SimulationResult>;
  isAvailable(): boolean;
}

export interface ITelemetryAdapter {
  recordEvent(eventType: string, payload: Record<string, unknown>): void;
  recordNodeExecution(nodeId: string, nodeType: string, durationMs: number, success: boolean): void;
  recordCost(workflowId: string, cost: number): void;
  flush(): void;
}

export interface IIdentityAdapter {
  checkPermission(userId: string, organizationId: string, permission: string): Promise<boolean>;
  getUserRoles(userId: string, organizationId: string): Promise<string[]>;
  assertSameOrganization(userOrgId: string, targetOrgId: string): Promise<void>;
}

export interface IMarketplaceAdapter {
  getAvailableTools(organizationId: string): ComponentDescriptor[];
  getToolCapabilities(toolId: string): string[];
  isToolAvailable(toolId: string, organizationId: string): boolean;
}

export interface IAgentRuntimeAdapter {
  getAvailableAgents(organizationId: string): ComponentDescriptor[];
  getAgentCapabilities(agentId: string): string[];
  estimateCost(agentId: string, inputSize: number): number;
  estimateConfidence(agentId: string, input: Record<string, unknown>): number;
}

export interface IMemoryAdapter {
  read(executionId: string, key: string): unknown | null;
  write(executionId: string, key: string, value: unknown): void;
  readAll(executionId: string): Record<string, unknown>;
}

export interface IToolIntelligenceAdapter {
  selectTools(capabilities: string[], organizationId: string): ComponentDescriptor[];
  validateToolCompatibility(toolId: string, nodeConfig: Record<string, unknown>): boolean;
}

export interface IMonitorAdapter {
  publish(event: MonitorEvent): void;
  subscribe(executionId: string, handler: (event: MonitorEvent) => void): () => void;
}

export interface IComponentSource {
  getComponents(category: ComponentLibraryCategory): ComponentDescriptor[];
  getComponent(id: string): ComponentDescriptor | null;
  checkAvailability(id: string): boolean;
}

export class NullRuntimeAdapter implements IRuntimeAdapter {
  async deploy(_wf: string, _ver: number, _snap: unknown): Promise<string> {
    return 'null-deployment';
  }
  async undeploy(_id: string): Promise<void> {}
  async execute(_wf: string, _ver: number, _input: Record<string, unknown>): Promise<SimulationResult> {
    return {
      status: 'completed',
      nodeResults: [],
      path: { nodeIds: [], edges: [] },
      decisions: [],
      toolsUsed: [],
      totalDurationMs: 0,
      estimatedCost: 0,
      averageConfidence: 1,
      error: null,
    };
  }
  isAvailable(): boolean {
    return false;
  }
}

export class NullTelemetryAdapter implements ITelemetryAdapter {
  recordEvent(_t: string, _p: Record<string, unknown>): void {}
  recordNodeExecution(_n: string, _t: string, _d: number, _s: boolean): void {}
  recordCost(_w: string, _c: number): void {}
  flush(): void {}
}

export class NullIdentityAdapter implements IIdentityAdapter {
  async checkPermission(_u: string, _o: string, _p: string): Promise<boolean> {
    return true;
  }
  async getUserRoles(_u: string, _o: string): Promise<string[]> {
    return ['OrganizationAdmin'];
  }
  async assertSameOrganization(_a: string, _b: string): Promise<void> {}
}

export class NullMarketplaceAdapter implements IMarketplaceAdapter {
  getAvailableTools(_o: string): ComponentDescriptor[] {
    return [];
  }
  getToolCapabilities(_t: string): string[] {
    return [];
  }
  isToolAvailable(_t: string, _o: string): boolean {
    return false;
  }
}

export class NullAgentRuntimeAdapter implements IAgentRuntimeAdapter {
  getAvailableAgents(_o: string): ComponentDescriptor[] {
    return [];
  }
  getAgentCapabilities(_a: string): string[] {
    return [];
  }
  estimateCost(_a: string, _i: number): number {
    return 0;
  }
  estimateConfidence(_a: string, _i: Record<string, unknown>): number {
    return 0.85;
  }
}

export class NullMemoryAdapter implements IMemoryAdapter {
  private readonly store = new Map<string, Map<string, unknown>>();
  read(execId: string, key: string): unknown | null {
    return this.store.get(execId)?.get(key) ?? null;
  }
  write(execId: string, key: string, value: unknown): void {
    let map = this.store.get(execId);
    if (!map) {
      map = new Map();
      this.store.set(execId, map);
    }
    map.set(key, value);
  }
  readAll(execId: string): Record<string, unknown> {
    const map = this.store.get(execId);
    if (!map) return {};
    return Object.fromEntries(map);
  }
}

export class NullToolIntelligenceAdapter implements IToolIntelligenceAdapter {
  selectTools(_c: string[], _o: string): ComponentDescriptor[] {
    return [];
  }
  validateToolCompatibility(_t: string, _n: Record<string, unknown>): boolean {
    return true;
  }
}

export class NullMonitorAdapter implements IMonitorAdapter {
  publish(_e: MonitorEvent): void {}
  subscribe(_e: string, _h: (event: MonitorEvent) => void): () => void {
    return () => {};
  }
}
