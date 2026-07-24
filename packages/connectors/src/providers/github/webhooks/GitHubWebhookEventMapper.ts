import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';
import { SUPPORTED_WEBHOOK_EVENTS } from '../types/GitHubWebhookEvent';

interface GitHubWebhookPayload {
  readonly action?: string;
  readonly repository?: {
    readonly id: number;
    readonly full_name: string;
  };
  readonly sender?: {
    readonly id: number;
    readonly login: string;
  };
}

export class GitHubWebhookEventMapper {
  static mapEvent(
    eventName: string,
    deliveryId: string,
    payload: unknown,
  ): GitHubWebhookEvent {
    if (!SUPPORTED_WEBHOOK_EVENTS.includes(eventName)) {
      throw new Error(`Unsupported webhook event: ${eventName}. Supported: ${SUPPORTED_WEBHOOK_EVENTS.join(', ')}`);
    }

    const typedPayload = payload as GitHubWebhookPayload;

    return {
      deliveryId,
      eventName,
      action: typedPayload?.action,
      repository: typedPayload?.repository ? {
        id: String(typedPayload.repository.id),
        fullName: typedPayload.repository.full_name,
      } : undefined,
      sender: typedPayload?.sender ? {
        id: String(typedPayload.sender.id),
        login: typedPayload.sender.login,
      } : undefined,
      receivedAt: new Date().toISOString(),
      payload,
    };
  }
}
