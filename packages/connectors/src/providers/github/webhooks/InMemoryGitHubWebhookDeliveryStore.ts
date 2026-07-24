import type { UUID } from '../../../types/index';
import type { WebhookDeliveryRecord } from './GitHubWebhookEnvelope';

export interface IGitHubWebhookDeliveryStore {
  hasBeenDelivered(deliveryId: string, organizationId: UUID): Promise<boolean>;
  recordDelivery(record: WebhookDeliveryRecord): Promise<void>;
  getDelivery(deliveryId: string, organizationId: UUID): Promise<WebhookDeliveryRecord | null>;
  count(): number;
  clear(): void;
}

export class InMemoryGitHubWebhookDeliveryStore implements IGitHubWebhookDeliveryStore {
  private readonly deliveries: Map<string, WebhookDeliveryRecord> = new Map();

  async hasBeenDelivered(deliveryId: string, organizationId: UUID): Promise<boolean> {
    return this.deliveries.has(this.key(deliveryId, organizationId));
  }

  async recordDelivery(record: WebhookDeliveryRecord): Promise<void> {
    this.deliveries.set(this.key(record.deliveryId, record.organizationId), record);
  }

  async getDelivery(deliveryId: string, organizationId: UUID): Promise<WebhookDeliveryRecord | null> {
    return this.deliveries.get(this.key(deliveryId, organizationId)) ?? null;
  }

  count(): number {
    return this.deliveries.size;
  }

  clear(): void {
    this.deliveries.clear();
  }

  private key(deliveryId: string, organizationId: UUID): string {
    return `${organizationId}:${deliveryId}`;
  }
}
