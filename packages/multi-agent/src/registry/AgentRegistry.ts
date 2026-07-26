import type { AgentDeclaration, AgentPriority, IAgentRegistry } from '../models.js';

export class AgentRegistry implements IAgentRegistry {
  private readonly agents = new Map<string, AgentDeclaration>();

  register(agent: AgentDeclaration): void {
    this.agents.set(agent.id, agent);
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get(agentId: string): AgentDeclaration | undefined {
    return this.agents.get(agentId);
  }

  list(): AgentDeclaration[] {
    return Array.from(this.agents.values());
  }

  findBestAgent(capabilities: string[], connectors: string[]): AgentDeclaration | undefined {
    const candidates = Array.from(this.agents.values()).filter((a) =>
      capabilities.every((c) => a.capabilities.includes(c)),
    );

    if (candidates.length === 0) return undefined;
    if (candidates.length === 1) return candidates[0];

    const priorityWeight: Record<AgentPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    return candidates.sort((a, b) => {
      const connA = connectors.filter((c) => a.connectors.includes(c)).length;
      const connB = connectors.filter((c) => b.connectors.includes(c)).length;
      if (connB !== connA) return connB - connA;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const pw = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (pw !== 0) return pw;
      return a.estimatedCostPerTask - b.estimatedCostPerTask;
    })[0];
  }
}
