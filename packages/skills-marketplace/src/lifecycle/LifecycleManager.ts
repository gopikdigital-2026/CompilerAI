import type { LifecycleEvent, ILifecycleManager, LifecycleEventType } from '../models.js';

export class LifecycleManager implements ILifecycleManager {
  private readonly events: LifecycleEvent[] = [];

  recordEvent(event: LifecycleEvent): void {
    this.events.push(event);
  }

  getEvents(skillId?: string): LifecycleEvent[] {
    if (!skillId) return [...this.events];
    return this.events.filter((e) => e.skillId === skillId);
  }

  getEventsByType(type: LifecycleEventType): LifecycleEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  clear(): void {
    this.events.length = 0;
  }
}
