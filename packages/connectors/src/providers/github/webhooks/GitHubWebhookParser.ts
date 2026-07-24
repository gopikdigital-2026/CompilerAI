import type { GitHubWebhookEvent, GitHubWebhookHeaders } from '../types/GitHubWebhookEvent';
import { SUPPORTED_WEBHOOK_EVENTS } from '../types/GitHubWebhookEvent';
import { GitHubWebhookEventMapper } from './GitHubWebhookEventMapper';

export class GitHubWebhookParser {
  static parse(
    headers: GitHubWebhookHeaders,
    rawPayload: string,
  ): GitHubWebhookEvent {
    const eventName = headers['x-github-event'];
    const deliveryId = headers['x-github-delivery'];

    if (!eventName || eventName.length === 0) {
      throw new Error('Missing x-github-event header');
    }

    if (!deliveryId || deliveryId.length === 0) {
      throw new Error('Missing x-github-delivery header');
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawPayload);
    } catch {
      throw new Error('Invalid JSON payload');
    }

    return GitHubWebhookEventMapper.mapEvent(eventName, deliveryId, payload);
  }

  static isSupported(eventName: string): boolean {
    return SUPPORTED_WEBHOOK_EVENTS.includes(eventName);
  }
}
