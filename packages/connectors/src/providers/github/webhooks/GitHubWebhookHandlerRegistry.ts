import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';
import type { WebhookProcessResult } from './GitHubWebhookEnvelope';
import type { UUID } from '../../../types/index';

export interface GitHubWebhookHandler {
  readonly eventName: string;
  handle(event: GitHubWebhookEvent, organizationId: UUID): Promise<WebhookProcessResult>;
}

export class GitHubWebhookHandlerRegistry {
  private readonly handlers: Map<string, GitHubWebhookHandler> = new Map();

  register(handler: GitHubWebhookHandler): void {
    if (this.handlers.has(handler.eventName)) {
      throw new Error(`Duplicate webhook handler for event: ${handler.eventName}`);
    }
    this.handlers.set(handler.eventName, handler);
  }

  unregister(eventName: string): boolean {
    return this.handlers.delete(eventName);
  }

  getHandler(eventName: string): GitHubWebhookHandler | null {
    return this.handlers.get(eventName) ?? null;
  }

  hasHandler(eventName: string): boolean {
    return this.handlers.has(eventName);
  }

  getRegisteredEvents(): string[] {
    return [...this.handlers.keys()];
  }

  clear(): void {
    this.handlers.clear();
  }
}
