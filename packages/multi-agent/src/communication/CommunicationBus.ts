import type { AgentMessage, ICommunicationBus } from '../models.js';

export class CommunicationBus implements ICommunicationBus {
  private readonly messages: AgentMessage[] = [];
  private readonly subscribers = new Map<string, (msg: AgentMessage) => void>();
  private counter = 0;

  publish(message: AgentMessage): void {
    this.messages.push(message);
    if (message.to === 'broadcast') {
      for (const [sub, handler] of this.subscribers) {
        if (sub !== message.from) {
          handler(message);
        }
      }
    } else {
      const handler = this.subscribers.get(message.to);
      if (handler) {
        handler(message);
      }
    }
  }

  subscribe(subscriber: string, handler: (msg: AgentMessage) => void): void {
    this.subscribers.set(subscriber, handler);
  }

  unsubscribe(subscriber: string): void {
    this.subscribers.delete(subscriber);
  }

  getMessages(filter?: Partial<AgentMessage>): AgentMessage[] {
    if (!filter) return [...this.messages];
    return this.messages.filter((m) => {
      if (filter.from !== undefined && m.from !== filter.from) return false;
      if (filter.to !== undefined && m.to !== filter.to) return false;
      if (filter.type !== undefined && m.type !== filter.type) return false;
      if (filter.subject !== undefined && m.subject !== filter.subject) return false;
      return true;
    });
  }

  nextId(): string {
    return `msg-${++this.counter}`;
  }

  clear(): void {
    this.messages.length = 0;
    this.subscribers.clear();
  }
}
