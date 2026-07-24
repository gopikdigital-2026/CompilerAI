import type { Metadata } from '../../../../types/index';

export interface GoogleGmailMessage {
  readonly id: string;
  readonly threadId: string;
  readonly subject: string | null;
  readonly from: string | null;
  readonly to: readonly string[];
  readonly cc: readonly string[];
  readonly date: string | null;
  readonly snippet: string | null;
  readonly labels: readonly string[];
  readonly bodyText: string | null;
  readonly bodyHtml: string | null;
  readonly attachments: readonly GoogleGmailAttachment[];
  readonly internalDate: string | null;
  readonly metadata?: Metadata;
}

export interface GoogleGmailAttachment {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly size: number;
}

export interface GoogleGmailLabel {
  readonly id: string;
  readonly name: string;
  readonly type: 'system' | 'user';
  readonly messageListVisibility: 'show' | 'hide' | null;
  readonly labelListVisibility: 'labelShow' | 'labelShowIfUnread' | 'labelHide' | null;
}

export interface GoogleGmailMessageResponse {
  readonly id: string;
  readonly threadId: string;
  readonly labelIds?: readonly string[];
  readonly snippet?: string;
  readonly payload?: GoogleGmailMessagePart;
  readonly sizeEstimate?: number;
  readonly internalDate?: string;
}

export interface GoogleGmailMessagePart {
  readonly partId?: string;
  readonly mimeType?: string;
  readonly filename?: string;
  readonly headers?: readonly { readonly name: string; readonly value: string }[];
  readonly body?: { readonly attachmentId?: string; readonly size?: number; readonly data?: string };
  readonly parts?: readonly GoogleGmailMessagePart[];
}

export interface GoogleGmailMessageListResponse {
  readonly messages: readonly { readonly id: string; readonly threadId: string }[];
  readonly nextPageToken?: string;
  readonly resultSizeEstimate?: number;
}

export interface GoogleGmailLabelListResponse {
  readonly labels: readonly {
    readonly id: string;
    readonly name: string;
    readonly type?: string;
    readonly messageListVisibility?: string;
    readonly labelListVisibility?: string;
  }[];
}
