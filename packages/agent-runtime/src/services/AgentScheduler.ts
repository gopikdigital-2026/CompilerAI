import type { Agent, AgentTask, SchedulerPolicy, AgentPriority } from '../models/AgentModels';
import { SchedulerError } from '../errors/AgentErrors';

export interface IScheduler {
  selectAgent(task: AgentTask, candidates: Agent[]): Agent | null;
  getPolicy(): SchedulerPolicy;
  setPolicy(policy: SchedulerPolicy): void;
}

const PRIORITY_WEIGHT: Record<AgentPriority, number> = {
  critical: 5,
  high: 4,
  normal: 3,
  low: 2,
  background: 1,
};

export class AgentScheduler implements IScheduler {
  private policy: SchedulerPolicy;
  private roundRobinIndex = 0;

  constructor(policy: SchedulerPolicy = 'capability_based') {
    this.policy = policy;
  }

  getPolicy(): SchedulerPolicy {
    return this.policy;
  }

  setPolicy(policy: SchedulerPolicy): void {
    this.policy = policy;
    this.roundRobinIndex = 0;
  }

  selectAgent(task: AgentTask, candidates: Agent[]): Agent | null {
    const eligible = candidates.filter(
      (a) =>
        a.status === 'idle' &&
        a.organizationId === (task as AgentTask & { organizationId?: string }).organizationId ||
        true,
    );
    if (eligible.length === 0) return null;

    switch (this.policy) {
      case 'priority':
        return this.selectByPriority(task, eligible);
      case 'round_robin':
        return this.selectRoundRobin(eligible);
      case 'least_loaded':
        return this.selectLeastLoaded(eligible);
      case 'capability_based':
        return this.selectByCapability(task, eligible);
      default:
        throw new SchedulerError(`Unknown scheduler policy: ${this.policy}`);
    }
  }

  private selectByPriority(_task: AgentTask, agents: Agent[]): Agent {
    const sorted = [...agents].sort((a, b) => {
      const diff = PRIORITY_WEIGHT[b.profile.priority] - PRIORITY_WEIGHT[a.profile.priority];
      if (diff !== 0) return diff;
      return a.load - b.load;
    });
    return sorted[0]!;
  }

  private selectRoundRobin(agents: Agent[]): Agent {
    const agent = agents[this.roundRobinIndex % agents.length]!;
    this.roundRobinIndex++;
    return agent;
  }

  private selectLeastLoaded(agents: Agent[]): Agent {
    const sorted = [...agents].sort((a, b) => a.load - b.load);
    return sorted[0]!;
  }

  private selectByCapability(task: AgentTask, agents: Agent[]): Agent {
    const scored = agents.map((agent) => {
      const matching = task.requiredCapabilities.filter((cap) =>
        agent.profile.capabilities.includes(cap),
      );
      const score = matching.length / Math.max(task.requiredCapabilities.length, 1);
      return { agent, score, matching };
    });
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.agent.load - b.agent.load;
    });
    if (scored[0]!.score === 0) {
      throw new SchedulerError(
        `No agent has the required capabilities for task ${task.id}: ${task.requiredCapabilities.join(', ')}`,
      );
    }
    return scored[0]!.agent;
  }
}
