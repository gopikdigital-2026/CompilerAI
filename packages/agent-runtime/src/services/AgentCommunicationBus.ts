import type { AgentMessage, MessageKind } from '../models/AgentModels';
import { sanitizeMessagePayload } from '../errors/AgentErrors';

export type MessageHandler = (message: AgentMessage) => void;

export interface IAgentCommunicationBus {
  readonly id: string;
  publish(message: Omit<AgentMessage, 'id' | 'timestamp' | 'sanitized'>): AgentMessage;
  subscribe(handler: MessageHandler): () => void;
  subscribeToKind(kind: MessageKind, handler: MessageHandler): () => void;
  getMessages(executionId?: string): AgentMessage[];
  getMessagesByKind(kind: MessageKind, executionId?: string): AgentMessage[];
  clear(): void;
}

export class AgentCommunicationBus implements IAgentCommunicationBus {
  readonly id = 'agent-comm-bus-v1';
  private readonly messages: AgentMessage[] = [];
  private readonly globalHandlers = new Set<MessageHandler>();
  private readonly kindHandlers = new Map<MessageKind, Set<MessageHandler>>();

  constructor(
    private readonly idGenerator: () => string,
    private readonly clock: () => string,
  ) {}

  publish(message: Omit<AgentMessage, 'id' | 'timestamp' | 'sanitized'>): AgentMessage {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.idGenerator(),
      timestamp: this.clock(),
      sanitized: true,
      payload: sanitizeMessagePayload(message.payload),
    };
    this.messages.push(fullMessage);
    for (const handler of this.globalHandlers) {
      try { handler(fullMessage); } catch { /* handler errors must not break the bus */ }
    }
    const kindSet = this.kindHandlers.get(message.kind);
    if (kindSet) {
      for (const handler of kindSet) {
        try { handler(fullMessage); } catch { /* handler errors must not break the bus */ }
      }
    }
    return fullMessage;
  }

  subscribe(handler: MessageHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  subscribeToKind(kind: MessageKind, handler: MessageHandler): () => void {
    let set = this.kindHandlers.get(kind);
    if (!set) {
      set = new Set();
      this.kindHandlers.set(kind, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  getMessages(executionId?: string): AgentMessage[] {
    if (executionId) {
      return this.messages.filter((m) => m.executionId === executionId);
    }
    return [...this.messages];
  }

  getMessagesByKind(kind: MessageKind, executionId?: string): AgentMessage[] {
    return this.messages.filter(
      (m) => m.kind === kind && (!executionId || m.executionId === executionId),
    );
  }

  clear(): void {
    this.messages.length = 0;
    this.globalHandlers.clear();
    this.kindHandlers.clear();
  }
}
