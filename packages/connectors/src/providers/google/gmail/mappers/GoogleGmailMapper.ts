import type {
  GoogleGmailMessage,
  GoogleGmailMessageResponse,
  GoogleGmailMessagePart,
  GoogleGmailLabel,
  GoogleGmailLabelListResponse,
  GoogleGmailAttachment,
} from '../types/GoogleGmailTypes';

export class GoogleGmailMapper {
  static mapMessage(raw: GoogleGmailMessageResponse, format: 'metadata' | 'full' = 'metadata'): GoogleGmailMessage {
    const headers = raw.payload?.headers ?? [];
    const subject = this.findHeader(headers, 'Subject');
    const from = this.findHeader(headers, 'From');
    const to = this.parseAddressList(this.findHeader(headers, 'To'));
    const cc = this.parseAddressList(this.findHeader(headers, 'Cc'));
    const date = this.findHeader(headers, 'Date');

    let bodyText: string | null = null;
    let bodyHtml: string | null = null;
    const attachments: GoogleGmailAttachment[] = [];

    if (format === 'full') {
      const bodies = this.extractBodies(raw.payload);
      bodyText = bodies.text;
      bodyHtml = bodies.html;
      this.collectAttachments(raw.payload, attachments);
    }

    return {
      id: raw.id,
      threadId: raw.threadId,
      subject: subject ?? null,
      from: from ?? null,
      to,
      cc,
      date: date ?? null,
      snippet: raw.snippet ?? null,
      labels: raw.labelIds ? [...raw.labelIds] : [],
      bodyText,
      bodyHtml,
      attachments,
      internalDate: raw.internalDate ?? null,
    };
  }

  static mapLabel(raw: { readonly id: string; readonly name: string; readonly type?: string; readonly messageListVisibility?: string; readonly labelListVisibility?: string }): GoogleGmailLabel {
    return {
      id: raw.id,
      name: raw.name,
      type: (raw.type === 'system' ? 'system' : 'user') as 'system' | 'user',
      messageListVisibility: (raw.messageListVisibility === 'show' || raw.messageListVisibility === 'hide' ? raw.messageListVisibility : null) as 'show' | 'hide' | null,
      labelListVisibility: (raw.labelListVisibility === 'labelShow' || raw.labelListVisibility === 'labelShowIfUnread' || raw.labelListVisibility === 'labelHide'
        ? raw.labelListVisibility
        : null) as 'labelShow' | 'labelShowIfUnread' | 'labelHide' | null,
    };
  }

  static mapLabelList(raw: GoogleGmailLabelListResponse): GoogleGmailLabel[] {
    return raw.labels.map((l) => GoogleGmailMapper.mapLabel(l));
  }

  static buildRfc2822Message(params: {
    readonly to: readonly string[];
    readonly cc?: readonly string[];
    readonly bcc?: readonly string[];
    readonly subject: string;
    readonly bodyText?: string;
    readonly bodyHtml?: string;
    readonly replyToMessageId?: string;
  }): string {
    const lines: string[] = [];
    lines.push(`To: ${params.to.join(', ')}`);
    if (params.cc && params.cc.length > 0) {
      lines.push(`Cc: ${params.cc.join(', ')}`);
    }
    if (params.bcc && params.bcc.length > 0) {
      lines.push(`Bcc: ${params.bcc.join(', ')}`);
    }
    lines.push(`Subject: ${this.encodeHeaderParam(params.subject)}`);
    if (params.replyToMessageId) {
      lines.push(`In-Reply-To: ${params.replyToMessageId}`);
      lines.push(`References: ${params.replyToMessageId}`);
    }
    if (params.bodyHtml && params.bodyHtml.length > 0) {
      lines.push('Content-Type: text/html; charset=UTF-8');
    } else {
      lines.push('Content-Type: text/plain; charset=UTF-8');
    }
    lines.push('MIME-Version: 1.0');
    lines.push('');
    lines.push(params.bodyHtml ?? params.bodyText ?? '');
    return lines.join('\r\n');
  }

  static encodeBase64Url(input: string): string {
    return Buffer.from(input, 'utf8').toString('base64url');
  }

  static validateEmailAddress(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  static checkHeaderInjection(value: string): boolean {
    return value.includes('\r\n') || value.includes('\n');
  }

  private static findHeader(headers: readonly { readonly name: string; readonly value: string }[], name: string): string | undefined {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
  }

  private static parseAddressList(value: string | undefined): string[] {
    if (!value) return [];
    return value.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
  }

  private static extractBodies(payload: GoogleGmailMessagePart | undefined): { text: string | null; html: string | null } {
    if (!payload) return { text: null, html: null };

    let text: string | null = null;
    let html: string | null = null;

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      text = this.decodeBase64Url(payload.body.data);
    } else if (payload.mimeType === 'text/html' && payload.body?.data) {
      html = this.decodeBase64Url(payload.body.data);
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const sub = this.extractBodies(part);
        if (!text && sub.text) text = sub.text;
        if (!html && sub.html) html = sub.html;
      }
    }

    return { text, html };
  }

  private static collectAttachments(payload: GoogleGmailMessagePart | undefined, out: GoogleGmailAttachment[]): void {
    if (!payload) return;
    if (payload.body?.attachmentId && payload.filename && payload.filename.length > 0) {
      out.push({
        id: payload.body.attachmentId,
        filename: payload.filename,
        mimeType: payload.mimeType ?? 'application/octet-stream',
        size: payload.body.size ?? 0,
      });
    }
    if (payload.parts) {
      for (const part of payload.parts) {
        this.collectAttachments(part, out);
      }
    }
  }

  private static decodeBase64Url(input: string): string {
    try {
      return Buffer.from(input, 'base64url').toString('utf8');
    } catch {
      return '';
    }
  }

  private static encodeHeaderParam(value: string): string {
    if (this.checkHeaderInjection(value)) {
      throw new Error('Header injection detected in email parameter');
    }
    return value;
  }
}
