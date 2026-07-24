import type { TemplateDomain, WorkflowTemplate } from './models.js';

// ---------------------------------------------------------------------------
// Template data
// ---------------------------------------------------------------------------

const TEMPLATES: WorkflowTemplate[] = [
  // ── Document automation ────────────────────────────────────────────────
  {
    id: 'doc-001',
    name: 'Invoice Email → Drive + Calendar Review',
    domain: 'document',
    description: 'Saves Gmail invoice attachments to Drive and creates a calendar review task.',
    instruction:
      'When I receive an email with an invoice in Gmail, save it to Google Drive and create a review task in Calendar.',
    tags: ['gmail', 'drive', 'calendar', 'invoice', 'document'],
    requiredConnectors: ['google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'doc-002',
    name: 'Drive Upload → Slack Team Notification',
    domain: 'document',
    description: 'Sends a Slack notification when a new file is uploaded to Google Drive.',
    instruction:
      'When a file is uploaded to Google Drive, send a Slack notification to the team channel.',
    tags: ['drive', 'slack', 'upload', 'notification'],
    requiredConnectors: ['google-workspace', 'slack'],
    estimatedSteps: 2,
  },
  {
    id: 'doc-003',
    name: 'Weekly Email Summary → Drive',
    domain: 'document',
    description: 'Generates a weekly summary of received emails and saves it to Drive.',
    instruction:
      'Every week, generate a summary of all emails received and save it to Drive.',
    tags: ['gmail', 'drive', 'summary', 'schedule', 'weekly'],
    requiredConnectors: ['google-workspace'],
    estimatedSteps: 3,
  },

  // ── Incidents ──────────────────────────────────────────────────────────
  {
    id: 'inc-001',
    name: 'Critical GitHub Issue → Slack + Calendar',
    domain: 'incidents',
    description: 'Notifies Slack and adds a calendar event when a GitHub issue is labeled critical.',
    instruction:
      "When a GitHub issue is labeled 'critical', send a Slack notification and add it to the on-call calendar.",
    tags: ['github', 'slack', 'calendar', 'critical', 'on-call'],
    requiredConnectors: ['github', 'slack', 'google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'inc-002',
    name: 'New Jira Bug → Slack + GitHub Issue',
    domain: 'incidents',
    description: 'Syncs new Jira bugs to GitHub and notifies the team on Slack.',
    instruction:
      'When a new bug is created in Jira, notify the team in Slack and create a GitHub issue.',
    tags: ['jira', 'slack', 'github', 'bug', 'sync'],
    requiredConnectors: ['jira', 'slack', 'github'],
    estimatedSteps: 3,
  },
  {
    id: 'inc-003',
    name: 'Error Alert → Jira Ticket + Slack DevOps',
    domain: 'incidents',
    description: 'Creates a Jira ticket and notifies DevOps on Slack when an error alert fires.',
    instruction:
      'When an error alert is triggered, create a Jira ticket and notify DevOps on Slack.',
    tags: ['jira', 'slack', 'alert', 'devops', 'error'],
    requiredConnectors: ['jira', 'slack'],
    estimatedSteps: 3,
  },

  // ── Sales ──────────────────────────────────────────────────────────────
  {
    id: 'sales-001',
    name: 'New HubSpot Lead → Welcome Email + Calendar Task',
    domain: 'sales',
    description: 'Sends a welcome email and creates a follow-up calendar task for new HubSpot leads.',
    instruction:
      'When a new lead is created in HubSpot, send a welcome email and create a follow-up task in Calendar.',
    tags: ['hubspot', 'gmail', 'calendar', 'lead', 'sales'],
    requiredConnectors: ['hubspot', 'google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'sales-002',
    name: 'Closed Salesforce Deal → Slack Congrats + Notion Log',
    domain: 'sales',
    description: 'Celebrates closed deals with a Slack message and logs them in Notion.',
    instruction:
      'When a deal is closed in Salesforce, send a congratulations Slack message and log it in Notion.',
    tags: ['salesforce', 'slack', 'notion', 'deal', 'closed-won'],
    requiredConnectors: ['salesforce', 'slack', 'notion'],
    estimatedSteps: 3,
  },
  {
    id: 'sales-003',
    name: 'New HubSpot Contact → Calendar Follow-up Reminder',
    domain: 'sales',
    description: 'Creates a calendar reminder for every new HubSpot contact.',
    instruction:
      'When a contact is added to HubSpot, create a reminder in Calendar for follow-up.',
    tags: ['hubspot', 'calendar', 'contact', 'follow-up', 'reminder'],
    requiredConnectors: ['hubspot', 'google-workspace'],
    estimatedSteps: 2,
  },

  // ── HR ─────────────────────────────────────────────────────────────────
  {
    id: 'hr-001',
    name: 'New Employee Onboarding → Drive + Email + Calendar',
    domain: 'hr',
    description: 'Sets up Drive folders, sends a welcome email, and adds the new employee to the calendar.',
    instruction:
      'When a new employee is onboarded, create folders in Drive, send welcome email, and add to Calendar.',
    tags: ['drive', 'gmail', 'calendar', 'onboarding', 'hr'],
    requiredConnectors: ['google-workspace'],
    estimatedSteps: 4,
  },
  {
    id: 'hr-002',
    name: 'Leave Request → Slack Manager + Team Calendar',
    domain: 'hr',
    description: 'Notifies the manager via Slack and updates the team calendar for leave requests.',
    instruction:
      'When a leave request is submitted, notify the manager in Slack and update the team calendar.',
    tags: ['slack', 'calendar', 'leave', 'hr', 'manager'],
    requiredConnectors: ['slack', 'google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'hr-003',
    name: 'Job Application Email → Drive CV + Jira Screening',
    domain: 'hr',
    description: 'Saves the CV to Drive and creates a Jira screening task for every job application email.',
    instruction:
      'When a job application arrives by email, save CV to Drive and create a Jira screening task.',
    tags: ['gmail', 'drive', 'jira', 'recruitment', 'cv'],
    requiredConnectors: ['google-workspace', 'jira'],
    estimatedSteps: 3,
  },

  // ── Support ────────────────────────────────────────────────────────────
  {
    id: 'sup-001',
    name: 'Support Email → Jira Ticket + Slack Notification',
    domain: 'support',
    description: 'Creates a Jira ticket and notifies the support team in Slack for every support email.',
    instruction:
      'When a support email arrives, create a Jira ticket and notify the support team in Slack.',
    tags: ['gmail', 'jira', 'slack', 'support', 'ticket'],
    requiredConnectors: ['google-workspace', 'jira', 'slack'],
    estimatedSteps: 3,
  },
  {
    id: 'sup-002',
    name: 'Jira Ticket Resolved → Customer Satisfaction Survey',
    domain: 'support',
    description: 'Sends a satisfaction survey email when a Jira ticket is resolved.',
    instruction:
      'When a Jira ticket is resolved, send a satisfaction survey email to the customer.',
    tags: ['jira', 'gmail', 'survey', 'support', 'csat'],
    requiredConnectors: ['jira', 'google-workspace'],
    estimatedSteps: 2,
  },
  {
    id: 'sup-003',
    name: 'SLA Breach → Slack Escalation + Jira Priority Update',
    domain: 'support',
    description: 'Escalates to the manager via Slack and updates ticket priority when SLA is breached.',
    instruction:
      'When an issue exceeds SLA, escalate to manager via Slack and update the ticket priority.',
    tags: ['jira', 'slack', 'sla', 'escalation', 'support'],
    requiredConnectors: ['jira', 'slack'],
    estimatedSteps: 3,
  },

  // ── Finance ────────────────────────────────────────────────────────────
  {
    id: 'fin-001',
    name: 'Invoice Email → Drive + GitHub Issue (>5000€) + Calendar',
    domain: 'finance',
    description:
      'Saves invoice emails to Drive, creates a GitHub issue if the amount exceeds 5,000€, and adds a calendar review task.',
    instruction:
      'When I receive an email with an invoice in Gmail, save it in Google Drive, create an issue in GitHub if it exceeds 5,000€ and add a review task to Calendar.',
    tags: ['gmail', 'drive', 'github', 'calendar', 'invoice', 'finance', 'approval'],
    requiredConnectors: ['google-workspace', 'github'],
    estimatedSteps: 4,
  },
  {
    id: 'fin-002',
    name: 'Payment Received → CRM Update + Receipt Email',
    domain: 'finance',
    description: 'Updates the CRM and sends a receipt email when a payment is received.',
    instruction:
      'When a payment is received in Stripe, update the CRM and send a receipt email.',
    tags: ['stripe', 'hubspot', 'gmail', 'payment', 'receipt', 'finance'],
    requiredConnectors: ['hubspot', 'google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'fin-003',
    name: 'Invoice Due → Reminder Email + Calendar Follow-up',
    domain: 'finance',
    description: 'Sends a reminder email and creates a calendar follow-up event when an invoice is due.',
    instruction:
      'When an invoice is due, send a reminder email and create a calendar event for follow-up.',
    tags: ['gmail', 'calendar', 'invoice', 'reminder', 'finance'],
    requiredConnectors: ['google-workspace'],
    estimatedSteps: 3,
  },

  // ── DevOps ─────────────────────────────────────────────────────────────
  {
    id: 'dev-001',
    name: 'PR Merged → Slack Notification + Jira Status Update',
    domain: 'devops',
    description: 'Notifies the team on Slack and updates the Jira ticket when a PR is merged.',
    instruction:
      'When a pull request is merged, notify the team on Slack and update the Jira ticket status.',
    tags: ['github', 'slack', 'jira', 'pr', 'devops'],
    requiredConnectors: ['github', 'slack', 'jira'],
    estimatedSteps: 3,
  },
  {
    id: 'dev-002',
    name: 'GitHub Workflow Failure → Jira Incident + Slack DevOps',
    domain: 'devops',
    description: 'Creates a Jira incident and notifies the DevOps Slack channel when a GitHub workflow fails.',
    instruction:
      'When a GitHub workflow fails, create a Jira incident and notify the DevOps channel in Slack.',
    tags: ['github', 'jira', 'slack', 'ci', 'failure', 'devops'],
    requiredConnectors: ['github', 'jira', 'slack'],
    estimatedSteps: 3,
  },
  {
    id: 'dev-003',
    name: 'New GitHub Release → Release Notes Email + Notion Changelog',
    domain: 'devops',
    description: 'Sends release notes by email and updates the Notion changelog for every new GitHub release.',
    instruction:
      'When a new release is tagged in GitHub, send a release notes email and update the Notion changelog.',
    tags: ['github', 'gmail', 'notion', 'release', 'changelog', 'devops'],
    requiredConnectors: ['github', 'google-workspace', 'notion'],
    estimatedSteps: 3,
  },

  // ── Marketing ──────────────────────────────────────────────────────────
  {
    id: 'mkt-001',
    name: 'Notion Blog Published → Slack Share + Calendar Reminders',
    domain: 'marketing',
    description: 'Shares a published blog post on Slack and schedules social media reminders in Calendar.',
    instruction:
      'When a blog post is published in Notion, share it on Slack and schedule social media reminders in Calendar.',
    tags: ['notion', 'slack', 'calendar', 'blog', 'content', 'marketing'],
    requiredConnectors: ['notion', 'slack', 'google-workspace'],
    estimatedSteps: 3,
  },
  {
    id: 'mkt-002',
    name: 'Campaign Email 100+ Opens → Slack Marketing Alert',
    domain: 'marketing',
    description: 'Notifies the marketing team on Slack when a campaign email exceeds 100 opens.',
    instruction:
      'When a campaign email is opened more than 100 times, notify the marketing team in Slack.',
    tags: ['gmail', 'slack', 'campaign', 'email', 'marketing', 'analytics'],
    requiredConnectors: ['google-workspace', 'slack'],
    estimatedSteps: 2,
  },
  {
    id: 'mkt-003',
    name: 'New Form Contact → HubSpot + Welcome Email',
    domain: 'marketing',
    description: 'Adds form contacts to HubSpot and sends a welcome email automatically.',
    instruction:
      'When a new contact fills out a form, add them to HubSpot and send a welcome email.',
    tags: ['hubspot', 'gmail', 'form', 'lead', 'welcome', 'marketing'],
    requiredConnectors: ['hubspot', 'google-workspace'],
    estimatedSteps: 3,
  },
];

// ---------------------------------------------------------------------------
// TemplateLibrary
// ---------------------------------------------------------------------------

export class TemplateLibrary {
  getAll(): WorkflowTemplate[] {
    return [...TEMPLATES];
  }

  getByDomain(domain: TemplateDomain): WorkflowTemplate[] {
    return TEMPLATES.filter((t) => t.domain === domain);
  }

  getById(id: string): WorkflowTemplate | null {
    return TEMPLATES.find((t) => t.id === id) ?? null;
  }

  search(query: string): WorkflowTemplate[] {
    const lower = query.toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        t.name.toLowerCase().includes(lower) ||
        t.description.toLowerCase().includes(lower) ||
        t.instruction.toLowerCase().includes(lower) ||
        t.tags.some((tag) => tag.toLowerCase().includes(lower)) ||
        t.domain.toLowerCase().includes(lower),
    );
  }

  getByConnector(connectorId: string): WorkflowTemplate[] {
    return TEMPLATES.filter((t) =>
      t.requiredConnectors.some((c) => c.toLowerCase() === connectorId.toLowerCase()),
    );
  }

  getDomains(): TemplateDomain[] {
    return [...new Set(TEMPLATES.map((t) => t.domain))];
  }
}
