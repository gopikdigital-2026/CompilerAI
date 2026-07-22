// ─── HumanTaskManager ───────────────────────────────────────────────────────────

import type { IHumanTaskManager } from '../interfaces/RuntimeInterfaces';
import type { HumanTask } from '../models/CheckpointModels';
import type { InMemoryCheckpointStore } from '../repositories/InMemoryRepositories';

export class HumanTaskManager implements IHumanTaskManager {
  private readonly store: InMemoryCheckpointStore;
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(store: InMemoryCheckpointStore, idGenerator: () => string, clock: () => string) {
    this.store = store;
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  createTask(task: Omit<HumanTask, 'taskId' | 'status' | 'createdAt' | 'completedAt'>): HumanTask {
    const full: HumanTask = {
      ...task,
      taskId: this.idGenerator(),
      status: 'PENDING',
      createdAt: this.clock(),
      completedAt: null,
    };
    this.store.saveTask(full);
    return full;
  }

  completeTask(taskId: string, _result: Record<string, unknown>): HumanTask {
    const task = this.store.findTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found.`);
    const updated: HumanTask = { ...task, status: 'COMPLETED', completedAt: this.clock() };
    this.store.updateTask(updated);
    return updated;
  }

  getTask(taskId: string): HumanTask | null {
    return this.store.findTask(taskId);
  }

  getPendingTasks(organizationId: string): HumanTask[] {
    return this.store.findPendingTasks(organizationId);
  }
}
