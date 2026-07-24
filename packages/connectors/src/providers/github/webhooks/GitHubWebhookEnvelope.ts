import type { UUID, ISOString } from '../../../types/index';
import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';

export interface GitHubWebhookEnvelope {
  readonly deliveryId: string;
  readonly eventName: string;
  readonly organizationId: UUID;
  readonly receivedAt: ISOString;
  readonly verified: boolean;
  readonly event: GitHubWebhookEvent;
}

export interface WebhookReceiveInput {
  readonly organizationId: UUID;
  readonly headers: Record<string, string>;
  readonly rawPayload: string;
  readonly maxSizeBytes?: number;
}

export interface WebhookReceiveResult {
  readonly accepted: boolean;
  readonly envelope: GitHubWebhookEnvelope | null;
  readonly reason?: string;
}

export interface WebhookProcessResult {
  readonly handled: boolean;
  readonly handlerName?: string;
  readonly error?: string;
}

export interface WebhookDeliveryRecord {
  readonly deliveryId: string;
  readonly organizationId: UUID;
  readonly eventName: string;
  readonly receivedAt: ISOString;
  readonly status: 'accepted' | 'rejected' | 'duplicate' | 'processed' | 'failed';
  readonly reason?: string;
  readonly handlerName?: string;
}
