export interface GitHubWebhookEvent<TPayload = unknown> {
  readonly deliveryId: string;
  readonly eventName: string;
  readonly action?: string;
  readonly repository?: {
    readonly id: string;
    readonly fullName: string;
  };
  readonly sender?: {
    readonly id: string;
    readonly login: string;
  };
  readonly receivedAt: string;
  readonly payload: TPayload;
}

export interface GitHubWebhookHeaders {
  readonly 'x-github-event': string;
  readonly 'x-github-delivery': string;
  readonly 'x-hub-signature-256'?: string;
  readonly 'x-hub-signature-256-legacy'?: string;
}

export const SUPPORTED_WEBHOOK_EVENTS: readonly string[] = [
  'push',
  'issues',
  'issue_comment',
  'pull_request',
  'workflow_run',
  'workflow_dispatch',
  'repository',
  'installation',
  'installation_repositories',
];
