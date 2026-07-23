import type { Agent, AgentStatus } from '../models/AgentModels';
import { AgentNotFoundError } from '../errors/AgentErrors';

export interface IAgentLifecycleManager {
  transition(agent: Agent, newStatus: AgentStatus): Agent;
  canTransition(from: AgentStatus, to: AgentStatus): boolean;
  assignTask(agent: Agent, taskId: string): Agent;
  completeTask(agent: Agent, success: boolean): Agent;
  pause(agent: Agent): Agent;
  resume(agent: Agent): Agent;
  cancel(agent: Agent): Agent;
}

const VALID_TRANSITIONS: Map<AgentStatus, Set<AgentStatus>> = new Map<AgentStatus, Set<AgentStatus>>([
  ['idle', new Set<AgentStatus>(['assigned', 'cancelled'])],
  ['assigned', new Set<AgentStatus>(['running', 'cancelled', 'idle', 'failed', 'completed'])],
  ['running', new Set<AgentStatus>(['paused', 'completed', 'failed', 'cancelled', 'timed_out', 'recovering'])],
  ['paused', new Set<AgentStatus>(['running', 'cancelled', 'idle'])],
  ['recovering', new Set<AgentStatus>(['running', 'failed', 'cancelled'])],
  ['completed', new Set<AgentStatus>(['idle', 'completed', 'failed'])],
  ['failed', new Set<AgentStatus>(['idle', 'recovering', 'failed'])],
  ['timed_out', new Set<AgentStatus>(['idle', 'recovering', 'timed_out'])],
  ['cancelled', new Set<AgentStatus>(['idle', 'cancelled'])],
]);

export class AgentLifecycleManager implements IAgentLifecycleManager {
  constructor(
    private readonly clock: () => string,
  ) {}

  canTransition(from: AgentStatus, to: AgentStatus): boolean {
    const allowed = VALID_TRANSITIONS.get(from);
    return allowed?.has(to) ?? false;
  }

  transition(agent: Agent, newStatus: AgentStatus): Agent {
    if (!this.canTransition(agent.status, newStatus)) {
      throw new AgentNotFoundError(
        `Invalid agent state transition: ${agent.status} → ${newStatus} for agent ${agent.id}`,
      );
    }
    const updated: Agent = {
      ...agent,
      status: newStatus,
      lastActiveAt: this.clock(),
    };
    return updated;
  }

  assignTask(agent: Agent, taskId: string): Agent {
    const updated = this.transition(agent, 'assigned');
    return { ...updated, currentTaskId: taskId, load: agent.load + 1 };
  }

  completeTask(agent: Agent, success: boolean): Agent {
    const newStatus: AgentStatus = success ? 'completed' : 'failed';
    if (agent.status === newStatus) {
      return { ...agent, lastActiveAt: this.clock() };
    }
    const updated = this.transition(agent, newStatus);
    return {
      ...updated,
      currentTaskId: null,
      load: Math.max(0, agent.load - 1),
      totalExecutions: agent.totalExecutions + 1,
      failedExecutions: agent.failedExecutions + (success ? 0 : 1),
    };
  }

  pause(agent: Agent): Agent {
    return this.transition(agent, 'paused');
  }

  resume(agent: Agent): Agent {
    return this.transition(agent, 'running');
  }

  cancel(agent: Agent): Agent {
    if (!this.canTransition(agent.status, 'cancelled')) {
      return { ...agent, status: 'idle', currentTaskId: null, load: 0 };
    }
    return this.transition(agent, 'cancelled');
  }
}
