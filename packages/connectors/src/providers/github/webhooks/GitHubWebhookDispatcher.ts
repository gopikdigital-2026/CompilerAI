import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';
import type { UUID, Metadata } from '../../../types/index';
import type { GitHubWebhookHandlerRegistry } from './GitHubWebhookHandlerRegistry';
import type { WebhookProcessResult } from './GitHubWebhookEnvelope';
import { sanitizeMetadata } from '../../../observability/sanitize';

export interface WebhookDispatchResult {
  readonly dispatched: boolean;
  readonly handlerName?: string;
  readonly result?: WebhookProcessResult;
}

export class GitHubWebhookDispatcher {
  constructor(
    private readonly registry: GitHubWebhookHandlerRegistry,
  ) {}

  async dispatch(event: GitHubWebhookEvent, organizationId: UUID): Promise<WebhookDispatchResult> {
    const handler = this.registry.getHandler(event.eventName);

    if (!handler) {
      return { dispatched: false };
    }

    const result = await handler.handle(event, organizationId);
    return {
      dispatched: true,
      handlerName: handler.eventName,
      result,
    };
  }

  sanitizeEventMetadata(event: GitHubWebhookEvent): Metadata {
    const safePayload = sanitizeMetadata(event.payload as Record<string, unknown>);
    return Object.freeze({
      deliveryId: event.deliveryId,
      eventName: event.eventName,
      action: event.action,
      repository: event.repository?.fullName,
      sender: event.sender?.login,
      payload: safePayload,
    });
  }
}
