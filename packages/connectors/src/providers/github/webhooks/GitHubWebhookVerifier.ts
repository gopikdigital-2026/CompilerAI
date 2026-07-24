import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CredentialResolver } from '../../../credentials/CredentialResolver';
import type { ConnectorId, UUID } from '../../../types/index';

const GITHUB_CONNECTOR_ID: ConnectorId = 'github';

export interface WebhookVerificationResult {
  readonly verified: boolean;
  readonly reason?: string;
}

export class GitHubWebhookVerifier {
  constructor(
    private readonly credentialResolver: CredentialResolver,
  ) {}

  async verify(
    payload: string | Buffer,
    signatureHeader: string | undefined,
    organizationId: UUID,
  ): Promise<WebhookVerificationResult> {
    if (!signatureHeader || signatureHeader.length === 0) {
      return { verified: false, reason: 'Missing x-hub-signature-256 header' };
    }

    const secret = await this.resolveWebhookSecret(organizationId);
    if (!secret) {
      return { verified: false, reason: 'No webhook secret configured for organization' };
    }

    const expectedSignature = this.computeSignature(payload, secret);
    const providedSignature = this.extractSignature(signatureHeader);

    if (!providedSignature) {
      return { verified: false, reason: 'Invalid signature header format' };
    }

    if (!this.safeCompare(expectedSignature, providedSignature)) {
      return { verified: false, reason: 'Signature mismatch' };
    }

    return { verified: true };
  }

  verifySync(
    payload: string | Buffer,
    signatureHeader: string | undefined,
    secret: string,
  ): WebhookVerificationResult {
    if (!signatureHeader || signatureHeader.length === 0) {
      return { verified: false, reason: 'Missing x-hub-signature-256 header' };
    }

    const expectedSignature = this.computeSignature(payload, secret);
    const providedSignature = this.extractSignature(signatureHeader);

    if (!providedSignature) {
      return { verified: false, reason: 'Invalid signature header format' };
    }

    if (!this.safeCompare(expectedSignature, providedSignature)) {
      return { verified: false, reason: 'Signature mismatch' };
    }

    return { verified: true };
  }

  private computeSignature(payload: string | Buffer, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  private extractSignature(header: string): string | null {
    if (!header.startsWith('sha256=')) return null;
    const sig = header.slice(7);
    if (sig.length === 0) return null;
    return `sha256=${sig}`;
  }

  private safeCompare(expected: string, provided: string): boolean {
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    try {
      return timingSafeEqual(expectedBuf, providedBuf);
    } catch {
      return false;
    }
  }

  private async resolveWebhookSecret(organizationId: UUID): Promise<string | null> {
    try {
      const resolved = await this.credentialResolver.resolve(
        GITHUB_CONNECTOR_ID, organizationId, null,
      );
      if (!resolved) return null;

      const secret = resolved.data['webhookSecret'];
      if (typeof secret === 'string' && secret.length > 0) return secret;

      return null;
    } catch {
      return null;
    }
  }
}
