import type { UUID, Metadata } from '../../../types/index';
import type { ConnectorTelemetry } from '../../../observability/ConnectorTelemetry';
import type { GitHubWebhookVerifier } from './GitHubWebhookVerifier';
import type { GitHubWebhookParser } from './GitHubWebhookParser';
import type { GitHubWebhookDispatcher } from './GitHubWebhookDispatcher';
import type { IGitHubWebhookDeliveryStore } from './InMemoryGitHubWebhookDeliveryStore';
import type { GitHubWebhookHandlerRegistry } from './GitHubWebhookHandlerRegistry';
import type {
  WebhookReceiveInput,
  WebhookReceiveResult,
  GitHubWebhookEnvelope,
  WebhookDeliveryRecord,
} from './GitHubWebhookEnvelope';
import type { GitHubWebhookEvent } from '../types/GitHubWebhookEvent';
import { GITHUB_CONNECTOR_ID } from '../GitHubOperationsFactory';
import { sanitizeMetadata } from '../../../observability/sanitize';

const DEFAULT_MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;

export interface GitHubWebhookReceiverOptions {
  readonly verifier: GitHubWebhookVerifier;
  readonly parser: typeof GitHubWebhookParser;
  readonly dispatcher: GitHubWebhookDispatcher;
  readonly deliveryStore: IGitHubWebhookDeliveryStore;
  readonly telemetry: ConnectorTelemetry;
  readonly handlerRegistry: GitHubWebhookHandlerRegistry;
  readonly defaultMaxSizeBytes?: number;
}

export class GitHubWebhookReceiver {
  private readonly maxPayloadBytes: number;

  constructor(private readonly options: GitHubWebhookReceiverOptions) {
    this.maxPayloadBytes = options.defaultMaxSizeBytes ?? DEFAULT_MAX_PAYLOAD_BYTES;
  }

  async receive(input: WebhookReceiveInput): Promise<WebhookReceiveResult> {
    const maxSize = input.maxSizeBytes ?? this.maxPayloadBytes;
    const orgId = input.organizationId;

    // 1. Validate size
    const payloadBytes = Buffer.byteLength(input.rawPayload, 'utf8');
    if (payloadBytes > maxSize) {
      return this.reject(input, 'Payload exceeds maximum size', 'rejected');
    }

    // 2. Extract headers
    const eventName = input.headers['x-github-event'] ?? '';
    const deliveryId = input.headers['x-github-delivery'] ?? '';

    if (!eventName || !deliveryId) {
      return this.reject(input, 'Missing required headers (x-github-event or x-github-delivery)', 'rejected');
    }

    // 3. Validate delivery ID format
    if (deliveryId.length === 0) {
      return this.reject(input, 'Empty delivery ID', 'rejected');
    }

    // 4. Check for duplicate delivery
    const isDuplicate = await this.options.deliveryStore.hasBeenDelivered(deliveryId, orgId);
    if (isDuplicate) {
      this.emitEvent('connector.github.webhook.duplicate', orgId, {
        deliveryId,
        eventName,
      });
      await this.recordDelivery(deliveryId, orgId, eventName, 'duplicate', 'Duplicate delivery detected');
      return { accepted: false, envelope: null, reason: 'Duplicate delivery' };
    }

    // 5. Verify signature
    const verification = await this.options.verifier.verify(
      input.rawPayload,
      input.headers['x-hub-signature-256'],
      orgId,
    );
    if (!verification.verified) {
      return this.reject(input, verification.reason ?? 'Signature verification failed', 'rejected');
    }

    // 6. Parse event
    let event: GitHubWebhookEvent;
    try {
      event = this.options.parser.parse(
        {
          'x-github-event': eventName,
          'x-github-delivery': deliveryId,
          'x-hub-signature-256': input.headers['x-hub-signature-256'],
        },
        input.rawPayload,
      );
    } catch {
      return this.reject(input, 'Failed to parse webhook payload', 'rejected');
    }

    // 7. Create envelope
    const envelope: GitHubWebhookEnvelope = {
      deliveryId,
      eventName,
      organizationId: orgId,
      receivedAt: new Date().toISOString(),
      verified: true,
      event,
    };

    // 8. Emit received event
    this.emitEvent('connector.github.webhook.received', orgId, {
      deliveryId,
      eventName,
      action: event.action,
      repository: event.repository?.fullName,
    });

    // 9. Dispatch to handler
    const dispatchResult = await this.options.dispatcher.dispatch(event, orgId);
    if (!dispatchResult.dispatched) {
      await this.recordDelivery(deliveryId, orgId, eventName, 'accepted', undefined, undefined);
      return { accepted: true, envelope };
    }

    const handlerName = dispatchResult.handlerName ?? eventName;
    const processResult = dispatchResult.result;

    if (processResult?.error) {
      await this.recordDelivery(deliveryId, orgId, eventName, 'failed', processResult.error, handlerName);
      this.emitEvent('connector.github.webhook.processed', orgId, {
        deliveryId, eventName, handlerName, status: 'failed', error: processResult.error,
      });
    } else {
      await this.recordDelivery(deliveryId, orgId, eventName, 'processed', undefined, handlerName);
      this.emitEvent('connector.github.webhook.processed', orgId, {
        deliveryId, eventName, handlerName, status: 'processed',
      });
    }

    return { accepted: true, envelope };
  }

  getHandlerRegistry(): GitHubWebhookHandlerRegistry {
    return this.options.handlerRegistry;
  }

  private async reject(input: WebhookReceiveInput, reason: string, status: WebhookDeliveryRecord['status']): Promise<WebhookReceiveResult> {
    const deliveryId = input.headers['x-github-delivery'] ?? '';
    const eventName = input.headers['x-github-event'] ?? '';
    if (deliveryId) {
      await this.recordDelivery(deliveryId, input.organizationId, eventName, status, reason);
    }
    return { accepted: false, envelope: null, reason };
  }

  private async recordDelivery(
    deliveryId: string,
    organizationId: UUID,
    eventName: string,
    status: WebhookDeliveryRecord['status'],
    reason?: string,
    handlerName?: string,
  ): Promise<void> {
    const record: WebhookDeliveryRecord = {
      deliveryId,
      organizationId,
      eventName,
      receivedAt: new Date().toISOString(),
      status,
      reason,
      handlerName,
    };
    await this.options.deliveryStore.recordDelivery(record);
  }

  private emitEvent(type: string, organizationId: UUID, metadata: Record<string, unknown>): void {
    const sanitized = sanitizeMetadata(metadata);
    this.options.telemetry.emit({
      type: type as never,
      connectorId: GITHUB_CONNECTOR_ID,
      organizationId,
      operation: 'webhook',
      executionId: metadata['deliveryId'] as string,
      timestamp: new Date().toISOString(),
      metadata: sanitized as Metadata,
    });
  }
}
