import type { Agent, AgentProfile } from '../models/AgentModels';
import { AgentNotFoundError, AgentIsolationError } from '../errors/AgentErrors';

export interface IAgentRegistry {
  register(profile: AgentProfile, organizationId: string): Agent;
  get(agentId: string): Agent | null;
  getByOrganization(organizationId: string): Agent[];
  update(agent: Agent): void;
  remove(agentId: string): boolean;
  list(): Agent[];
  clear(): void;
}

export class AgentRegistry implements IAgentRegistry {
  private readonly agents = new Map<string, Agent>();

  constructor(
    private readonly idGenerator: () => string,
    private readonly clock: () => string,
  ) {}

  register(profile: AgentProfile, organizationId: string): Agent {
    const now = this.clock();
    const agent: Agent = {
      id: this.idGenerator(),
      profile,
      status: 'idle',
      organizationId,
      currentTaskId: null,
      createdAt: now,
      lastActiveAt: now,
      load: 0,
      totalExecutions: 0,
      failedExecutions: 0,
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  get(agentId: string): Agent | null {
    return this.agents.get(agentId) ?? null;
  }

  getByOrganization(organizationId: string): Agent[] {
    return Array.from(this.agents.values()).filter(
      (a) => a.organizationId === organizationId,
    );
  }

  update(agent: Agent): void {
    if (!this.agents.has(agent.id)) {
      throw new AgentNotFoundError(`Cannot update — agent not found: ${agent.id}`);
    }
    this.agents.set(agent.id, agent);
  }

  remove(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  clear(): void {
    this.agents.clear();
  }

  assertSameOrganization(agentId: string, organizationId: string): void {
    const agent = this.get(agentId);
    if (!agent) throw new AgentNotFoundError(`Agent not found: ${agentId}`);
    if (agent.organizationId !== organizationId) {
      throw new AgentIsolationError(
        `Agent ${agentId} belongs to organization ${agent.organizationId}, not ${organizationId}`,
      );
    }
  }
}
