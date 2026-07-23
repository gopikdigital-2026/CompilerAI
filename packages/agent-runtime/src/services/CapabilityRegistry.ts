import type { AgentCapability } from '../models/AgentModels';

export interface ICapabilityRegistry {
  register(capability: AgentCapability): void;
  get(name: string): AgentCapability | null;
  list(): AgentCapability[];
  has(name: string): boolean;
  findMatching(required: string[]): AgentCapability[];
  clear(): void;
}

export class CapabilityRegistry implements ICapabilityRegistry {
  private readonly capabilities = new Map<string, AgentCapability>();

  register(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  get(name: string): AgentCapability | null {
    return this.capabilities.get(name) ?? null;
  }

  list(): AgentCapability[] {
    return Array.from(this.capabilities.values());
  }

  has(name: string): boolean {
    return this.capabilities.has(name);
  }

  findMatching(required: string[]): AgentCapability[] {
    return required
      .map((r) => this.capabilities.get(r))
      .filter((c): c is AgentCapability => c !== null);
  }

  clear(): void {
    this.capabilities.clear();
  }
}
