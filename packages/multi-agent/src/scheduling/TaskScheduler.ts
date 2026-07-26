import type { AgentPriority, PlannedTask } from '../models.js';

export interface ScheduledSlot {
  taskId: string;
  agentId: string;
  priority: AgentPriority;
  scheduledAt: string;
}

const PRIORITY_ORDER: Record<AgentPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class TaskScheduler {

  schedule(tasks: PlannedTask[], maxConcurrency: number): ScheduledSlot[][] {
    const sorted = [...tasks].sort((a, b) => {
      const pw = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (pw !== 0) return pw;
      return a.estimatedDurationMs - b.estimatedDurationMs;
    });

    const completed = new Set<string>();
    const waves: ScheduledSlot[][] = [];

    while (completed.size < tasks.length) {
      const ready = sorted.filter(
        (t) => !completed.has(t.id) && t.dependencies.every((d) => completed.has(d.taskId)),
      );

      if (ready.length === 0) break;

      const wave = ready.slice(0, Math.max(1, maxConcurrency));
      const slot: ScheduledSlot[] = wave.map((task) => ({
        taskId: task.id,
        agentId: task.agentId,
        priority: task.priority,
        scheduledAt: new Date().toISOString(),
      }));

      waves.push(slot);

      for (const t of wave) {
        completed.add(t.id);
      }
    }

    return waves;
  }
}
